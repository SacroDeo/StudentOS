import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

import { useState, useCallback, useRef, useEffect } from "react";
import { generateAnswers, getTokenUsage, resetTokenUsage } from "../apiClient";

// ─── KEPT: batch sizing + chunking (used for splitting PDF/bulk locally) ──────

function getBatchSize(marks) {
  if (marks === "3M") return 5;
  if (marks === "4M") return 4;
  return 2;
}

function getNotesBatchSize(marks) {
  if (marks === "3M") return 8;
  if (marks === "4M") return 5;
  return 3;
}

function getPdfBatchSize(marks, comparison = false) {
  if (comparison) return 1;
  if (marks === "3M") return 8;
  if (marks === "4M") return 5;
  return 5;
}
function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
function chunkText(text, wordLimit) {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += wordLimit)
    chunks.push(words.slice(i, i + wordLimit).join(" "));
  return chunks;
}

// ─── PROMPT BUILDERS ──────────────────────────────────────────────────────────

const SIMPLE_ENGLISH_RULE = `Use VERY simple English. Short sentences. After every technical term add a plain explanation in brackets. Do NOT use difficult words.`;
const JSON_OUTPUT_RULE = `IMPORTANT: Return ONLY valid JSON. No extra text. No markdown. JSON must be complete and properly closed.`;

function getStructure(m) {
  if (m === "3") return `1 line introduction. 3 to 4 SHORT points. No conclusion.`;
  if (m === "4") return `1-2 line introduction. 6 to 7 well-explained points each with an example. No conclusion.`;
  return `2 line introduction. 8 to 9 detailed points each with explanation and example. 1 line conclusion.`;
}

const COMPLETENESS_RULE = `Cover ALL layers, steps, types, or components. Do not stop early.`;
const MNEMONIC_RULE = `Create a memory aid: ACRONYM, SENTENCE, or STORY that maps to key points. Label it clearly.`;
const FLOW_RULE = `Use transition words (First, Next, Because of this, Finally). Each point must link to the previous one. Explain WHY, not just WHAT.`;
const TABLE_RULE = `If the question asks to compare/differentiate, fill "table" as a 2D array with header row and minimum 5 data rows. Otherwise set "table" to null.`;

function isComparison(q) {
  return /difference|compare|between|distinguish|vs|versus|contrast/i.test(q);
}

function singlePrompt(question, marks, simpleEnglish) {
  const m          = marks.replace("M", "");
  const simpleLine = simpleEnglish ? `\nSIMPLE ENGLISH: ${SIMPLE_ENGLISH_RULE}` : "";
  const flowLine   = m === "5" ? `\n${FLOW_RULE}` : "";
  return `You are a university exam answer writer.
TASK: Write a ${m}-mark exam answer for ONE question only.
Question: ${question}
RULES: Highlight KEYWORDS in CAPS. Each point must be a single string.
Points required: 3M→4-5, 4M→6-7, 5M→8-9.
STRUCTURE: ${getStructure(m)}${simpleLine}${flowLine}
${TABLE_RULE}
${JSON_OUTPUT_RULE}
Respond ONLY with this exact JSON (no markdown, no backticks):
{"question":"${question.replace(/"/g, "'")}","introduction":"","table":null,"points":["point 1","point 2","point 3","point 4","point 5","point 6","point 7","point 8","point 9"],"conclusion":""}`;
}

function bulkPrompt(questions, marks, simpleEnglish) {
  const m          = marks.replace("M", "");
  const simpleLine = simpleEnglish ? `\nSIMPLE ENGLISH: ${SIMPLE_ENGLISH_RULE}` : "";
  const flowLine   = m === "5" ? `\n${FLOW_RULE}` : "";
  return `You are a university exam answer generator.
TASK: Answer ALL ${questions.length} questions at ${m}-mark depth.
Questions:
${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}
RULES: Highlight KEYWORDS in CAPS. Each point must be a single string.
Points required: 3M→4-5, 4M→6-7, 5M→8-9.
STRUCTURE: ${getStructure(m)}${simpleLine}${flowLine}
${TABLE_RULE}
${JSON_OUTPUT_RULE}
Respond ONLY with a valid JSON array — EXACTLY ${questions.length} objects in order:
[{"question":"","introduction":"","table":null,"points":[],"conclusion":"","mnemonic":"","quick_answer":""}]`;
}

function notesPrompt(notes, count, marks, simpleEnglish) {
  const m          = marks.replace("M", "");
  const simpleLine = simpleEnglish ? `\nSIMPLE ENGLISH: ${SIMPLE_ENGLISH_RULE}` : "";
  const flowLine   = m === "5" ? `\n${FLOW_RULE}` : "";
  return `You are a university exam paper setter and answer writer.
TASK: Generate ${count} exam questions from the notes below, then write answers at ${m}-mark depth.
Notes: ${notes.slice(0, 7000)}
RULES: Cover all major topics. Highlight KEYWORDS in CAPS. Each point must be a single string.
Points required: 3M→4-5, 4M→6-7, 5M→8-9.
STRUCTURE: ${getStructure(m)}${simpleLine}${flowLine}
${TABLE_RULE}
${JSON_OUTPUT_RULE}
Respond ONLY with a valid JSON array — EXACTLY ${count} objects:
[{"question":"","introduction":"","table":null,"points":[],"conclusion":"","mnemonic":"","quick_answer":""}]`;
}

function pdfChunkPrompt(chunkText, count, marks, simpleEnglish) {
  const m          = marks.replace("M", "");
  const simpleLine = simpleEnglish ? `\nSIMPLE ENGLISH: ${SIMPLE_ENGLISH_RULE}` : "";
  return `You are a university exam paper setter and answer writer.
TASK: Generate EXACTLY ${count} exam question${count > 1 ? "s" : ""} from the content below, then write answers at ${m}-mark depth.
Content: ${chunkText}
RULES: Highlight KEYWORDS in CAPS. Each point must be a single string.
Points required: 3M→4-5, 4M→6-7, 5M→8-9.
STRUCTURE: ${getStructure(m)}${simpleLine}
${JSON_OUTPUT_RULE}
Respond ONLY with a valid JSON array — EXACTLY ${count} object${count > 1 ? "s" : ""}:
[{"question":"","introduction":"","table":null,"points":[],"conclusion":"","mnemonic":"","quick_answer":""}]`;
}

// ─── PDF EXTRACTOR ────────────────────────────────────────────────────────────
async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let full = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    full += content.items.map(item => item.str).join(" ") + "\n";
  }
  return { text: full.trim(), pages: pdf.numPages };
}

// ─── PPT EXTRACTOR ────────────────────────────────────────────────────────────
import JSZip from "jszip";

async function extractPptText(file) {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  let text = "";

  const slideFiles = Object.keys(zip.files).filter(f =>
    f.startsWith("ppt/slides/slide")
  );

  for (const fileName of slideFiles) {
    const content = await zip.files[fileName].async("string");

    const matches = content.match(/<a:t>(.*?)<\/a:t>/g);
    if (matches) {
      const slideText = matches
        .map(t => t.replace(/<\/?a:t>/g, ""))
        .join(" ");
      text += slideText + "\n";
    }
  }

  return { text: text.trim(), slides: slideFiles.length };
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
function parseQuestions(text) {
  return text.split("\n").map(l => l.replace(/^\d+[\.\)\-]\s*/, "").trim()).filter(l => l.length > 5);
}

function pointsToParagraph(item) {
  const parts = [];
  if (item.introduction) parts.push(item.introduction);
  if (item.points?.length) parts.push(item.points.join(" "));
  if (item.conclusion) parts.push(item.conclusion);
  return parts.join(" ");
}

function Highlighted({ text }) {
  if (!text || typeof text !== "string") return null;
  const parts = text.split(/(\b[A-Z][A-Z0-9\/\-]{1,}\b)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^[A-Z][A-Z0-9\/\-]{1,}$/.test(part)
          ? <span key={i} style={{ color: "#e0e0e8", fontWeight: 600 }}>{part}</span>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

// ─── SESSION SYSTEM ───────────────────────────────────────────────────────────
const LS_KEY = "examify_sessions_v1";
const MAX_SESSIONS_PER_MODE = 10;

function _genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function _sessionTitle(mode, inputMeta) {
  if (mode === "single" && inputMeta.question) {
    return inputMeta.question.slice(0, 60) + (inputMeta.question.length > 60 ? "…" : "");
  }
  if (mode === "bulk") {
  return `${inputMeta.questionCount || "Bulk"} (${inputMeta.marks})`;
  }
  if (mode === "notes" && inputMeta.subMode === "text") {
    return `Notes · ${inputMeta.questionCount}Q · ${inputMeta.marks}`;
  }
  if (mode === "notes" && inputMeta.subMode === "pdf") {
    return `PDF: ${inputMeta.pdfName || "file"} · ${inputMeta.questionCount}Q`;
  }
  return new Date().toLocaleTimeString();
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { single: [], bulk: [], notes: [] };
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || Array.isArray(parsed)) return { single: [], bulk: [], notes: [] };
    return {
      single: Array.isArray(parsed.single) ? parsed.single : [],
      bulk:   Array.isArray(parsed.bulk)   ? parsed.bulk   : [],
      notes:  Array.isArray(parsed.notes)  ? parsed.notes  : [],
    };
  } catch {
    return { single: [], bulk: [], notes: [] };
  }
}

function saveToLocalStorage(sessions) {
  try {
    const MAX_RESULTS_PER_SESSION = 50;
    const trimmed = {};
    for (const key in sessions) {
      trimmed[key] = (sessions[key] || [])
        .map(s => ({
          ...s,
          results: (s.results || []).slice(0, MAX_RESULTS_PER_SESSION)
        }))
        .slice(-MAX_SESSIONS_PER_MODE);
    }
    localStorage.setItem(LS_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn("[sessions] localStorage write failed:", e.message);
  }
}

// ─── WORD EXPORT ──────────────────────────────────────────────────────────────
async function exportSessionToWord(session) {
  const {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Packer,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
} = await import("docx");
  const { saveAs } = await import("file-saver");

  const children = [];

  // Document title
  children.push(
    new Paragraph({
      text: session.title,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 300 },
    })
  );

  (session.results || []).forEach((item, idx) => {
    if (!item || typeof item !== "object") return;

    // Q number + question text
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Q${idx + 1}: `, bold: true, size: 28, color: "C6F135" }),
          new TextRun({ text: item.question || "", bold: true, size: 28 }),
        ],
        spacing: { before: 320, after: 120 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "FFFFFF" },
        },
      })
    );

    // Introduction
    if (item.introduction) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "Introduction", bold: true, size: 22, })],
          spacing: { before: 160, after: 60 },
        }),
        new Paragraph({
          children: [new TextRun({ text: item.introduction, size: 22 })],
          spacing: { after: 120 },
        })
      );
    }

    // Points
    if (Array.isArray(item.points) && item.points.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "Points", bold: true, size: 22})],
          spacing: { before: 120, after: 80 },
        })
      );
      item.points.forEach((pt, i) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${i + 1}.  `, bold: true, size: 22, color: "C6F135" }),
              new TextRun({ text: pt || "", size: 22, }),
            ],
            spacing: { before: 60, after: 60 },
            indent: { left: 360 },
          })
        );
      });
    }

    // Comparison table (best-effort)
    if (Array.isArray(item.table) && item.table.length > 1) {
      try {

  const tableRows = item.table.map((row, rowIdx) =>
    new TableRow({
      children: row.map(cell =>
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: String(cell),
                  bold: rowIdx === 0,
                  size: 20,
                }),
              ],
            }),
          ],
          shading:
            rowIdx === 0
              ? { type: ShadingType.CLEAR, fill: "EDEDED" }
              : undefined,
        })
      ),
    })
  );

  children.push(
    new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    })
  );
} catch (e) {
  console.warn("Table render failed", e);
}
    }

    // Conclusion
    if (item.conclusion) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "Conclusion", bold: true, size: 22})],
          spacing: { before: 120, after: 60 },
        }),
        new Paragraph({
          children: [new TextRun({ text: item.conclusion, size: 22, italics: true })],
          spacing: { after: 80 },
        })
      );
    }

    // Spacer between questions
    children.push(new Paragraph({ text: "", spacing: { after: 200 } }));
  });

  const doc = new Document({
    sections: [{ properties: {}, children }],
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22, color: "000000" },
        },
      },
    },
  });

  const blob = await Packer.toBlob(doc);
  const safeName = (session.title && session.title !== "Generating...")
  ? session.title
  : "Examify_Export";
  saveAs(blob, `${safeName}.docx`);
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Outfit:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#050507;--surf:#0f0f16;--surf2:#13131c;--surf3:#1a1a26;
  --blue:#c6f135;--blue-dim:rgba(198,241,53,0.08);--blue-ring:rgba(198,241,53,0.2);
  --green:#c6f135;--green-dim:rgba(198,241,53,0.08);--green-dark:#a8cc20;--green-ring:rgba(198,241,53,0.2);
  --purple:#ff3c3c;--purple-dim:rgba(255,60,60,0.08);--purple-ring:rgba(255,60,60,0.2);
  --tx:#ffffff;--tx2:#6b6b7a;--tx3:#3a3a48;
  --red:#ff3c3c;--red-dim:rgba(255,60,60,0.08);
  --bdr:rgba(255,255,255,0.06);--bdr2:rgba(255,255,255,0.03);
  --font:'Outfit',system-ui,sans-serif;--panel:340px;
}
html,body,#root{height:100%;background:var(--bg);color:var(--tx);font-family:var(--font);-webkit-font-smoothing:antialiased;}
*{-webkit-tap-highlight-color:transparent;}
::-webkit-scrollbar{width:4px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:99px;}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
@keyframes pulse{0%,80%,100%{opacity:.2;transform:scale(.7);}40%{opacity:1;transform:scale(1);}}
@keyframes shimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}
.fade-up{animation:fadeUp .25s ease both;}
.shim{background:linear-gradient(90deg,var(--surf) 25%,var(--surf2) 50%,var(--surf) 75%);background-size:200% 100%;animation:shimmer 1.6s infinite;border-radius:6px;}
textarea,input[type="number"]{font-family:var(--font);color:var(--tx);background:var(--surf2);border:1px solid var(--bdr);border-radius:10px;font-size:14px;line-height:1.65;transition:border-color .15s,box-shadow .15s;}
textarea{width:100%;padding:12px 14px;resize:vertical;}
textarea:focus,input[type="number"]:focus{outline:none;border-color:var(--blue);box-shadow:0 0 0 3px var(--blue-dim);}
textarea::placeholder,input::placeholder{color:var(--tx3);}
.seg{display:flex;background:var(--surf2);border:1px solid var(--bdr);border-radius:6px;padding:3px;gap:2px;}
.seg-btn{flex:1;background:transparent;border:none;color:var(--tx2);border-radius:4px;padding:7px 6px;font-size:12.5px;font-weight:500;font-family:var(--font);cursor:pointer;transition:all .15s;white-space:nowrap;}
.seg-btn:hover{color:var(--tx);}
.seg-btn.on{background:var(--blue-dim);color:var(--blue);font-weight:700;}
.sub-seg{display:flex;gap:6px;}
.sub-btn{flex:1;background:var(--surf2);border:1px solid var(--bdr);color:var(--tx2);border-radius:6px;padding:8px 10px;font-size:13px;font-weight:500;font-family:var(--font);cursor:pointer;transition:all .15s;}
.sub-btn:hover{color:var(--tx);}
.sub-btn.on{background:var(--blue-dim);border-color:var(--blue-ring);color:var(--blue);font-weight:700;}
.mpill{background:var(--surf2);border:1px solid var(--bdr);color:var(--tx2);border-radius:99px;padding:7px 20px;font-size:13px;font-weight:500;font-family:var(--font);cursor:pointer;transition:all .15s;}
.mpill:hover{color:var(--tx);border-color:rgba(255,255,255,0.14);}
.mpill.on{background:var(--blue-dim);border-color:var(--blue-ring);color:var(--blue);font-weight:700;}
.cpill{background:var(--surf2);border:1px solid var(--bdr);color:var(--tx2);border-radius:99px;padding:6px 16px;font-size:12.5px;font-weight:500;font-family:var(--font);cursor:pointer;transition:all .15s;flex:1;}
.cpill:hover{color:var(--tx);}
.cpill.on{background:var(--blue-dim);border-color:var(--blue-ring);color:var(--blue);font-weight:700;}
.vtog{display:inline-flex;background:var(--surf2);border:1px solid var(--bdr);border-radius:6px;padding:3px;gap:2px;}
.vbtn{background:transparent;border:none;color:var(--tx2);border-radius:4px;padding:6px 14px;font-size:12.5px;font-weight:500;font-family:var(--font);cursor:pointer;transition:all .15s;}
.vbtn:hover{color:var(--tx);}
.vbtn.on{background:var(--blue-dim);color:var(--blue);font-weight:700;}
.copy-btn{background:transparent;border:1px solid var(--bdr);color:var(--tx2);border-radius:8px;padding:5px 13px;font-size:12px;font-family:var(--font);cursor:pointer;transition:all .15s;white-space:nowrap;}
.copy-btn:hover{color:var(--tx);border-color:rgba(255,255,255,0.14);}
.copy-btn.ok{background:var(--green-dim);color:var(--green);border-color:var(--green-ring);}
.chip{display:inline-flex;align-items:center;gap:5px;background:var(--surf2);border:1px solid var(--bdr);color:var(--tx2);border-radius:99px;padding:5px 14px;font-size:12px;font-family:var(--font);cursor:pointer;transition:all .15s;}
.chip:hover{color:var(--tx);border-color:rgba(255,255,255,0.14);}
.chip.mn.open{background:var(--purple-dim);color:var(--purple);border-color:var(--purple-ring);}
.chip.qa.open{background:var(--green-dim);color:var(--green);border-color:var(--green-ring);}
.se-tog{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:10px;cursor:pointer;user-select:none;border:1px solid var(--bdr);background:var(--surf2);transition:all .2s;}
.se-tog.on{border-color:var(--green-ring);background:var(--green-dim);}
.se-track{width:32px;height:18px;border-radius:99px;position:relative;flex-shrink:0;transition:background .2s;}
.se-thumb{position:absolute;top:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.35);}
.btn-gen{width:100%;background:var(--blue);border:none;color:#050507;border-radius:4px;padding:14px;font-size:14px;font-weight:700;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;transition:background .15s,box-shadow .15s;}
.btn-gen:hover:not(:disabled){background:#b8e020;box-shadow:0 8px 28px rgba(198,241,53,.25);}
.btn-gen:disabled{background:var(--surf3);color:var(--tx3);cursor:not-allowed;}
.btn-stop{width:100%;background:var(--red-dim);border:1px solid rgba(248,113,113,0.2);color:var(--red);border-radius:10px;padding:14px;font-size:15px;font-weight:600;font-family:var(--font);cursor:pointer;transition:all .15s;}
.btn-ghost{flex:1;background:transparent;border:1px solid var(--bdr);color:var(--tx2);border-radius:8px;padding:9px;font-size:13px;font-family:var(--font);cursor:pointer;transition:all .15s;}
.btn-ghost:hover{color:var(--tx);border-color:rgba(255,255,255,0.14);}
.dropzone{border:1.5px dashed var(--bdr);border-radius:10px;padding:24px 16px;text-align:center;cursor:pointer;transition:all .2s;background:var(--surf2);}
.dropzone:hover,.dropzone.drag{border-color:var(--blue);background:var(--blue-dim);}
.lbl{font-size:11px;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:var(--tx3);margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;}
.app{display:flex;height:100vh;overflow:hidden;}
.left{width:var(--panel);flex-shrink:0;background:var(--surf);border-right:1px solid var(--bdr);display:flex;flex-direction:column;overflow:hidden;z-index:200;transition:transform .25s ease;}
.left-hd{padding:18px 20px 16px;border-bottom:1px solid var(--bdr);flex-shrink:0;display:flex;align-items:center;justify-content:space-between;}
.left-body{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:20px;}
.overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:150;}
.right{flex:1;display:flex;flex-direction:column;overflow:hidden;background:var(--bg);min-width:0;}
.topbar{padding:12px 28px;border-bottom:1px solid var(--bdr);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;min-height:52px;gap:10px;background:rgba(5,5,7,0.9);backdrop-filter:blur(12px);}
.answers{flex:1;overflow-y:auto;padding:0 28px;}
.acard{padding:28px 0;border-bottom:1px solid var(--bdr2);}
.acard:last-child{border-bottom:none;}
.q-row{display:flex;gap:12px;margin-bottom:14px;align-items:flex-start;}
.q-badge{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:rgba(255,255,255,0.35);flex-shrink:0;margin-top:1px;}
.q-text{font-size:15px;font-weight:600;color:var(--tx);line-height:1.5;flex:1;min-width:0;text-align:left;}
.abody{padding-left:40px;}
.intro{font-size:15px;color:#e6e6e6;line-height:1.8;margin-bottom:14px;text-align:left;font-weight:400;}
.pt-row{display:flex;gap:12px;align-items:flex-start;padding:11px 0;border-bottom:1px solid var(--bdr2);}
.pt-row:last-child{border-bottom:none;}
.pt-num{width:22px;height:22px;border-radius:4px;background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.28);font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:3px;}
.pt-txt{flex:1;font-size:15px;line-height:1.82;color:#ffffff;text-align:left;min-width:0;}
.concl{font-size:14px;color:#cccccc;line-height:1.75;margin-top:14px;padding-top:12px;border-top:1px solid var(--bdr2);text-align:left;font-style:italic;}
.para{font-size:15px;line-height:1.9;color:#ffffff;text-align:left;}
.extra{margin-top:12px;padding:14px 16px;border-radius:6px;font-size:13.5px;line-height:1.75;text-align:left;}
.extra-mn{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);color:#a0a0b0;}
.extra-qa{background:rgba(198,241,53,0.04);border:1px solid rgba(198,241,53,0.12);color:#a8b880;}
.se-badge{display:inline-flex;align-items:center;gap:4px;background:var(--green-dim);border:1px solid var(--green-ring);color:#86EFAC;border-radius:99px;padding:2px 9px;font-size:10px;font-weight:600;margin-left:8px;vertical-align:middle;}
.prog-wrap{padding:8px 28px;border-bottom:1px solid var(--bdr);flex-shrink:0;}
.prog-track{height:3px;background:var(--surf2);border-radius:99px;overflow:hidden;margin-top:5px;}
.prog-fill{height:100%;background:var(--blue);border-radius:99px;transition:width .4s ease;}
.err-bar{padding:10px 28px;background:var(--red-dim);border-bottom:1px solid rgba(248,113,113,0.12);flex-shrink:0;font-size:13px;color:var(--red);}
.tok-pill{display:flex;align-items:center;gap:6px;background:var(--surf2);border:1px solid var(--bdr);border-radius:99px;padding:4px 12px;flex-shrink:0;}
.shim-card{padding:28px 0;border-bottom:1px solid var(--bdr2);}
.mob-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:var(--surf);border-top:1px solid var(--bdr);z-index:100;padding:4px 0;padding-bottom:env(safe-area-inset-bottom,4px);}
.mob-nav-inner{display:flex;}
.mob-tab{flex:1;background:transparent;border:none;color:var(--tx2);padding:8px 4px;font-size:10px;font-family:var(--font);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;transition:color .15s;}
.mob-tab.act{color:var(--blue);}
.mob-tab-ico{font-size:18px;line-height:1;}
.mob-open{display:none;background:none;border:1px solid var(--bdr);color:var(--tx2);border-radius:8px;padding:6px 12px;font-size:13px;font-family:var(--font);cursor:pointer;align-items:center;gap:6px;flex-shrink:0;}
.mob-close{display:none;background:none;border:1px solid var(--bdr);color:var(--tx2);border-radius:8px;padding:4px 10px;font-size:12px;cursor:pointer;}
.mob-ctrls{display:none;gap:8px;margin-bottom:10px;align-items:center;flex-wrap:wrap;}
.desk-ctrls{display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap;}
.sess-bar{padding:8px 28px;border-bottom:1px solid var(--bdr);flex-shrink:0;display:flex;align-items:center;gap:10px;background:var(--surf);overflow-x:auto;}
.sess-select{background:var(--surf2);border:1px solid var(--bdr);color:var(--tx2);border-radius:6px;padding:5px 10px;font-size:12px;font-family:var(--font);cursor:pointer;min-width:0;flex:1;max-width:340px;}
.sess-select:focus{outline:none;border-color:var(--blue);}
.sess-clear{background:transparent;border:1px solid var(--bdr);color:var(--tx3);border-radius:6px;padding:5px 10px;font-size:11px;font-family:var(--font);cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all .15s;}
.sess-clear:hover{color:var(--red);border-color:rgba(255,60,60,0.3);}
.sess-count{font-size:11px;color:var(--tx3);white-space:nowrap;flex-shrink:0;}
@media(max-width:768px){
  :root{--panel:min(88vw,340px);}
  .left{position:fixed;left:0;top:0;bottom:0;transform:translateX(-100%);box-shadow:8px 0 32px rgba(0,0,0,.5);}
  .left.open{transform:translateX(0);}
  .overlay{display:block;}
  .overlay.hidden{display:none;}
  .right{padding-bottom:60px;}
  .mob-nav{display:block;}
  .mob-open{display:flex!important;}
  .mob-close{display:block!important;}
  .topbar{padding:10px 16px;}
  .answers{padding:0 16px;}
  .abody{padding-left:0!important;}
  .desk-vtog{display:none!important;}
  .desk-ctrls{display:none!important;}
  .mob-ctrls{display:flex!important;}
  .tok-pill .tok-detail{display:none;}
  .sess-bar{padding:8px 16px;}
}
`;

// ─── ATOMS ────────────────────────────────────────────────────────────────────
function Lbl({ children, right }) {
  return (
    <div className="lbl">
      <span>{children}</span>
      {right}
    </div>
  );
}

function ViewToggle({ val, onChange, className = "" }) {
  return (
    <div className={`vtog ${className}`}>
      <button className={`vbtn${val === "points" ? " on" : ""}`} onClick={() => onChange("points")}>≡ Points</button>
      <button className={`vbtn${val === "para" ? " on" : ""}`} onClick={() => onChange("para")}>¶ Para</button>
    </div>
  );
}

function SimpleEnglishToggle({ val, onChange }) {
  return (
    <div className={`se-tog${val ? " on" : ""}`} onClick={() => onChange(!val)}>
      <div className="se-track" style={{ background: val ? "#22C55E" : "rgba(255,255,255,0.1)" }}>
        <div className="se-thumb" style={{ left: val ? 15 : 2 }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: val ? "#86EFAC" : "var(--tx2)" }}>
          Simple English
          {val && <span style={{ marginLeft: 5, fontSize: 10, background: "rgba(34,197,94,0.2)", color: "#86EFAC", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>ON</span>}
        </div>
        <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 2 }}>Easy explanations · Terms intact</div>
      </div>
    </div>
  );
}

// ─── PDF UPLOADER ─────────────────────────────────────────────────────────────
function PdfUploader({ onExtracted }) {
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ref = useRef();

  const handle = async (file) => {
    if (
  !file ||
  ![
    "application/pdf",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ].includes(file.type)
) {
  setErr("Only PDF or PPT files supported.");
  return;
}

if (file.size > 20 * 1024 * 1024) {
  setErr("Max 20MB.");
  return;
}
    setErr(""); setBusy(true);
    try {
      let extracted;

if (file.type === "application/pdf") {
  extracted = await extractPdfText(file);
} else {
  extracted = await extractPptText(file);
}

const { text } = extracted;
      if (!text || text.length < 100) throw new Error("Could not extract text. Use a valid PDF or PPT file.");
      onExtracted({
  text,
  pages: extracted.pages || extracted.slides || 1,
  name: file.name,
  size: file.size
});
    } catch (e) { setErr(e.message || "Failed to read PDF."); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <Lbl>Upload PDF/PPT</Lbl>
      <div
        className={`dropzone${drag ? " drag" : ""}`}
        onClick={() => ref.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
      >
        <input ref={ref} type="file" accept=".pdf,.ppt,.pptx" style={{ display: "none" }} onChange={e => handle(e.target.files[0])} />
        {busy ? (
          <>
            <div style={{ fontSize: 22, marginBottom: 8 }}>⏳</div>
            <div style={{ color: "var(--blue)", fontSize: 13 }}>Extracting text…</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
            <div style={{ color: "var(--tx2)", fontSize: 13, marginBottom: 3 }}>Drop PDF or PPT</div>
            <div style={{ color: "var(--tx3)", fontSize: 11 }}>Max 20MB · Text-based pdf only</div>
          </>
        )}
      </div>
      {err && <div style={{ marginTop: 6, color: "var(--red)", fontSize: 12 }}>⚠ {err}</div>}
    </div>
  );
}

// ─── ANSWER CARD ──────────────────────────────────────────────────────────────
function AnswerCard({ item, index, globalView }) {
  const [view, setView] = useState(globalView);
  const [copied, setCopied] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    setView(globalView);
  }, [globalView]);

  if (!item || typeof item !== "object") return null;

  const copy = () => {
    const pts = Array.isArray(item.points) ? item.points.map((p, i) => `${i + 1}. ${p}`).join("\n") : "";
    navigator.clipboard.writeText(
      [
        `Q${index + 1}: ${item.question}`,
        `\nIntro:\n${item.introduction}`,
        `\nPoints:\n${pts}`,
        item.conclusion ? `\nConclusion:\n${item.conclusion}` : "",
      ].filter(Boolean).join("\n")
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  return (
    <div className="fade-up acard">
      <div className="q-row">
        <div className="q-badge">Q{index + 1}</div>
        <div className="q-text">{item.question}</div>
      </div>
      <div className="mob-ctrls">
        <button className={`copy-btn${copied ? " ok" : ""}`} onClick={copy}>{copied ? "✓ Copied" : "Copy"}</button>
      </div>
      <div className="abody">
        <div className="desk-ctrls">
          <button className={`copy-btn${copied ? " ok" : ""}`} onClick={copy}>{copied ? "✓ Copied" : "Copy"}</button>
        </div>
        {view === "points" && (
          <div>
            {item.introduction && <p className="intro"><Highlighted text={item.introduction} /></p>}
            {item.table && (
              <table style={{ marginTop: 10, borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>{item.table[0].map((h, i) => <th key={i} style={{ border: "1px solid #444", padding: "6px" }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {item.table.slice(1).map((row, i) => (
                    <tr key={i}>{row.map((cell, j) => <td key={j} style={{ border: "1px solid #444", padding: "6px" }}>{cell}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            )}
            <div>
              {(item.points || []).map((pt, i) => (
                <div key={i} className="pt-row">
                  <div className="pt-num">{i + 1}</div>
                  <div className="pt-txt"><Highlighted text={pt} /></div>
                </div>
              ))}
            </div>
            {item.conclusion && <p className="concl"><Highlighted text={item.conclusion} /></p>}
          </div>
        )}
        {view === "para" && (
          <p className="para"><Highlighted text={pointsToParagraph(item)} /></p>
        )}
      </div>
    </div>
  );
}

function ShimmerCard() {
  return (
    <div className="shim-card">
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div className="shim" style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0 }} />
        <div className="shim" style={{ height: 15, flex: 1, maxWidth: "60%", marginTop: 4 }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 40 }}>
        {[88, 74, 82, 66, 78].map((w, i) => <div key={i} className="shim" style={{ height: 11, width: `${w}%` }} />)}
      </div>
    </div>
  );
}

// ─── SESSION BAR ──────────────────────────────────────────────────────────────
function SessionBar({ mode, sessions, currentSessionId, onSwitch, onClearAll }) {
  const modeSessions = sessions[mode] || [];
  if (modeSessions.length === 0) return null;

  return (
    <div className="sess-bar">
      <span className="sess-count">
        {modeSessions.length} session{modeSessions.length !== 1 ? "s" : ""}
      </span>
      <select
        className="sess-select"
        value={currentSessionId || ""}
        onChange={e => onSwitch(e.target.value)}
      >
        {[...modeSessions].reverse().map(s => (
          <option key={s.id} value={s.id}>
            {new Date(s.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {s.title}
          </option>
        ))}
      </select>
      <button className="sess-clear" onClick={onClearAll} title="Clear all sessions for this mode">
        🗑 Clear All
      </button>
    </div>
  );
}

// ─── WORD EXPORT MODAL ────────────────────────────────────────────────────────
function WordExportModal({ mode, sessions, currentResults, onClose }) {
  const [exporting, setExporting] = useState(null);
  const [done, setDone]           = useState(null);
  let modeSessions = (sessions[mode] || []).filter(s => s.results && s.results.length > 0);

// fallback: if nothing in sessions, use current results
if (modeSessions.length === 0 && currentResults?.length > 0) {
  modeSessions = [{
    id: "current",
    title: "Current Session",
    timestamp: Date.now(),
    results: currentResults
  }];
}

  const handleExport = async (session) => {
    setExporting(session.id);
    try {
      await exportSessionToWord(session);
      setDone(session.id);
      setTimeout(() => setDone(null), 2000);
    } catch (e) {
      console.error("[export]", e);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#13131c", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14, padding: 24, width: "100%", maxWidth: 480,
          maxHeight: "80vh", display: "flex", flexDirection: "column", gap: 16,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--tx)" }}>
            Download Word
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "none", color: "var(--tx2)",
              fontSize: 18, cursor: "pointer", lineHeight: 1, padding: "2px 6px",
            }}
          >✕</button>
        </div>

        {/* Session list */}
        {modeSessions.length === 0 ? (
          <div style={{ color: "var(--tx3)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
            No sessions with results found for this mode.
          </div>
        ) : (
          <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {[...modeSessions].reverse().map(s => {
              const isExporting = exporting === s.id;
              const isDone      = done === s.id;
              return (
                <div
                  key={s.id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", borderRadius: 8,
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                    gap: 12,
                  }}
                >
                  {/* Session info */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.title}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--tx3)" }}>
                      {new Date(s.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {" · "}{s.results?.length || 0} answer{s.results?.length !== 1 ? "s" : ""}
                    </div>
                  </div>

                  {/* Download button */}
                  <button
                    className={`copy-btn${isDone ? " ok" : ""}`}
                    disabled={isExporting}
                    onClick={() => handleExport(s)}
                    style={{ flexShrink: 0, minWidth: 90 }}
                  >
                    {isExporting ? "Exporting…" : isDone ? "✓ Saved" : "⬇ Download"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ fontSize: 11, color: "var(--tx3)", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 12 }}>
          Files are saved locally. Large sessions (100+ answers) may take a few seconds.
        </div>
      </div>
    </div>
  );
}

// ─── LEFT PANEL ───────────────────────────────────────────────────────────────
function LeftPanelBody({
  mode, setMode, reset,
  simpleEnglish, setSimpleEnglish,
  singleQ, setSingleQ, singleMarks, setSingleMarks,
  bulkText, setBulkText, bulkMarks, setBulkMarks, detectedCount,
  notesText, setNotesText, notesMarks, setNotesMarks, noteCount, setNoteCount,
  notesInputMode, setNotesInputMode,
  pdfData, setPdfData, pdfMarks, setPdfMarks, pdfCountInput, setPdfCountInput, parsedPdfCount,
  loading, results, run, stop, canRun, genLabel, copyAll,
  globalView, setGlobalView, onClose,
  onWordExport,
}) {
  return (
    <div className="left-body">
      <SimpleEnglishToggle val={simpleEnglish} onChange={setSimpleEnglish} />

      <div>
        <Lbl>Mode</Lbl>
        <div className="seg">
          {[["single", "Single"], ["bulk", "Bulk"], ["notes", "Notes/PDF"]].map(([v, l]) => (
            <button key={v} className={`seg-btn${mode === v ? " on" : ""}`} onClick={() => { setMode(v); reset(); }}>{l}</button>
          ))}
        </div>
      </div>

      {results.length > 0 && (
        <div>
          <Lbl>Answer Format</Lbl>
          <ViewToggle val={globalView} onChange={setGlobalView} />
        </div>
      )}

      {mode === "single" && (
        <>
          <div>
            <Lbl>Question</Lbl>
            <textarea value={singleQ} onChange={e => setSingleQ(e.target.value)}
              placeholder="e.g. Explain the OSI model with its 7 layers…" rows={5} />
          </div>
          <div>
            <Lbl>Marks</Lbl>
            <div style={{ display: "flex", gap: 8 }}>
              {["3M", "4M", "5M"].map(m => (
                <button key={m} className={`mpill${singleMarks === m ? " on" : ""}`} onClick={() => setSingleMarks(m)}>{m}</button>
              ))}
            </div>
          </div>
        </>
      )}

      {mode === "bulk" && (
        <>
          <div>
            <Lbl right={detectedCount > 0 && (
              <span style={{ fontSize: 11, color: "var(--blue)", background: "var(--blue-dim)", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                {detectedCount} detected
              </span>
            )}>Questions — one per line</Lbl>
            <textarea value={bulkText} onChange={e => setBulkText(e.target.value)}
              placeholder={"1. What is TCP/IP?\n2. Explain OSI model\n3. What is subnetting?"} rows={7} />
            {detectedCount > 0 && (
              <div style={{ marginTop: 10, display: "flex", gap: 20, padding: "10px 14px", background: "var(--surf3)", borderRadius: 8 }}>
                {[[detectedCount, "questions"], [Math.ceil(detectedCount / getBatchSize(bulkMarks)), "batches"], [`~${Math.ceil(detectedCount / getBatchSize(bulkMarks)) * 8}s`, "est."]].map(([v, l]) => (
                  <div key={l}>
                    <div style={{ color: "var(--blue)", fontSize: 14, fontWeight: 700 }}>{v}</div>
                    <div style={{ color: "var(--tx3)", fontSize: 11, marginTop: 1 }}>{l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <Lbl>Marks</Lbl>
            <div style={{ display: "flex", gap: 8 }}>
              {["3M", "4M", "5M"].map(m => (
                <button key={m} className={`mpill${bulkMarks === m ? " on" : ""}`} onClick={() => setBulkMarks(m)}>{m}</button>
              ))}
            </div>
          </div>
        </>
      )}

      {mode === "notes" && (
        <>
          <div>
            <Lbl>Input Type</Lbl>
            <div className="sub-seg">
              <button className={`sub-btn${notesInputMode === "text" ? " on" : ""}`} onClick={() => setNotesInputMode("text")}>📝 Notes</button>
              <button className={`sub-btn${notesInputMode === "pdf" ? " on" : ""}`} onClick={() => setNotesInputMode("pdf")}>📄 PDF</button>
            </div>
          </div>

          {notesInputMode === "text" && (
            <>
              <div>
                <Lbl>Notes / Study Material</Lbl>
                <textarea value={notesText} onChange={e => setNotesText(e.target.value)}
                  placeholder="Paste your notes here…" rows={7} />
              </div>
              <div>
                <Lbl>Questions to Generate</Lbl>
                <input type="number" value={noteCount} onChange={e => setNoteCount(e.target.value)}
                  min={1} max={100} style={{ width: "100%", padding: "10px 14px" }} />
              </div>
              <div>
                <Lbl>Marks</Lbl>
                <div style={{ display: "flex", gap: 8 }}>
                  {["3M", "4M", "5M"].map(m => (
                    <button key={m} className={`mpill${notesMarks === m ? " on" : ""}`} onClick={() => setNotesMarks(m)}>{m}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {notesInputMode === "pdf" && (
            <>
              <PdfUploader onExtracted={setPdfData} />
              {pdfData && (
                <div style={{ padding: "10px 14px", background: "var(--surf3)", borderRadius: 8, fontSize: 12 }}>
                  <div style={{ color: "var(--blue)", fontWeight: 600, marginBottom: 2 }}>✓ {pdfData.name}</div>
                  <div style={{ color: "var(--tx3)" }}>{pdfData.pages} pages · {Math.round(pdfData.size / 1024)}KB</div>
                </div>
              )}
              <div>
                <Lbl>Questions to Generate</Lbl>
                <input type="number" value={pdfCountInput} onChange={e => setPdfCountInput(e.target.value)}
                  min={1} max={100} style={{ width: "100%", padding: "10px 14px" }} />
              </div>
              <div>
                <Lbl>Marks</Lbl>
                <div style={{ display: "flex", gap: 8 }}>
                  {["3M", "4M", "5M"].map(m => (
                    <button key={m} className={`mpill${pdfMarks === m ? " on" : ""}`} onClick={() => setPdfMarks(m)}>{m}</button>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {loading
        ? <button className="btn-stop" onClick={stop}>⏹ Stop</button>
        : <button className="btn-gen" disabled={!canRun()} onClick={run}>{genLabel()}</button>
      }

      {results.length > 0 && !loading && (
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-ghost" onClick={reset}>Clear</button>
          <button className="btn-ghost" onClick={copyAll}>Copy All</button>
          <button className="btn-ghost" onClick={onWordExport}>⬇ Word</button>
        </div>
      )}

      <div style={{ borderTop: "1px solid var(--bdr)", paddingTop: 18, marginTop: 2 }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--tx3)", marginBottom: 12 }}>How to use</div>
        {[
          ["⚡", "Single", "One question → instant answer"],
          ["📋", "Bulk", "Many questions at once"],
          ["📝", "Notes", "Notes → AI generates Q&A"],
          ["📄", "PDF", "Upload PDF → Q&A extracted"],
          ["¶", "Para", "Toggle essay-style view"],
          ["📝", "Quick Answer", "Plain 2-line summary"],
        ].map(([icon, title, desc]) => (
          <div key={title} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 9 }}>
            <span style={{ fontSize: 12, width: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--tx2)" }}>{title} </span>
              <span style={{ fontSize: 11.5, color: "var(--tx3)" }}>{desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function Examify() {
  const [mode, setMode] = useState("single");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState({ done: 0, total: 0, questions: 0 });
  const [simpleEnglish, setSimpleEnglish] = useState(false);
  const [globalView, setGlobalView] = useState("points");
  const [panelOpen, setPanelOpen] = useState(false);
  const [tokens, setTokens] = useState({ prompt: 0, completion: 0 });
  const [queueInfo, setQueueInfo] = useState(null);
  const [wordExportOpen, setWordExportOpen] = useState(false);

  const handleWordExport = () => {
    if (results.length > 0) {
      updateCurrentSession(results);
    }
    setWordExportOpen(true);
  };

  const abortRef = useRef(false);
  const bottomRef = useRef();

  const [singleQ, setSingleQ] = useState("");
  const [singleMarks, setSingleMarks] = useState("5M");
  const [bulkText, setBulkText] = useState("");
  const [bulkMarks, setBulkMarks] = useState("5M");
  const [notesText, setNotesText] = useState("");
  const [notesMarks, setNotesMarks] = useState("5M");
  const [noteCount, setNoteCount] = useState("30");
  const [notesInputMode, setNotesInputMode] = useState("text");
  const [pdfData, setPdfData] = useState(null);
  const [pdfMarks, setPdfMarks] = useState("5M");
  const [pdfCountInput, setPdfCountInput] = useState("30");

  const [sessions, setSessions] = useState(() => loadFromLocalStorage());
  const [currentSessionId, setCurrentSessionId] = useState({ single: null, bulk: null, notes: null });

  function updateCurrentSession(results) {
    setSessions(prev => {
      const updated = { ...prev };
      const modeSessions = updated[mode] || [];
      const currentId = currentSessionId[mode];
      if (!currentId) return prev;
      const idx = modeSessions.findIndex(s => s.id === currentId);
      if (idx !== -1) {
        modeSessions[idx] = { ...modeSessions[idx], results };
      }
      saveToLocalStorage(updated);
      return updated;
    });
  }

  const detectedCount = bulkText ? parseQuestions(bulkText).length : 0;

  const parsedPdfCount = useCallback(() => {
    const n = parseInt(pdfCountInput);
    return isNaN(n) ? 1 : Math.min(100, Math.max(1, n));
  }, [pdfCountInput]);

  const switchSession = useCallback((sessionId) => {
    const modeSessions = sessions[mode] || [];
    const target = modeSessions.find(s => s.id === sessionId);
    if (!target) return;
    setCurrentSessionId(prev => ({ ...prev, [mode]: sessionId }));
    setResults(target.results);
    setError("");
    setProgress({ done: 0, total: 0, questions: 0 });
  }, [sessions, mode]);

  const clearAllSessions = useCallback(() => {
    if (!window.confirm("Delete all sessions for this mode?")) return;
    setSessions(prev => {
      const updated = { ...prev, [mode]: [] };
      saveToLocalStorage(updated);
      return updated;
    });
    setCurrentSessionId(prev => ({ ...prev, [mode]: null }));
    setResults([]);
    setError("");
  }, [mode]);

  const reset = useCallback(() => {
    setResults([]);
    setError("");
    setProgress({ done: 0, total: 0, questions: 0 });
    abortRef.current = false;
  }, []);

  const stop = useCallback(() => {
    abortRef.current = true;
    setLoading(false);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [results.length]);

  useEffect(() => {
    const activeId = currentSessionId[mode];
    const modeSessions = sessions[mode] || [];

    if (activeId) {
      const target = modeSessions.find(s => s.id === activeId);
      if (target) { setResults(target.results); return; }
    }

    if (modeSessions.length > 0) {
      const latest = modeSessions[modeSessions.length - 1];
      setCurrentSessionId(prev => ({ ...prev, [mode]: latest.id }));
      setResults(latest.results);
    } else {
      setResults([]);
    }
    setError("");
    setProgress({ done: 0, total: 0, questions: 0 });
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── RUN ──────────────────────────────────────────────────────────────────
  const run = useCallback(async () => {
  if (loading) return; 
  
  setError("");
  setResults([]);
  setLoading(true);

  const newSession = {
    id: _genId(),
    title: "Generating...",
    timestamp: Date.now(),
    results: [],
    inputMeta: {}
  };

  setSessions(prev => {
    const updated = { ...prev };
    updated[mode] = [newSession, ...(updated[mode] || [])];
    saveToLocalStorage(updated);
    return updated;
  });

  setCurrentSessionId(prev => ({ ...prev, [mode]: newSession.id })); 

  setProgress({ done: 0, total: 0, questions: 0 });
  abortRef.current = false;
  resetTokenUsage();
  setTokens({ prompt: 0, completion: 0 });

  let inputMeta = {};

    try {
      if (mode === "single") {
        if (!singleQ.trim()) throw new Error("Please enter a question.");
        const lines = singleQ.split("\n").filter(l => l.trim());
        if (lines.length > 1) {
          throw new Error("Only ONE question allowed in Single mode. If you have multiple questions, use the Bulk section.");
        }
        const firstLine = lines[0];
        inputMeta = { question: firstLine.trim(), marks: singleMarks };

        const prompt = singlePrompt(
          firstLine.trim() + (isComparison(firstLine) ? " (comparison question)" : ""),
          singleMarks,
          simpleEnglish
        );
        const items = await generateAnswers(prompt, singleMarks, simpleEnglish, firstLine.trim());
        const finalItems = items.slice(0, 1);
        setResults(finalItems);
        updateCurrentSession(finalItems);
        setTokens(getTokenUsage());
        setSessions(prev => {
          const updated = { ...prev };
          const modeSessions = updated[mode] || [];
          const idx = modeSessions.findIndex(s => s.id === newSession.id);
          if (idx !== -1) {
            modeSessions[idx] = { ...modeSessions[idx], title: _sessionTitle(mode, inputMeta) };
          }
          saveToLocalStorage(updated);
          return updated;
        });

      } else if (mode === "bulk") {
        const qs = parseQuestions(bulkText);
        if (!qs.length) throw new Error("No questions detected. Paste questions one per line.");
        inputMeta = { questionCount: qs.length, marks: bulkMarks };

        const batches = chunkArray(qs, getBatchSize(bulkMarks));
        setProgress({ done: 0, total: batches.length, questions: qs.length });
        let all = [];

        const _sleep = ms => new Promise(r => setTimeout(r, ms));

        for (let i = 0; i < batches.length; i++) {
          if (abortRef.current) break;
          if (i > 0) await _sleep(4000);
          let batchResults = [];
          let retries      = 0;
          const MAX_RETRIES = 3;

          while (retries <= MAX_RETRIES) {
            if (abortRef.current) break;
            try {
              const prompt = bulkPrompt(batches[i], bulkMarks, simpleEnglish);
              batchResults = await generateAnswers(prompt, bulkMarks, simpleEnglish, "", batches[i].length);
              break;
            } catch (batchErr) {
              const msg         = batchErr.message || "";
              const isRateLimit = msg === "RATE_LIMIT" || msg.includes("Rate limit") || msg.includes("busy") || msg.includes("wait");
              if (retries < MAX_RETRIES) {
                retries++;
                const waitSec = isRateLimit ? 15 : 5;
                setError(`⏳ Processing… adjusting speed automatically (batch ${i + 1}/${batches.length})`);
                await _sleep(waitSec * 1000);
                setError("");
              } else {
                batchResults = batches[i].map(q => ({
                  _id: `fb-${Date.now()}-${Math.random()}`,
                  question: q, introduction: "", table: null,
                  points: ["Failed to generate. Try again."],
                  conclusion: "", mnemonic: "", quick_answer: "", error: true,
                }));
                break;
              }
            }
          }

          all = [...all, ...batchResults];
          setProgress({ done: i + 1, total: batches.length, questions: qs.length });
          setResults([...all]);
          setTokens(getTokenUsage());
          updateCurrentSession([...all]);
        }

        if (all.length > 0) {
          updateCurrentSession(all);
          setSessions(prev => {
            const updated = { ...prev };
            const modeSessions = updated[mode] || [];
            const idx = modeSessions.findIndex(s => s.id === newSession.id);
            if (idx !== -1) {
              modeSessions[idx] = { ...modeSessions[idx], title: _sessionTitle(mode, inputMeta) };
            }
            saveToLocalStorage(updated);
            return updated;
          });
        }

      } else if (mode === "notes" && notesInputMode === "text") {
        if (notesText.trim().length < 50) throw new Error("Please paste more content.");
        const total = parseInt(noteCount);
        inputMeta = { subMode: "text", questionCount: total, marks: notesMarks };

        const notesBatch = getNotesBatchSize(notesMarks);
        const batchCounts = [];
        for (let i = 0; i < total; i += notesBatch)
          batchCounts.push(Math.min(notesBatch, total - i));
        setProgress({ done: 0, total: batchCounts.length, questions: total });
        let all = [];

        const _sleepNotes = ms => new Promise(r => setTimeout(r, ms));

        for (let i = 0; i < batchCounts.length; i++) {
          if (abortRef.current) break;
          if (i > 0) await _sleepNotes(4000);

          let items    = [];
          let retries  = 0;
          const MAX_RETRIES = 3;

          while (retries <= MAX_RETRIES) {
            if (abortRef.current) break;
            try {
              items = await generateAnswers(
                notesPrompt(notesText, batchCounts[i], notesMarks, simpleEnglish),
                notesMarks, simpleEnglish, "", batchCounts[i]
              );
              break;
            } catch (batchErr) {
              const msg         = batchErr.message || "";
              const isRateLimit = msg === "RATE_LIMIT" || msg.includes("Rate limit") || msg.includes("busy") || msg.includes("wait");
              if (retries < MAX_RETRIES) {
                retries++;
                const waitSec = isRateLimit ? 62 : 8;
                setError(`Rate limit reached — continuing automatically (batch ${i + 1}/${batchCounts.length}, retry ${retries}/${MAX_RETRIES})…`);
                await _sleepNotes(waitSec * 1000);
                setError("");
              } else {
                items = Array.from({ length: batchCounts[i] }, (_, idx) => ({
                  question: `Question ${all.length + idx + 1}`,
                  introduction: "", table: null,
                  points: ["Could not generate. Please try again."],
                  conclusion: "", mnemonic: "", quick_answer: "", error: true,
                }));
                break;
              }
            }
          }

          all = [...all, ...items];
          setProgress({ done: i + 1, total: batchCounts.length, questions: total });
          setResults([...all]);
          setTokens(getTokenUsage());
          updateCurrentSession([...all]);
        }

        if (all.length > 0) {
          updateCurrentSession(all);
          setSessions(prev => {
            const updated = { ...prev };
            const modeSessions = updated[mode] || [];
            const idx = modeSessions.findIndex(s => s.id === newSession.id);
            if (idx !== -1) {
              modeSessions[idx] = { ...modeSessions[idx], title: _sessionTitle(mode, inputMeta) };
            }
            saveToLocalStorage(updated);
            return updated;
          });
        }

      } else if (mode === "notes" && notesInputMode === "pdf") {
        if (!pdfData) throw new Error("Please upload a PDF first.");

        const targetQs = parsedPdfCount();
        inputMeta = { subMode: "pdf", pdfName: pdfData.name, questionCount: targetQs, marks: pdfMarks };

        const textChunks = chunkText(pdfData.text, 1000);
        const perChunk = Math.max(1, Math.ceil(targetQs / textChunks.length));

        let plan = [];
        let totalPlanned = 0;

        for (const chunk of textChunks) {
          if (totalPlanned >= targetQs) break;
          const ask = Math.min(perChunk, targetQs - totalPlanned);
          plan.push({ chunk, ask });
          totalPlanned += ask;
        }

        const pdfBatch = getPdfBatchSize(pdfMarks);
        const apiBatches = [];

        for (const { chunk, ask } of plan) {
          for (let i = 0; i < ask; i += pdfBatch) {
            apiBatches.push({ chunk, count: Math.min(pdfBatch, ask - i) });
          }
        }

        setProgress({ done: 0, total: apiBatches.length, questions: targetQs });

        let all = [];
        const _sleep = (ms) => new Promise(r => setTimeout(r, ms));
        let dynamicDelay = 800;

        for (let i = 0; i < apiBatches.length; i++) {
          if (abortRef.current) break;

          const { chunk, count } = apiBatches[i];
          if (i > 0) await _sleep(4000);

          let items = [];
          let retries = 0;
          const MAX_RETRIES = 4;

          while (retries <= MAX_RETRIES) {
            if (abortRef.current) break;
            try {
              items = await generateAnswers(
                pdfChunkPrompt(chunk, count, pdfMarks, simpleEnglish),
                pdfMarks, simpleEnglish, "", count
              );
              dynamicDelay = Math.max(600, dynamicDelay - 50);
              break;
            } catch (err) {
              const msg = err.message || "";
              const isRateLimit = msg === "RATE_LIMIT" || msg.includes("Rate limit") || msg.includes("busy") || msg.includes("wait");
              if (retries < MAX_RETRIES) {
                retries++;
                dynamicDelay = Math.min(2000, dynamicDelay + 300);
                const wait = isRateLimit ? 15000 : 5000;
                setError(`⏳ Adjusting speed… retrying batch ${i + 1}/${apiBatches.length}`);
                await _sleep(wait);
                setError("");
              } else {
                items = Array.from({ length: count }, (_, idx) => ({
                  question: `Question ${all.length + idx + 1}`,
                  introduction: "", table: null,
                  points: ["Could not generate. Retry later."],
                  conclusion: "", mnemonic: "", quick_answer: "", error: true,
                }));
                break;
              }
            }
          }

          all = [...all, ...items];
          setProgress({ done: i + 1, total: apiBatches.length, questions: targetQs });
          setResults([...all]);
          setTokens(getTokenUsage());
          updateCurrentSession([...all]);
        }

        if (all.length > 0) {
          updateCurrentSession(all);
        }

        setSessions(prev => {
          const updated = { ...prev };
          const modeSessions = updated[mode] || [];
          const idx = modeSessions.findIndex(s => s.id === newSession.id);
          if (idx !== -1) {
            modeSessions[idx] = { ...modeSessions[idx], title: _sessionTitle(mode, inputMeta) };
          }
          saveToLocalStorage(updated);
          return updated;
        });
      }

    } catch (e) {
      const msg = e.message || "";
      if (msg === "RATE_LIMIT") {
        setError("⏳ System is busy… adjusting speed automatically");
      } else if (msg.includes("Rate limit")) {
        setError("⏳ Processing… optimizing request flow");
      } else if (msg.includes("busy") || msg.includes("wait")) {
        setError("Server is busy. Please try again in a moment.");
      } else if (msg.includes("timed out") || msg.includes("timeout")) {
        setError("Request timed out. Please try again.");
      } else if (msg.includes("Cannot reach server")) {
        setError("Cannot reach server. Make sure the backend is running.");
      } else {
        setError(msg || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
      setTokens(getTokenUsage());
    }
  }, [mode, singleQ, singleMarks, bulkText, bulkMarks, notesText, notesMarks, noteCount, notesInputMode, pdfData, pdfMarks, parsedPdfCount, simpleEnglish]);

  const canRun = () => {
    if (loading) return false;
    if (mode === "single") return singleQ.trim().length > 0;
    if (mode === "bulk") return detectedCount > 0;
    if (mode === "notes" && notesInputMode === "text") return notesText.trim().length >= 50;
    if (mode === "notes" && notesInputMode === "pdf") return !!pdfData && parsedPdfCount() > 0;
    return false;
  };

  const copyAll = () => {
    const text = results.map((r, i) => {
      const pts = (r.points || []).map((p, j) => `${j + 1}. ${p}`).join("\n");
      return [
        `Q${i + 1}: ${r.question}`, `Intro: ${r.introduction}`, `Points:\n${pts}`,
        r.conclusion ? `Conclusion: ${r.conclusion}` : "",
        `Mnemonic: ${r.mnemonic}`, `Quick Answer: ${r.quick_answer || r.fallback || ""}`,
        "─".repeat(40),
      ].filter(Boolean).join("\n");
    }).join("\n\n");
    navigator.clipboard.writeText(text);
  };

  const genLabel = () => {
    if (mode === "bulk" && detectedCount > 0) return `Generate ${detectedCount} Answers`;
    if (mode === "notes" && notesInputMode === "pdf" && pdfData) return `Generate ${parsedPdfCount()} from PDF`;
    return "Generate Answer";
  };

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const totalTokens = tokens.prompt + tokens.completion;

  // ── FIX 1: onWordExport uses colon (`:`) not equals (`=`) ─────────────────
  const panelProps = {
    mode, setMode, reset, simpleEnglish, setSimpleEnglish,
    singleQ, setSingleQ, singleMarks, setSingleMarks,
    bulkText, setBulkText, bulkMarks, setBulkMarks, detectedCount,
    notesText, setNotesText, notesMarks, setNotesMarks, noteCount, setNoteCount,
    notesInputMode, setNotesInputMode,
    pdfData, setPdfData, pdfMarks, setPdfMarks, pdfCountInput, setPdfCountInput, parsedPdfCount,
    loading, results, run, stop, canRun, genLabel, copyAll,
    globalView, setGlobalView,
    onClose: () => setPanelOpen(false),
    onWordExport: handleWordExport,   // ← FIXED: was `onWordExport = {handleWordExport}`
  };

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <div className={`overlay${panelOpen ? "" : " hidden"}`} onClick={() => setPanelOpen(false)} />

        <div className={`left${panelOpen ? " open" : ""}`}>
          <div className="left-hd">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 4, background: "var(--blue-dim)", border: "1px solid var(--blue-ring)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>⚡</div>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 17, color: "var(--tx)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Examify<span style={{ color: "var(--blue)", marginLeft: 2 }}>.</span>
              </span>
            </div>
            <button className="mob-close" onClick={() => setPanelOpen(false)}>✕</button>
          </div>
          <LeftPanelBody {...panelProps} />
        </div>

        <div className="right">
          <div className="topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <button className="mob-open" onClick={() => setPanelOpen(true)}>
                <span>☰</span><span style={{ fontSize: 12 }}>Menu</span>
              </button>

              {/* ── FIX 2: removed dangling `: "Ready"` string outside JSX braces ── */}
              <span style={{ fontSize: 13, color: "var(--tx2)", whiteSpace: "nowrap" }}>
                {results.length > 0 ? (
                  <>
                    <span style={{ color: "var(--tx)", fontWeight: 600 }}>{results.length}</span>
                    {progress.questions > 0 && <span> / {progress.questions}</span>}
                    <span> answers</span>
                  </>
                ) : (
                  loading ? null : "Ready"
                )}
              </span>

              {simpleEnglish && <span className="se-badge">🟢 Simple English</span>}

              {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--blue)", animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                  <span style={{ fontSize: 11, color: "var(--tx3)" }}>
                    {simpleEnglish ? "generating (simple english)…" : "generating…"}
                  </span>
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {totalTokens > 0 && (
                <div className="tok-pill">
                  <span style={{ fontSize: 10, color: "var(--tx3)" }}>tokens</span>
                  <span style={{ fontSize: 12, color: "var(--blue)", fontWeight: 700 }}>{totalTokens.toLocaleString()}</span>
                  <span className="tok-detail" style={{ fontSize: 10, color: "var(--tx3)" }}>({tokens.prompt.toLocaleString()} in · {tokens.completion.toLocaleString()} out)</span>
                </div>
              )}
              {results.length > 0 && (
                <ViewToggle val={globalView} onChange={setGlobalView} className="desk-vtog" />
              )}
            </div>
          </div>

          <SessionBar
            mode={mode}
            sessions={sessions}
            currentSessionId={currentSessionId[mode]}
            onSwitch={switchSession}
            onClearAll={clearAllSessions}
          />

          {loading && progress.total > 1 && (
            <div className="prog-wrap">
              {queueInfo && (
                <div style={{
                  padding: "10px 28px",
                  fontSize: "13px",
                  color: "#a3a3a3",
                  borderBottom: "1px solid var(--bdr)"
                }}>
                  ⚡ Processing in batches...  
                  👥 {queueInfo.position} in queue  
                  ⏳ ~{queueInfo.time}s wait
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "var(--tx3)" }}>Batch {progress.done}/{progress.total}</span>
                <span style={{ fontSize: 11, color: "var(--blue)", fontWeight: 700 }}>{pct}%</span>
              </div>
              <div className="prog-track">
                <div className="prog-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {error && <div className="err-bar">⚠ {error}</div>}

          <div className="answers">
            {!loading && results.length === 0 && !error && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "72vh", textAlign: "center", gap: 12, padding: "24px 0" }}>
                <div style={{ width: 60, height: 60, borderRadius: 16, background: "var(--blue-dim)", border: "1px solid var(--blue-ring)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 4 }}>📚</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: "var(--tx)" }}>Your answers will appear here</div>
                <div style={{ fontSize: 14, color: "var(--tx2)", maxWidth: 320, lineHeight: 1.7 }}>
                  Enter your question in the left panel and click Generate.
                </div>
                <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, width: "100%", maxWidth: 520 }}>
                  {[
                    ["⚡", "Single", "One question, instant answer"],
                    ["📋", "Bulk", "Paste many questions"],
                    ["📝", "Notes", "Notes → Q&A generated"],
                    ["📄", "PDF", "Upload → Q&A extracted"],
                    ["≡", "Points", "Bullet point format"],
                    ["¶", "Para", "Essay / paragraph format"],
                  ].map(([icon, title, desc]) => (
                    <div key={title} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", background: "var(--surf)", border: "1px solid var(--bdr)", borderRadius: 10, textAlign: "left" }}>
                      <span style={{ fontSize: 14, width: 18, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--tx)", marginBottom: 2 }}>{title}</div>
                        <div style={{ fontSize: 11, color: "var(--tx3)", lineHeight: 1.4 }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loading && results.length === 0 && [1, 2, 3].map(i => <ShimmerCard key={i} />)}

            {Array.isArray(results) && results.map((r, i) => {
              if (!r || typeof r !== "object") return null;
              return <AnswerCard key={r._id || i} item={r} index={i} globalView={globalView} />;
            })}

            {loading && results.length > 0 && (
              <div style={{ padding: "16px 0", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--surf)", flexShrink: 0 }} />
                <div style={{ display: "flex", gap: 5 }}>
                  {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--tx3)", animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
                </div>
              </div>
            )}

            <div ref={bottomRef} style={{ height: 28 }} />
          </div>
        </div>
      </div>

      <nav className="mob-nav">
        <div className="mob-nav-inner">
          <button className="mob-tab" onClick={() => setPanelOpen(true)}>
            <span className="mob-tab-ico">✏️</span>
            <span>Input</span>
          </button>
          <button className="mob-tab" onClick={() => setPanelOpen(false)}>
            <span className="mob-tab-ico">📖</span>
            <span>Answers</span>
          </button>
          {loading
            ? <button className="mob-tab" style={{ color: "var(--red)" }} onClick={stop}>
              <span className="mob-tab-ico">⏹</span>
              <span>Stop</span>
            </button>
            : <button className={`mob-tab${canRun() ? " act" : ""}`}
              onClick={() => { if (canRun()) { run(); setPanelOpen(false); } else setPanelOpen(true); }}>
              <span className="mob-tab-ico">⚡</span>
              <span>Generate</span>
            </button>
          }
        </div>
      </nav>

      {wordExportOpen && (
        <WordExportModal
          mode={mode}
          sessions={sessions}
          currentResults={results}
          onClose={() => setWordExportOpen(false)}
        />
      )}
    </>
  );
}