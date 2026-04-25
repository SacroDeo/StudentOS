import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

/* ─────────────────────────────────────────
   FONTS
───────────────────────────────────────── */
const FONT_LINK = [
  "Cedarville+Cursive","Homemade+Apple","Meddon","Dawning+of+a+New+Day",
  "Dancing+Script:wght@400;700","Great+Vibes","Pacifico","Sacramento",
  "Yellowtail","Satisfy","Courgette","Allura","Alex+Brush","Pinyon+Script",
  "Tangerine:wght@400;700","Mr+De+Haviland","Ruthie","Parisienne",
  "Euphoria+Script","Italianno","Niconne","Petit+Formal+Script",
  "Monsieur+La+Doulaise","Clicker+Script","Miss+Fajardose","Rouge+Script",
  "Lovers+Quarrel","Arizonia","Style+Script","Luxurious+Script",
  "Herr+Von+Muellerhoff","Marck+Script","Qwigley","Kristi","Norican",
  "Kaushan+Script","Lobster","Lobster+Two","Carattere","Waterfall",
  "Imperial+Script","Birthstone","Birthstone+Bounce",
  "Shalimar","Inspiration","Fasthand","Praise","Ephesis",
  "Fleur+De+Leah","Grand+Hotel","Merienda:wght@400;700","Molle",
  "Kalam:wght@300;400;700","Caveat:wght@400;700","Patrick+Hand",
  "Shadows+Into+Light","Shadows+Into+Light+Two","Handlee","Gochi+Hand",
  "Pangolin","Nanum+Pen+Script","Reenie+Beanie","Permanent+Marker",
  "Bad+Script","Zeyada","Gloria+Hallelujah","Coming+Soon",
  "Covered+By+Your+Grace","The+Girl+Next+Door","Give+You+Glory",
  "Julee","Crafty+Girls","Sue+Ellen+Francisco",
  "Indie+Flower","Architects+Daughter","Amatic+SC:wght@400;700",
  "Rock+Salt","Just+Another+Hand","Schoolbell","Rancho",
  "Short+Stack","Delius","Delius+Swash+Caps","Cantora+One",
].join("&family=");

const FONTS = [
  { id:"cedar",     label:"Cedarville Cursive",   family:"'Cedarville Cursive', cursive",      group:"Elegant Cursive" },
  { id:"homemade",  label:"Homemade Apple",        family:"'Homemade Apple', cursive",          group:"Elegant Cursive" },
  { id:"meddon",    label:"Meddon",                family:"'Meddon', cursive",                  group:"Elegant Cursive" },
  { id:"dawning",   label:"Dawning of a New Day",  family:"'Dawning of a New Day', cursive",    group:"Elegant Cursive" },
  { id:"vibes",     label:"Great Vibes",           family:"'Great Vibes', cursive",             group:"Elegant Cursive" },
  { id:"allura",    label:"Allura",                family:"'Allura', cursive",                  group:"Elegant Cursive" },
  { id:"alexbrush", label:"Alex Brush",            family:"'Alex Brush', cursive",              group:"Elegant Cursive" },
  { id:"pinyon",    label:"Pinyon Script",         family:"'Pinyon Script', cursive",           group:"Elegant Cursive" },
  { id:"sacramento",label:"Sacramento",            family:"'Sacramento', cursive",              group:"Elegant Cursive" },
  { id:"tangerine", label:"Tangerine",             family:"'Tangerine', cursive",               group:"Elegant Cursive" },
  { id:"mrdehavil", label:"Mr De Haviland",        family:"'Mr De Haviland', cursive",          group:"Elegant Cursive" },
  { id:"ruthie",    label:"Ruthie",                family:"'Ruthie', cursive",                  group:"Elegant Cursive" },
  { id:"parisien",  label:"Parisienne",            family:"'Parisienne', cursive",              group:"Elegant Cursive" },
  { id:"euphoria",  label:"Euphoria Script",       family:"'Euphoria Script', cursive",         group:"Elegant Cursive" },
  { id:"italianno", label:"Italianno",             family:"'Italianno', cursive",               group:"Elegant Cursive" },
  { id:"niconne",   label:"Niconne",               family:"'Niconne', cursive",                 group:"Elegant Cursive" },
  { id:"petit",     label:"Petit Formal Script",   family:"'Petit Formal Script', cursive",     group:"Elegant Cursive" },
  { id:"monsieur",  label:"Monsieur La Doulaise",  family:"'Monsieur La Doulaise', cursive",    group:"Elegant Cursive" },
  { id:"clicker",   label:"Clicker Script",        family:"'Clicker Script', cursive",          group:"Elegant Cursive" },
  { id:"missfaj",   label:"Miss Fajardose",        family:"'Miss Fajardose', cursive",          group:"Elegant Cursive" },
  { id:"rouge",     label:"Rouge Script",          family:"'Rouge Script', cursive",            group:"Elegant Cursive" },
  { id:"lovers",    label:"Lovers Quarrel",        family:"'Lovers Quarrel', cursive",          group:"Elegant Cursive" },
  { id:"arizonia",  label:"Arizonia",              family:"'Arizonia', cursive",                group:"Elegant Cursive" },
  { id:"herrmuell", label:"Herr Von Muellerhoff",  family:"'Herr Von Muellerhoff', cursive",    group:"Elegant Cursive" },
  { id:"kristi",    label:"Kristi",                family:"'Kristi', cursive",                  group:"Elegant Cursive" },
  { id:"qwigley",   label:"Qwigley",               family:"'Qwigley', cursive",                 group:"Elegant Cursive" },
  { id:"waterfall", label:"Waterfall",             family:"'Waterfall', cursive",               group:"Elegant Cursive" },
  { id:"imperial",  label:"Imperial Script",       family:"'Imperial Script', cursive",         group:"Elegant Cursive" },
  { id:"birthstone",label:"Birthstone",            family:"'Birthstone', cursive",              group:"Elegant Cursive" },
  { id:"bstone2",   label:"Birthstone Bounce",     family:"'Birthstone Bounce', cursive",       group:"Elegant Cursive" },
  { id:"shalimar",  label:"Shalimar",              family:"'Shalimar', cursive",               group:"Elegant Cursive" },
  { id:"inspir",    label:"Inspiration",           family:"'Inspiration', cursive",             group:"Elegant Cursive" },
  { id:"praise",    label:"Praise",                family:"'Praise', cursive",                  group:"Elegant Cursive" },
  { id:"ephesis",   label:"Ephesis",               family:"'Ephesis', cursive",                 group:"Elegant Cursive" },
  { id:"fleurde",   label:"Fleur De Leah",         family:"'Fleur De Leah', cursive",           group:"Elegant Cursive" },
  { id:"carattere", label:"Carattere",             family:"'Carattere', cursive",               group:"Elegant Cursive" },
  { id:"dancing",   label:"Dancing Script",        family:"'Dancing Script', cursive",          group:"Casual Cursive" },
  { id:"satisfy",   label:"Satisfy",               family:"'Satisfy', cursive",                 group:"Casual Cursive" },
  { id:"courgette", label:"Courgette",             family:"'Courgette', cursive",               group:"Casual Cursive" },
  { id:"pacifico",  label:"Pacifico",              family:"'Pacifico', cursive",                group:"Casual Cursive" },
  { id:"yellowtail",label:"Yellowtail",            family:"'Yellowtail', cursive",              group:"Casual Cursive" },
  { id:"lobster",   label:"Lobster",               family:"'Lobster', cursive",                 group:"Casual Cursive" },
  { id:"lobster2",  label:"Lobster Two",           family:"'Lobster Two', cursive",             group:"Casual Cursive" },
  { id:"kaushan",   label:"Kaushan Script",        family:"'Kaushan Script', cursive",          group:"Casual Cursive" },
  { id:"marck",     label:"Marck Script",          family:"'Marck Script', cursive",            group:"Casual Cursive" },
  { id:"norican",   label:"Norican",               family:"'Norican', cursive",                 group:"Casual Cursive" },
  { id:"style",     label:"Style Script",          family:"'Style Script', cursive",            group:"Casual Cursive" },
  { id:"luxscript", label:"Luxurious Script",      family:"'Luxurious Script', cursive",        group:"Casual Cursive" },
  { id:"grandhotel",label:"Grand Hotel",           family:"'Grand Hotel', cursive",             group:"Casual Cursive" },
  { id:"fasthand",  label:"Fasthand",              family:"'Fasthand', cursive",                group:"Casual Cursive" },
  { id:"merienda",  label:"Merienda",              family:"'Merienda', cursive",                group:"Casual Cursive" },
  { id:"molle",     label:"Molle",                 family:"'Molle', cursive",                   group:"Casual Cursive" },
  { id:"caveat",    label:"Caveat",                family:"'Caveat', cursive",                  group:"Natural Handwriting" },
  { id:"kalam",     label:"Kalam",                 family:"'Kalam', cursive",                   group:"Natural Handwriting" },
  { id:"handlee",   label:"Handlee",               family:"'Handlee', cursive",                 group:"Natural Handwriting" },
  { id:"patrick",   label:"Patrick Hand",          family:"'Patrick Hand', cursive",            group:"Natural Handwriting" },
  { id:"shadows",   label:"Shadows Into Light",    family:"'Shadows Into Light', cursive",      group:"Natural Handwriting" },
  { id:"shadows2",  label:"Shadows Into Light Two",family:"'Shadows Into Light Two', cursive",  group:"Natural Handwriting" },
  { id:"gochi",     label:"Gochi Hand",            family:"'Gochi Hand', cursive",              group:"Natural Handwriting" },
  { id:"pangolin",  label:"Pangolin",              family:"'Pangolin', cursive",                group:"Natural Handwriting" },
  { id:"nanumpen",  label:"Nanum Pen Script",      family:"'Nanum Pen Script', cursive",        group:"Natural Handwriting" },
  { id:"reenie",    label:"Reenie Beanie",         family:"'Reenie Beanie', cursive",           group:"Natural Handwriting" },
  { id:"badscript", label:"Bad Script",            family:"'Bad Script', cursive",              group:"Natural Handwriting" },
  { id:"zeyada",    label:"Zeyada",                family:"'Zeyada', cursive",                  group:"Natural Handwriting" },
  { id:"gloriahall",label:"Gloria Hallelujah",     family:"'Gloria Hallelujah', cursive",       group:"Natural Handwriting" },
  { id:"covered",   label:"Covered By Your Grace", family:"'Covered By Your Grace', cursive",   group:"Natural Handwriting" },
  { id:"coming",    label:"Coming Soon",           family:"'Coming Soon', cursive",             group:"Natural Handwriting" },
  { id:"girlnext",  label:"The Girl Next Door",    family:"'The Girl Next Door', cursive",      group:"Natural Handwriting" },
  { id:"giveuglow", label:"Give You Glory",        family:"'Give You Glory', cursive",          group:"Natural Handwriting" },
  { id:"julee",     label:"Julee",                 family:"'Julee', cursive",                   group:"Natural Handwriting" },
  { id:"craftygirl",label:"Crafty Girls",          family:"'Crafty Girls', cursive",            group:"Natural Handwriting" },
  { id:"suellen",   label:"Sue Ellen Francisco",   family:"'Sue Ellen Francisco', cursive",     group:"Natural Handwriting" },
  { id:"indie",     label:"Indie Flower",          family:"'Indie Flower', cursive",            group:"Printed Handwriting" },
  { id:"architects",label:"Architects Daughter",   family:"'Architects Daughter', cursive",     group:"Printed Handwriting" },
  { id:"amatic",    label:"Amatic SC",             family:"'Amatic SC', cursive",               group:"Printed Handwriting" },
  { id:"permmarker",label:"Permanent Marker",      family:"'Permanent Marker', cursive",        group:"Printed Handwriting" },
  { id:"rocksalt",  label:"Rock Salt",             family:"'Rock Salt', cursive",               group:"Printed Handwriting" },
  { id:"justanoth", label:"Just Another Hand",     family:"'Just Another Hand', cursive",       group:"Printed Handwriting" },
  { id:"schoolbell",label:"Schoolbell",            family:"'Schoolbell', cursive",              group:"Printed Handwriting" },
  { id:"rancho",    label:"Rancho",                family:"'Rancho', cursive",                  group:"Printed Handwriting" },
  { id:"shortstack",label:"Short Stack",           family:"'Short Stack', cursive",             group:"Printed Handwriting" },
  { id:"delius",    label:"Delius",                family:"'Delius', cursive",                  group:"Printed Handwriting" },
  { id:"deliusswsh",label:"Delius Swash Caps",     family:"'Delius Swash Caps', cursive",       group:"Printed Handwriting" },
  { id:"cantora",   label:"Cantora One",           family:"'Cantora One', cursive",             group:"Printed Handwriting" },
];
const FONT_GROUPS = ["Elegant Cursive","Casual Cursive","Natural Handwriting","Printed Handwriting"];

const INKS = [
  { id:"blue",     label:"Blue",      color:"#1a3a6b", colorLight:"#2a5aab" },
  { id:"darkblue", label:"Dark Blue", color:"#0a1a3d", colorLight:"#1a3a7d" },
  { id:"black",    label:"Black",     color:"#1c1c1c", colorLight:"#3c3c3c" },
  { id:"pencil",   label:"Pencil",    color:"#4a4a4a", colorLight:"#7a7a7a" },
  { id:"red",      label:"Red",       color:"#8b1a1a", colorLight:"#bb3a3a" },
];

const PAPERS = [
  { id:"a4ruled",   label:"A4 Ruled",  lineH:32, margin:80, leftMargin:80, hasMarginLine:true,  isGrid:false },
  { id:"a4college", label:"College",   lineH:26, margin:80, leftMargin:80, hasMarginLine:true,  isGrid:false, holePunch:true },
  { id:"a4plain",   label:"Plain",     lineH:0,  margin:80, leftMargin:80, hasMarginLine:false, isGrid:false },
  { id:"a4grid",    label:"Grid",      lineH:26, margin:80, leftMargin:80, hasMarginLine:false, isGrid:true  },
  { id:"legal",     label:"Legal",     lineH:32, margin:80, leftMargin:80, hasMarginLine:true,  isGrid:false, tall:true },
  { id:"narrow",    label:"Narrow",    lineH:22, margin:80, leftMargin:80, hasMarginLine:true,  isGrid:false },
];

const SIZES = [
  { id:"xs", label:"XS", size:14 },
  { id:"sm", label:"S",  size:17 },
  { id:"md", label:"M",  size:21 },
  { id:"lg", label:"L",  size:26 },
  { id:"xl", label:"XL", size:32 },
];

const PW = 794;
const PH_A4 = 1123;
const PH_LEGAL = 1400;

/* ─────────────────────────────────────────
   FIX #9: FONT LOADING — Promise-based, not setTimeout hack
   Uses document.fonts.load() to guarantee font is available before
   any paginate/draw call. Falls back gracefully after 4s.
───────────────────────────────────────── */
async function loadFontFamily(family) {
  const testStr = "Hello World ABCDEFGabcdefg";
  // Extract just the font-family name (strip CSS wrapper quotes/stack)
  const match = family.match(/'([^']+)'/);
  if (!match) return;
  const name = match[1];
  try {
    await Promise.race([
      document.fonts.load(`16px '${name}'`, testStr),
      new Promise(res => setTimeout(res, 4000)), // 4s hard timeout
    ]);
  } catch (_) {}
}

/* ─────────────────────────────────────────
   SEEDED RNG — deterministic per page/line so rerenders are stable
───────────────────────────────────────── */
function mkRng(seed) {
  let s = (seed | 0) || 1;
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 0xffffffff;
  };
}

/* ─────────────────────────────────────────
   FIX #8: PAPER TEXTURE — Pixel-level grain + yellowing noise
   Called once per drawPage; overlays semi-transparent grain pixels.
───────────────────────────────────────── */
function applyPaperTexture(ctx, W, H, rng) {
  // Draw fibrous grain via many tiny semi-transparent pixels
  // Two passes: coarse fiber + fine grain
  const grainData = ctx.createImageData(W, H);
  const d = grainData.data;
  for (let i = 0; i < d.length; i += 4) {
    const pixelRng = rng() ;
    const v = pixelRng > 0.993
      ? Math.floor(rng() * 60)       // occasional dark fiber speck
      : pixelRng > 0.97
      ? Math.floor(180 + rng() * 40) // mid-tone grain
      : -1;                           // transparent — skip
    if (v >= 0) {
      // Warm yellowing: slightly push R up, G neutral, B down
      d[i]   = Math.min(255, v + 18); // R
      d[i+1] = Math.min(255, v + 8);  // G
      d[i+2] = Math.max(0,   v - 12); // B
      d[i+3] = Math.floor(12 + rng() * 22); // very low alpha
    }
  }
  ctx.putImageData(grainData, 0, 0);

  // Subtle vignette — paper edges slightly darker
  const vg = ctx.createRadialGradient(W/2, H/2, H*0.25, W/2, H/2, H*0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.06)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

/* ─────────────────────────────────────────
   FIX #2 + #4 + #6 + #7: CHARACTER-LEVEL RENDERER
   Renders one structured line char-by-char with:
   - per-char rotation jitter (not per-word)
   - sinusoidal baseline
   - ink pressure via per-char alpha + color lightening
   - irregular inter-character spacing
───────────────────────────────────────── */
function renderLineChars(ctx, sl, baseY, startX, fontStr, dispSize, inkColor, inkColorLight, imperfect, rng) {
  const text = sl.text || "";
  if (!text.trim()) return;

  ctx.font = fontStr;
  const totalChars = text.length;

  // FIX #5: cumulative margin drift — starts at 0, wanders each char
  let cx = startX;
  // Sinusoidal baseline params — different per line (from rng seeded per line)
  // FIX #7: sine wave baseline, not linear drift
  const sineAmp   = imperfect ? 1.2 + rng() * 2.2 : 0;   // ±1–3px vertical
  const sinePeriod = imperfect ? 60 + rng() * 120 : 9999; // wave period in chars

  // Ink color: parse into RGB for mid-stroke lightening
  // We'll interpolate between inkColor (dark) and inkColorLight (lighter) per char
  const parseHex = (hex) => {
    const h = hex.replace("#","");
    return [
      parseInt(h.slice(0,2),16),
      parseInt(h.slice(2,4),16),
      parseInt(h.slice(4,6),16)
    ];
  };
  const [r0,g0,b0] = parseHex(inkColor);
  const [r1,g1,b1] = parseHex(inkColorLight);
  const toHex = (r,g,b) => `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;

  for (let ci = 0; ci < totalChars; ci++) {
    const ch = text[ci];

    // Per-char font measurement for spacing
    ctx.font = fontStr;
    const charW = ctx.measureText(ch).width;

    if (ch === " ") {
      // FIX #6: irregular word spacing — humans vary gaps
      const spaceVar = imperfect ? 0.7 + rng() * 0.65 : 1.0;
      cx += charW * spaceVar;
      continue;
    }

    // FIX #7: sinusoidal baseline — y oscillates with a sine wave
    const sineY = sineAmp * Math.sin((ci / sinePeriod) * Math.PI * 2);

    // FIX #2: per-char rotation — tiny individual wobble, not per-word uniform tilt
    // Base tilt: very subtle (±0.5°), plus per-char noise (±0.8°)
    const baseTilt = imperfect ? (rng() - 0.5) * 0.016 : 0;  // ~±0.9°
    const charRot  = imperfect ? baseTilt + (rng() - 0.5) * 0.026 : 0;

    // FIX #6: inter-character spacing jitter (kerning variation)
    const kernJitter = imperfect ? (rng() - 0.5) * (dispSize * 0.08) : 0;

    // FIX #3+#4: ink pressure simulation
    // Position within word determines pressure — start/end of stroke heavier
    const wordPos  = ci / Math.max(totalChars - 1, 1); // 0 → 1
    // Pressure curve: heavy at 0 and 1, lighter mid-stroke
    const pressure = 0.5 + 0.5 * Math.pow(Math.cos(wordPos * Math.PI), 2);
    const alpha    = imperfect
      ? Math.min(1, 0.70 + pressure * 0.28 + (rng() - 0.5) * 0.08)
      : 0.92;
    // Interpolate ink color: darker at stroke start/end, slightly lighter mid
    const t   = imperfect ? 1 - pressure : 0; // 0=dark, 1=light
    const cr  = Math.round(r0 + (r1 - r0) * t * 0.4);
    const cg  = Math.round(g0 + (g1 - g0) * t * 0.4);
    const cb  = Math.round(b0 + (b1 - b0) * t * 0.4);
    const charColor = toHex(cr, cg, cb);

    // FIX #10: per-char vertical jitter (slight misalignment off baseline)
    const vertJitter = imperfect ? (rng() - 0.5) * (dispSize * 0.09) : 0;

    const drawX = cx + kernJitter;
    const drawY = baseY + sineY + vertJitter;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = charColor;
    ctx.font        = fontStr;
    ctx.translate(drawX, drawY);
    ctx.rotate(charRot);
    ctx.fillText(ch, 0, 0);
    ctx.restore();

    // Advance x — natural width plus kern jitter
    cx += charW + kernJitter * 0.3;
  }
}

/* ─────────────────────────────────────────
   LINE CLASSIFIER — unchanged, works correctly
───────────────────────────────────────── */
function classifyLine(raw) {
  if (raw === null || raw === undefined) return { type:"empty", text:"", indent:0 };
  if (raw.trim() === "") return { type:"empty", text:"", indent:0 };
  const leadMatch = raw.match(/^(\s*)/);
  const leadWS = leadMatch ? leadMatch[1] : "";
  const indent = leadWS.replace(/\t/g, "    ").length;
  const trimmed = raw.trim();
  if (/^={2,}(.+)={2,}$/.test(trimmed)) return { type:"center", text: trimmed.replace(/^={2,}|={2,}$/g,"").trim(), indent:0 };
  if (/^#{1,3}\s+/.test(trimmed))        return { type:"heading", text: trimmed.replace(/^#{1,3}\s+/,""), indent };
  if (/^\*\*(.+)\*\*$/.test(trimmed))   return { type:"heading", text: trimmed.replace(/^\*\*|\*\*$/g,""), indent };
  if (/^[-*•–—]\s+/.test(trimmed))      return { type:"bullet",  text: trimmed, indent: indent + 20 };
  if (/^\d+[.)]\s+/.test(trimmed))      return { type:"numbered",text: trimmed, indent: indent + 20 };
  if (/^[a-zA-Z][.)]\s+/.test(trimmed)) return { type:"numbered",text: trimmed, indent: indent + 20 };
  return { type:"body", text: raw, indent: Math.max(indent * 6, 0) };
}

/* ─────────────────────────────────────────
   PAGINATOR
───────────────────────────────────────── */
function paginate(text, paper, fontSize, fontFamily, lineOverrides = {}) {
  const H = paper.tall ? PH_LEGAL : PH_A4;
  const { lineH, margin, leftMargin } = paper;
  const effLH = lineH > 0 ? lineH : Math.round(fontSize * 1.9);
  const lpp = Math.floor((H - margin - 60) / effLH);
  const maxW = PW - leftMargin - 44;
  const mc = document.createElement("canvas");
  const mctx = mc.getContext("2d");
  const measure = (txt, sz, bold, italic) => {
    mctx.font = `${italic?"italic ":""}${bold?"bold ":""}${sz}px ${fontFamily}`;
    return mctx.measureText(txt).width;
  };
  const structuredLines = [];
  text.split("\n").forEach((rawLine, rawIdx) => {
    const ov = lineOverrides[rawIdx] || {};
    const cl = classifyLine(rawLine);
    if (cl.type === "empty") { structuredLines.push({ type:"empty", text:"", indent:0, rawIdx }); return; }
    const isHeading  = cl.type === "heading";
    const isCentered = cl.type === "center" || ov.align === "center";
    const isRight    = ov.align === "right";
    const dispSize   = ov.size  || (isHeading ? Math.round(fontSize * 1.18) : fontSize);
    const bold       = ov.bold  !== undefined ? ov.bold   : isHeading;
    const italic     = ov.italic !== undefined ? ov.italic : false;
    const extraIndent= (ov.indent || 0) * 24;
    const indentPx   = cl.indent * 4 + extraIndent;
    const availW     = maxW - indentPx;
    const words      = cl.text.split(/\s+/).filter(Boolean);
    let cur = "";
    words.forEach(word => {
      const test = cur ? cur + " " + word : word;
      if (measure(test, dispSize, bold, italic) <= availW) { cur = test; }
      else {
        if (cur) structuredLines.push({ type:cl.type, text:cur, indent:indentPx, isHeading, isCentered, isRight, size:dispSize, bold, italic, rawIdx });
        cur = word;
      }
    });
    if (cur) structuredLines.push({ type:cl.type, text:cur, indent:indentPx, isHeading, isCentered, isRight, size:dispSize, bold, italic, rawIdx });
  });
  const pages = [];
  for (let i = 0; i < structuredLines.length; i += lpp) pages.push(structuredLines.slice(i, i + lpp));
  return pages.length ? pages : [[]];
}

/* ─────────────────────────────────────────
   CANVAS RENDERER — full rewrite with all 10 fixes
───────────────────────────────────────── */
function drawPage(lines, paper, fontFamily, ink, fontSize, pageNum, totalPages, imperfect) {
  const { color: inkColor, colorLight: inkColorLight } = ink;
  const W = PW;
  const H = paper.tall ? PH_LEGAL : PH_A4;
  const { lineH, margin, leftMargin, hasMarginLine, isGrid, holePunch } = paper;
  const effLH = lineH > 0 ? lineH : Math.round(fontSize * 1.9);
  const topPad = margin;
  const SCALE = 2;

  const canvas = document.createElement("canvas");
  canvas.width  = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);

  // ── FIX #8: Realistic paper background — warm cream with slight variation
  // Base: warm off-white, not pure white
  ctx.fillStyle = "#faf8f0";
  ctx.fillRect(0, 0, W, H);

  // Warm gradient for slight uneven aging
  const pg = ctx.createLinearGradient(0, 0, W, H);
  pg.addColorStop(0,   "rgba(250,240,200,0.18)");
  pg.addColorStop(0.4, "rgba(255,250,230,0.08)");
  pg.addColorStop(1,   "rgba(230,220,180,0.14)");
  ctx.fillStyle = pg;
  ctx.fillRect(0, 0, W, H);

  // FIX #8: pixel-level grain texture (deterministic via page-seeded rng)
  const textureRng = mkRng(pageNum * 7919 + 12345);
  applyPaperTexture(ctx, W, H, textureRng);

  // ── Ruled lines / grid
  if (isGrid) {
    ctx.strokeStyle = "rgba(135,180,215,0.38)"; ctx.lineWidth = 0.5;
    for (let y = topPad; y < H-48; y += effLH) { ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke(); }
    for (let x = leftMargin; x < W-28; x += effLH) { ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke(); }
  } else if (lineH > 0) {
    ctx.strokeStyle = "rgba(105,160,210,0.35)"; ctx.lineWidth = 0.55;
    for (let y = topPad; y < H-48; y += effLH) { ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke(); }
  }
  if (hasMarginLine) {
    ctx.strokeStyle = "rgba(215,90,90,0.32)"; ctx.lineWidth = 0.75;
    ctx.beginPath();ctx.moveTo(leftMargin,0);ctx.lineTo(leftMargin,H);ctx.stroke();
  }
  if (holePunch) {
    [120,560,1000].forEach(py => {
      ctx.beginPath();ctx.arc(28,py,11,0,Math.PI*2);
      ctx.fillStyle="#f5f3e8";ctx.fill();
      ctx.strokeStyle="#ccc";ctx.lineWidth=0.8;ctx.stroke();
    });
  }

  // ── Text rendering — character-level
  ctx.textBaseline = "alphabetic";

  // FIX #5: cumulative margin drift state — persists across lines on the page
  // Real writers slowly drift their starting margin over the page
  let marginDriftAccum = 0;

  // FIX #10: per-line vertical jitter state
  // Tracks cumulative vertical position — lines aren't perfectly on ruled lines
  let curY = topPad;

  lines.forEach((sl, li) => {
    if (!sl) return;

    const isHeading  = sl.isHeading;
    const isCentered = sl.isCentered;
    const isRight    = sl.isRight;
    const dispSize   = sl.size || (isHeading ? Math.round(fontSize * 1.18) : fontSize);
    const bold       = sl.bold  !== undefined ? sl.bold   : isHeading;
    const italic     = sl.italic !== undefined ? sl.italic : false;

    // FIX #10: per-line vertical jitter — writer doesn't hit every line perfectly
    // Headings: minimal jitter. Body: ±2–4px random offset
    const lineVertJitter = imperfect
      ? (isHeading ? (textureRng() - 0.5) * 1.5 : (textureRng() - 0.5) * 3.5)
      : 0;
    const lineStep = dispSize > fontSize * 1.05 ? Math.round(effLH * 1.35) : effLH;
    const baseY    = curY + lineVertJitter;
    curY += lineStep;

    if (baseY > H - 48) return;
    if (sl.type === "empty") return;

    const indentPx  = sl.indent || 0;
    const fontStr   = `${italic?"italic ":""}${bold?"bold ":""}${dispSize}px ${fontFamily}`;

    // FIX #5: margin drift — cumulative, small per-line random walk
    // Each line drifts slightly left or right from the previous line's start
    if (imperfect && !isCentered && !isRight) {
      marginDriftAccum += (textureRng() - 0.5) * 2.8; // random walk ±1.4px per line
      marginDriftAccum  = Math.max(-9, Math.min(9, marginDriftAccum)); // clamp total drift
    }

    // Compute line start X
    ctx.font = fontStr;
    let startX;
    if (isCentered) {
      const fullW = ctx.measureText(sl.text.replace(/\s+/g," ")).width;
      startX = Math.max(leftMargin + indentPx, (PW - fullW) / 2);
    } else if (isRight) {
      const fullW = ctx.measureText(sl.text.replace(/\s+/g," ")).width;
      startX = PW - 44 - fullW;
    } else {
      startX = leftMargin + 14 + indentPx + (imperfect ? marginDriftAccum : 0);
    }

    // Create a line-specific rng seeded by page + line index for stable rerenders
    const lineRng = mkRng(pageNum * 9973 + li * 997 + (sl.rawIdx || 0) * 37);

    // Render this line character by character
    renderLineChars(
      ctx, sl, baseY, startX,
      fontStr, dispSize,
      inkColor, inkColorLight,
      imperfect, lineRng
    );
  });

  // ── page number
  ctx.globalAlpha = 0.18;
  ctx.fillStyle   = inkColor;
  ctx.font        = `12px ${fontFamily}`;
  ctx.textAlign   = "center";
  ctx.fillText(`${pageNum} / ${totalPages}`, W/2, H - 18);
  ctx.textAlign   = "left"; // reset

  // ── FIX #1: REMOVE applyScannerFilter entirely.
  // Instead: subtle aged-scan overlay — slight contrast boost without destroying color
  // This simulates a light scan without grayscaling the ink.
  applyAgedScanOverlay(ctx, W, H, textureRng);

  return canvas;
}

/* ─────────────────────────────────────────
   FIX #1: REPLACE applyScannerFilter
   Subtle aged-scan effect: slight contrast + warmth, NO grayscale
   Preserves ink color while adding realism.
───────────────────────────────────────── */
function applyAgedScanOverlay(ctx, W, H, rng) {
  // Only process every 3rd pixel for performance (still looks fine at 2x scale)
  const imgData = ctx.getImageData(0, 0, W, H);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2];
    // Skip very dark pixels (ink) — only process paper (light pixels)
    const lum = 0.3*r + 0.59*g + 0.11*b;
    if (lum < 100) continue; // leave dark ink pixels untouched

    // Warm the paper: push light pixels slightly amber
    d[i]   = Math.min(255, r + 4);   // slight R boost
    d[i+1] = Math.min(255, g + 1);   // tiny G boost
    d[i+2] = Math.max(0,   b - 6);   // reduce B for warmth

    // Micro-contrast: push very light pixels lighter, near-ink pixels darker
    if (lum > 230) {
      d[i] = d[i+1] = d[i+2] = Math.min(255, lum + 3); // brighten near-whites
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

/* ─────────────────────────────────────────
   SHEET COMPONENT
───────────────────────────────────────── */
function Sheet({ lines, paper, font, ink, fontSize, pageNum, totalPages, imperfect }) {
  const wrapRef = useRef(null);
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    // Draw with ink object (has color + colorLight)
    const canvas = drawPage(lines, paper, font.family, ink, fontSize, pageNum, totalPages, imperfect);
    canvas.style.width  = "100%";
    canvas.style.height = "auto";
    canvas.style.display = "block";
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
    wrap.appendChild(canvas);
  }, [lines, paper, font, ink, fontSize, pageNum, totalPages, imperfect]);

  return (
    <div className="rr-sheet">
      <div ref={wrapRef} style={{ width:PW, maxWidth:"100%", background:"#faf8f0", lineHeight:0 }}/>
    </div>
  );
}

/* ─────────────────────────────────────────
   CSS
───────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Outfit:wght@300;400;500;600&display=swap');
:root{
  --bg:#050507;--surf:#0f0f16;--surf2:#13131c;--surf3:#1a1a26;
  --bdr:rgba(255,255,255,0.06);--bdr2:rgba(255,255,255,0.13);
  --lime:#c6f135;--white:#f5f5f7;--grey:#6b6b7a;--grey2:#3a3a48;--red:#ff3c3c;
  --amber:#f5a623;
  --display:'Barlow Condensed',sans-serif;--body:'Outfit',sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0;}
.rr{min-height:100vh;background:var(--bg);color:var(--white);font-family:var(--body);display:flex;flex-direction:column;overflow-x:hidden;}

.rr-nav{position:fixed;top:0;left:0;right:0;z-index:200;display:flex;align-items:center;justify-content:space-between;padding:14px 36px;background:rgba(5,5,7,0.93);backdrop-filter:blur(20px);border-bottom:1px solid var(--bdr);}
.rr-brand{display:flex;align-items:center;gap:8px;cursor:pointer;}
.rr-bos{font-family:var(--display);font-size:15px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--white);}
.rr-bos em{font-style:normal;color:var(--lime);}
.rr-bsep{color:var(--grey2);margin:0 3px;}
.rr-btit{font-family:var(--display);font-size:20px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:var(--white);}
.rr-btit em{font-style:normal;color:var(--lime);}
.rr-badge{font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#050507;background:var(--lime);padding:3px 10px;border-radius:2px;}

.rr-body{display:flex;flex-direction:column;flex:1;padding-top:57px;}

.rr-input-zone{background:var(--surf);border-bottom:1px solid var(--bdr);padding:20px 32px 0;flex-shrink:0;}
.rr-input-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.rr-input-title{font-family:var(--display);font-size:14px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--white);}

.rr-warn{display:flex;align-items:flex-start;gap:10px;background:rgba(245,166,35,0.08);border:1px solid rgba(245,166,35,0.22);border-radius:5px;padding:10px 14px;margin-bottom:12px;}
.rr-warn-icon{font-size:14px;flex-shrink:0;margin-top:1px;}
.rr-warn-text{font-size:11px;line-height:1.65;color:rgba(245,166,35,0.9);}
.rr-warn-text strong{font-weight:600;display:block;margin-bottom:2px;}

.rr-ta{width:100%;height:200px;background:var(--surf2);border:1px solid var(--bdr);border-top-left-radius:6px;border-top-right-radius:6px;border-bottom:none;padding:14px 16px;color:var(--white);font-family:'Courier New',monospace;font-size:13px;line-height:1.7;resize:vertical;transition:border-color .2s;tab-size:4;}
.rr-ta:focus{outline:none;border-color:rgba(198,241,53,.3);}
.rr-ta::placeholder{color:var(--grey2);font-family:var(--body);}

.rr-ta-bar{background:var(--surf3);border:1px solid var(--bdr);border-top:1px solid rgba(255,255,255,0.04);border-bottom-left-radius:6px;border-bottom-right-radius:6px;padding:6px 14px;display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.rr-ta-stats{font-size:10px;color:var(--grey2);letter-spacing:.04em;}
.rr-ta-hint{font-size:10px;color:var(--grey2);letter-spacing:.04em;}

.rr-controls{display:flex;align-items:flex-start;gap:24px;padding:18px 0 20px;flex-wrap:wrap;border-top:1px solid var(--bdr);}
.rr-ctrl-group{display:flex;flex-direction:column;gap:8px;}
.rr-clbl{font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--grey2);}

.rr-ddw{position:relative;min-width:210px;}
.rr-ddt{width:100%;padding:11px 14px;background:var(--surf2);border:1px solid var(--bdr);border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:border-color .2s;}
.rr-ddt:hover,.rr-ddt.open{border-color:rgba(198,241,53,.3);}
.rr-ddi{display:flex;flex-direction:column;gap:1px;text-align:left;flex:1;min-width:0;}
.rr-ddn{font-size:13px;font-weight:500;color:var(--white);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.rr-ddg{font-size:10px;color:var(--grey);}
.rr-dds{font-size:22px;color:var(--lime);line-height:1;flex-shrink:0;}
.rr-dda{color:var(--grey);font-size:9px;flex-shrink:0;transition:transform .2s;}
.rr-dda.open{transform:rotate(180deg);}
.rr-ddm{position:absolute;top:calc(100% + 4px);left:0;right:0;background:#0c0c18;border:1px solid rgba(198,241,53,.18);border-radius:6px;z-index:999;max-height:300px;overflow-y:auto;box-shadow:0 16px 48px rgba(0,0,0,.85);}
.rr-ddm::-webkit-scrollbar{width:3px;}
.rr-ddm::-webkit-scrollbar-thumb{background:rgba(198,241,53,.18);border-radius:2px;}
.rr-ddgh{font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--grey2);padding:9px 13px 4px;border-bottom:1px solid var(--bdr);}
.rr-ddo{width:100%;padding:10px 13px;background:transparent;border:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid rgba(255,255,255,.03);transition:background .15s;}
.rr-ddo:hover{background:rgba(255,255,255,.04);}
.rr-ddo.on{background:rgba(198,241,53,.07);}
.rr-ddon{font-size:12px;font-weight:500;color:var(--white);text-align:left;}
.rr-ddos{font-size:18px;color:var(--lime);line-height:1;flex-shrink:0;}
.rr-ddock{color:var(--lime);font-size:11px;}

.rr-inkr{display:flex;gap:6px;flex-wrap:wrap;}
.rr-inkb{padding:9px 13px;background:var(--surf2);border:1px solid var(--bdr);border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:7px;transition:all .2s;white-space:nowrap;}
.rr-inkb:hover{border-color:var(--bdr2);}
.rr-inkb.on{border-color:var(--lime);background:rgba(198,241,53,.06);}
.rr-inkd{width:14px;height:14px;border-radius:50%;border:2px solid rgba(255,255,255,.14);flex-shrink:0;}
.rr-inkl{font-size:11px;font-weight:500;color:var(--grey);}
.rr-inkb.on .rr-inkl{color:var(--lime);}

.rr-papg{display:flex;gap:6px;flex-wrap:wrap;}
.rr-papb{padding:9px 13px;background:var(--surf2);border:1px solid var(--bdr);border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .2s;white-space:nowrap;}
.rr-papb:hover{border-color:var(--bdr2);}
.rr-papb.on{border-color:var(--lime);background:rgba(198,241,53,.07);}
.rr-papn{font-size:11px;font-weight:500;color:var(--grey);}
.rr-papb.on .rr-papn{color:var(--lime);}

.rr-szr{display:flex;gap:5px;}
.rr-szb{padding:9px 14px;background:var(--surf2);border:1px solid var(--bdr);border-radius:6px;cursor:pointer;font-family:var(--body);font-size:12px;font-weight:600;color:var(--grey);letter-spacing:.06em;transition:all .2s;}
.rr-szb:hover{color:var(--white);}
.rr-szb.on{border-color:var(--lime);color:var(--lime);background:rgba(198,241,53,.07);}

.rr-tog{display:flex;align-items:center;gap:9px;padding:9px 14px;background:var(--surf2);border:1px solid var(--bdr);border-radius:6px;cursor:pointer;transition:all .2s;}
.rr-tog:hover{border-color:var(--bdr2);}
.rr-tog.on{border-color:rgba(198,241,53,.28);background:rgba(198,241,53,.05);}
.rr-togl{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--grey);white-space:nowrap;}
.rr-tog.on .rr-togl{color:var(--lime);}
.rr-togtr{width:32px;height:18px;border-radius:9px;position:relative;flex-shrink:0;transition:background .2s;}
.rr-togth{position:absolute;top:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left .2s;}

.rr-dlb{padding:10px 22px;background:transparent;border:1px solid var(--bdr2);border-radius:6px;font-family:var(--body);font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--grey);cursor:pointer;transition:all .2s;white-space:nowrap;display:flex;align-items:center;gap:7px;}
.rr-dlb:hover{color:var(--white);border-color:rgba(255,255,255,.28);}
.rr-dlb:disabled{opacity:.3;cursor:not-allowed;}

.rr-editor{background:var(--surf);border-top:2px solid rgba(198,241,53,0.15);flex-shrink:0;}
.rr-editor-tabs{display:flex;border-bottom:1px solid var(--bdr);padding:0 32px;gap:4px;}
.rr-tab{padding:10px 18px;font-family:var(--body);font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--grey);background:transparent;border:none;border-bottom:2px solid transparent;margin-bottom:-1px;cursor:pointer;transition:color .2s,border-color .2s;}
.rr-tab:hover{color:var(--white);}
.rr-tab.on{color:var(--lime);border-bottom-color:var(--lime);}
.rr-tab-hint{margin-left:auto;font-size:10px;color:var(--grey2);display:flex;align-items:center;padding:0 0 0 16px;}

.rr-editor-body{padding:14px 32px 18px;display:flex;align-items:flex-start;gap:20px;flex-wrap:wrap;}

.rr-line-table{width:100%;border-collapse:collapse;}
.rr-line-tr{border-bottom:1px solid var(--bdr);}
.rr-line-tr:last-child{border-bottom:none;}
.rr-line-tr:hover .rr-line-num{color:var(--lime);}
.rr-line-num{width:28px;text-align:right;padding:7px 10px 7px 0;font-size:10px;font-weight:600;color:var(--grey2);font-family:'Courier New',monospace;vertical-align:middle;user-select:none;}
.rr-line-text{padding:6px 12px;font-family:'Courier New',monospace;font-size:12px;color:var(--white);vertical-align:middle;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.rr-line-controls{padding:5px 0 5px 8px;display:flex;align-items:center;gap:5px;white-space:nowrap;}
.rr-lsz{padding:3px 7px;background:var(--surf2);border:1px solid var(--bdr);border-radius:4px;font-family:var(--body);font-size:10px;font-weight:600;color:var(--grey);cursor:pointer;transition:all .15s;}
.rr-lsz:hover{color:var(--white);border-color:var(--bdr2);}
.rr-lsz.on{border-color:var(--lime);color:var(--lime);background:rgba(198,241,53,.06);}
.rr-lsty{width:26px;height:26px;background:var(--surf2);border:1px solid var(--bdr);border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--grey);transition:all .15s;font-family:serif;}
.rr-lsty:hover{color:var(--white);border-color:var(--bdr2);}
.rr-lsty.on{border-color:var(--lime);color:var(--lime);background:rgba(198,241,53,.06);}
.rr-lalign{width:26px;height:26px;background:var(--surf2);border:1px solid var(--bdr);border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--grey);transition:all .15s;}
.rr-lalign:hover{color:var(--white);border-color:var(--bdr2);}
.rr-lalign.on{border-color:var(--lime);color:var(--lime);background:rgba(198,241,53,.06);}
.rr-lindent{width:26px;height:26px;background:var(--surf2);border:1px solid var(--bdr);border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--grey);transition:all .15s;}
.rr-lindent:hover{color:var(--white);border-color:var(--bdr2);}

.rr-prev{flex:1;background:#0e0e15;display:flex;flex-direction:column;align-items:center;padding:32px 24px 52px;overflow-y:auto;gap:24px;}
.rr-prevhdr{width:100%;max-width:860px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
.rr-prevtit{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--grey);}
.rr-prevmeta{font-size:10px;color:var(--grey2);}
.rr-sheet{filter:drop-shadow(0 14px 44px rgba(0,0,0,.8));flex-shrink:0;max-width:100%;}
.rr-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;min-height:380px;text-align:center;}
.rr-empty-ico{font-size:44px;opacity:.3;}
.rr-empty-txt{font-size:14px;font-weight:300;color:var(--grey);max-width:280px;line-height:1.7;}
.rr-empty-hint{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--grey2);}

@media(max-width:900px){.rr-controls{gap:12px;}.rr-ddw{min-width:160px;}}
@media(max-width:600px){.rr-input-zone{padding:16px 16px 0;}.rr-prev{padding:16px 8px 40px;}}
`;

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function Riter() {
  const navigate    = useNavigate();
  const [text,      setText]     = useState("");
  const [font,      setFont]     = useState(FONTS[0]);
  const [fontOpen,  setFontOpen] = useState(false);
  const [ink,       setInk]      = useState(INKS[0]);
  const [paper,     setPaper]    = useState(PAPERS[0]);
  const [size,      setSize]     = useState(SIZES[2]);
  const [imper,     setImper]    = useState(true);
  const [pages,     setPages]    = useState([]);
  // FIX #9: two-stage ready — cssReady → fontsReady
  const [cssReady,  setCssReady] = useState(false);
  const [fontReady, setFontReady]= useState(false);
  const [edTab,     setEdTab]    = useState("input");
  const [lineOv,    setLineOv]   = useState({});
  const ddRef = useRef(null);
  const taRef = useRef(null);

  /* inject CSS + load all fonts */
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${FONT_LINK}&display=swap`;
    link.onload = () => setCssReady(true);
    link.onerror = () => setCssReady(true); // continue even on error
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(style);
      try { document.head.removeChild(link); } catch(_){}
    };
  }, []);

  // FIX #9: once CSS is loaded, use document.fonts.load() to guarantee the
  // currently selected font is rendered before first paginate call.
  useEffect(() => {
    if (!cssReady) return;
    setFontReady(false);
    loadFontFamily(font.family).then(() => setFontReady(true));
  }, [cssReady, font]);

  /* close dropdown outside */
  useEffect(() => {
    const fn = e => { if (ddRef.current && !ddRef.current.contains(e.target)) setFontOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  /* live repaginate — only fires when font is confirmed ready */
  useEffect(() => {
    if (!fontReady || !text.trim()) { setPages([]); return; }
    setPages(paginate(text, paper, size.size, font.family, lineOv));
  }, [text, font, ink, paper, size, imper, fontReady, lineOv]);

  const handleText = useCallback((val) => setText(val), []);

  /* PDF export */
  const dlPDF = useCallback(async () => {
    if (!pages.length) return;
    const loadScript = src => new Promise((res,rej)=>{
      if (document.querySelector(`script[src="${src}"]`)){res();return;}
      const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=rej;
      document.head.appendChild(s);
    });
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    const {jsPDF}=window.jspdf;
    const W=PW,H=paper.tall?PH_LEGAL:PH_A4,mm=0.264583;
    const pdf=new jsPDF({orientation:"portrait",unit:"mm",format:[W*mm,H*mm]});
    pages.forEach((ln,i)=>{
      // Pass full ink object to drawPage
      const c=drawPage(ln,paper,font.family,ink,size.size,i+1,pages.length,imper);
      if(i>0)pdf.addPage();
      pdf.addImage(c.toDataURL("image/png"),"PNG",0,0,W*mm,H*mm);
    });
    pdf.save("riter.pdf");
  },[pages,paper,font,ink,size,imper]);

  const wc = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lc = text ? text.split("\n").length : 0;
  const ready = fontReady;

  return (
    <div className="rr">
      <nav className="rr-nav">
        <div className="rr-brand" onClick={() => navigate("/")}>
          <span className="rr-bos">Student<em>OS</em></span>
          <span className="rr-bsep">|</span>
          <span className="rr-btit">Ri<em>ter</em></span>
        </div>
        <span className="rr-badge">Text → Handwriting</span>
      </nav>

      <div className="rr-body">
        {/* ── INPUT ZONE ── */}
        <div className="rr-input-zone">
          <div className="rr-editor-tabs">
            <button className={`rr-tab${edTab==="input"?" on":""}`} onClick={()=>setEdTab("input")}>✍ Input</button>
            <button className={`rr-tab${edTab==="edit"?" on":""}`} onClick={()=>setEdTab("edit")}>
              ✦ Line Editor {Object.keys(lineOv).length > 0 && <span style={{marginLeft:5,color:"var(--lime)",fontSize:10}}>({Object.keys(lineOv).length} edited)</span>}
            </button>
            {Object.keys(lineOv).length > 0 && (
              <button className="rr-tab" style={{color:"var(--red)"}} onClick={()=>setLineOv({})}>✕ Reset edits</button>
            )}
            <span className="rr-tab-hint">
              <span style={{fontSize:10,color:"var(--grey2)"}}>⚠ Space &amp; structure sensitive</span>
            </span>
          </div>

          <div style={{padding:"16px 32px 0"}}>
            {edTab === "input" && (<>
              <div className="rr-warn" style={{marginBottom:10}}>
                <span className="rr-warn-icon">⚠</span>
                <div className="rr-warn-text">
                  <strong>Space & Structure Sensitive</strong>
                  Every space, indent, and blank line is preserved exactly. Use{" "}
                  <code style={{fontFamily:"monospace",background:"rgba(255,255,255,.06)",padding:"0 4px",borderRadius:3}}>## Heading</code>,{" "}
                  <code style={{fontFamily:"monospace",background:"rgba(255,255,255,.06)",padding:"0 4px",borderRadius:3}}>- bullet</code>,{" "}
                  <code style={{fontFamily:"monospace",background:"rgba(255,255,255,.06)",padding:"0 4px",borderRadius:3}}>1. numbered</code>.
                  Blank line = paragraph break.
                </div>
              </div>
              <textarea
                ref={taRef}
                className="rr-ta"
                placeholder={`Type or paste your text...\n\nExamples:\n## Assignment Title\n\nThis is a paragraph.\n\n- Bullet one\n- Bullet two`}
                value={text}
                onChange={e  => handleText(e.target.value)}
                onInput={e   => handleText(e.target.value)}
                onPaste={e   => { setTimeout(() => handleText(e.target.value), 0); }}
                onDrop={e    => { e.preventDefault(); const d=e.dataTransfer.getData("text"); handleText(text + d); }}
                spellCheck={false}
              />
            </>)}

            {edTab === "edit" && (
              <div style={{maxHeight:240,overflowY:"auto",marginBottom:0}}>
                {!text.trim() ? (
                  <div style={{padding:"24px 0",textAlign:"center",color:"var(--grey2)",fontSize:13}}>
                    Add some text in the Input tab first.
                  </div>
                ) : (
                  <table className="rr-line-table">
                    <tbody>
                      {text.split("\n").map((line, idx) => {
                        const ov = lineOv[idx] || {};
                        const setOv = (key, val) => setLineOv(prev => {
                          const next = { ...prev };
                          if (!next[idx]) next[idx] = {};
                          if (val === null || val === undefined) { delete next[idx][key]; }
                          else { next[idx][key] = val; }
                          if (Object.keys(next[idx]).length === 0) delete next[idx];
                          return { ...next };
                        });
                        const lineSizes = [
                          {label:"XS",val:13},{label:"S",val:16},{label:"M",val:20},
                          {label:"L",val:25},{label:"XL",val:31},{label:"XXL",val:38},
                        ];
                        return (
                          <tr key={idx} className="rr-line-tr">
                            <td className="rr-line-num">{idx+1}</td>
                            <td className="rr-line-text" title={line}>{line || <span style={{color:"var(--grey2)",fontStyle:"italic"}}>empty line</span>}</td>
                            <td className="rr-line-controls">
                              {lineSizes.map(s=>(
                                <button key={s.label}
                                  className={`rr-lsz${ov.size===s.val?" on":""}`}
                                  onClick={()=> setOv("size", ov.size===s.val ? null : s.val)}>
                                  {s.label}
                                </button>
                              ))}
                              <button className={`rr-lsty${ov.bold===true?" on":""}`}
                                onClick={()=> setOv("bold", ov.bold===true ? null : true)}><b>B</b></button>
                              <button className={`rr-lsty${ov.italic===true?" on":""}`}
                                onClick={()=> setOv("italic", ov.italic===true ? null : true)}><i>I</i></button>
                              <button className={`rr-lalign${ov.align==="left"||!ov.align?" on":""}`}
                                onClick={()=> setOv("align","left")}>≡</button>
                              <button className={`rr-lalign${ov.align==="center"?" on":""}`}
                                onClick={()=> setOv("align", ov.align==="center"?"left":"center")}>≐</button>
                              <button className={`rr-lalign${ov.align==="right"?" on":""}`}
                                onClick={()=> setOv("align", ov.align==="right"?"left":"right")}>⊐</button>
                              <button className="rr-lindent"
                                onClick={()=> setOv("indent", Math.max(0,(ov.indent||0)-1))}>←</button>
                              <span style={{fontSize:10,color:"var(--grey2)",minWidth:14,textAlign:"center"}}>{ov.indent||0}</span>
                              <button className="rr-lindent"
                                onClick={()=> setOv("indent",(ov.indent||0)+1)}>→</button>
                              {Object.keys(ov).length > 0 && (
                                <button className="rr-lindent" style={{color:"var(--red)",fontSize:11}}
                                  onClick={()=> setLineOv(prev=>{ const n={...prev}; delete n[idx]; return n; })}>✕</button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            <div className="rr-ta-bar" style={{marginTop:0}}>
              <span className="rr-ta-stats">{wc} words · {lc} lines · {text.length} chars</span>
              <span className="rr-ta-hint">
                {pages.length > 0
                  ? `→ ${pages.length} page${pages.length>1?"s":""} · ${Object.keys(lineOv).length} line overrides`
                  : cssReady && !fontReady ? `Loading font: ${font.label}...`
                  : ready ? "Start typing to see preview" : "Loading..."}
              </span>
            </div>
          </div>

          {/* CONTROLS */}
          <div className="rr-controls" style={{padding:"18px 32px 20px"}}>
            {/* Font */}
            <div className="rr-ctrl-group">
              <span className="rr-clbl">Font</span>
              <div className="rr-ddw" ref={ddRef}>
                <button className={`rr-ddt${fontOpen?" open":""}`} onClick={() => setFontOpen(o=>!o)}>
                  <div className="rr-ddi">
                    <span className="rr-ddn">{font.label}</span>
                    <span className="rr-ddg">{font.group}</span>
                  </div>
                  <span className="rr-dds" style={{ fontFamily:font.family }}>Hello</span>
                  <span className={`rr-dda${fontOpen?" open":""}`}>▼</span>
                </button>
                {fontOpen && (
                  <div className="rr-ddm">
                    {FONT_GROUPS.map(grp=>(
                      <div key={grp}>
                        <div className="rr-ddgh">── {grp}</div>
                        {FONTS.filter(f=>f.group===grp).map(f=>(
                          <button key={f.id} className={`rr-ddo${font.id===f.id?" on":""}`}
                            onClick={()=>{setFont(f);setFontOpen(false);}}>
                            <span className="rr-ddon">{f.label}</span>
                            <span className="rr-ddos" style={{fontFamily:f.family}}>Hello</span>
                            {font.id===f.id&&<span className="rr-ddock">✓</span>}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Ink */}
            <div className="rr-ctrl-group">
              <span className="rr-clbl">Ink</span>
              <div className="rr-inkr">
                {INKS.map(k=>(
                  <button key={k.id} className={`rr-inkb${ink.id===k.id?" on":""}`} onClick={()=>setInk(k)}>
                    <div className="rr-inkd" style={{background:k.color}}/>
                    <span className="rr-inkl">{k.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Paper */}
            <div className="rr-ctrl-group">
              <span className="rr-clbl">Paper</span>
              <div className="rr-papg">
                {PAPERS.map(p=>(
                  <button key={p.id} className={`rr-papb${paper.id===p.id?" on":""}`} onClick={()=>setPaper(p)}>
                    <span style={{fontSize:15}}>{p.isGrid?"⊞":p.lineH===0?"□":p.holePunch?"☰":"≡"}</span>
                    <span className="rr-papn">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div className="rr-ctrl-group">
              <span className="rr-clbl">Base Size</span>
              <div className="rr-szr">
                {SIZES.map(s=>(
                  <button key={s.id} className={`rr-szb${size.id===s.id?" on":""}`} onClick={()=>setSize(s)}>{s.label}</button>
                ))}
              </div>
            </div>

            {/* Style */}
            <div className="rr-ctrl-group">
              <span className="rr-clbl">Style</span>
              <div className={`rr-tog${imper?" on":""}`} onClick={()=>setImper(v=>!v)}>
                <span className="rr-togl">Natural</span>
                <div className="rr-togtr" style={{background:imper?"var(--lime)":"var(--grey2)"}}>
                  <div className="rr-togth" style={{left:imper?16:2}}/>
                </div>
              </div>
            </div>

            {/* Export */}
            <div className="rr-ctrl-group">
              <span className="rr-clbl">Export</span>
              <button className="rr-dlb" onClick={dlPDF} disabled={!pages.length}>
                ↓ Download PDF
              </button>
            </div>
          </div>
        </div>

        {/* ── PREVIEW ── */}
        <div className="rr-prev">
          <div className="rr-prevhdr">
            <span className="rr-prevtit">
              {pages.length>0 ? `Preview — ${pages.length} page${pages.length>1?"s":""}` : "Live Preview"}
            </span>
            {pages.length>0&&(
              <span className="rr-prevmeta">{paper.label} · {font.label} · {ink.label}</span>
            )}
          </div>

          {!text.trim() && (
            <div className="rr-empty">
              <div className="rr-empty-ico">✍️</div>
              <div className="rr-empty-txt">Your handwritten pages appear here as you type. Supports headings, bullets, numbered lists, and paragraph breaks.</div>
              <div className="rr-empty-hint">Live · Space Sensitive · Structure Preserved</div>
            </div>
          )}

          {text.trim() && !ready && (
            <div className="rr-empty">
              <div className="rr-empty-txt" style={{color:"var(--lime)"}}>
                {cssReady ? `Loading font: ${font.label}...` : "Loading fonts..."}
              </div>
            </div>
          )}

          {ready && pages.map((ln,i)=>(
            <Sheet
              key={`${i}-${font.id}-${ink.id}-${paper.id}-${size.id}-${imper}-${text.length}-${text.slice(0,40)}-${JSON.stringify(lineOv)}`}
              lines={ln} paper={paper} font={font} ink={ink}
              fontSize={size.size} pageNum={i+1} totalPages={pages.length} imperfect={imper}
            />
          ))}
        </div>
      </div>
    </div>
  );
}