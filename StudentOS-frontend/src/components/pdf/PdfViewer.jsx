// src/components/pdf/PdfViewer.jsx
// Renders all pages of a PDF using pdf.js and overlays CanvasLayer per page.

import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";
import CanvasLayer from "./CanvasLayer";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Scale factor — higher = sharper but slower. 1.8 is good for most screens.
const SCALE = 1.8;

function emptyAnnotations() {
  return { strokes: [], highlights: [], textBoxes: [], covers: [] };
}

export default function PdfViewer({
  file,           // File object
  activeTool,
  color,
  fontSize,
  fontFamily,
  bold,
  align,
  brushSize,
  annotationsRef,     // ref to { [pageIndex]: annotations } — for export access
  clearPageSignal,    // { pageIndex } — triggers clear of that page
  onReady,            // (pdfDoc) => void — called when pdf loaded
}) {
  const [pages, setPages] = useState([]);       // array of { canvas, width, height, index }
  const [annotations, setAnnotations] = useState({}); // pageIndex → annotations
  const [currentPage, setCurrentPage] = useState(0);
  const pdfDocRef = useRef(null);
  const renderingRef = useRef(false);
  const scrollRef = useRef();

  // ── Load PDF ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!file) return;
    setPages([]);
    setAnnotations({});
    setCurrentPage(0);
    renderingRef.current = false;

    let cancelled = false;

    (async () => {
      const arrayBuffer = await file.arrayBuffer();
      if (cancelled) return;
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      if (cancelled) return;

      pdfDocRef.current = pdf;
      onReady?.(pdf);

      const pageCount = pdf.numPages;
      const init = {};
      for (let i = 0; i < pageCount; i++) init[i] = emptyAnnotations();
      setAnnotations(init);

      // Render pages lazily — start with first visible batch
      const rendered = [];
      for (let i = 1; i <= pageCount; i++) {
        if (cancelled) break;
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: SCALE });
        const canvas = document.createElement("canvas");
        canvas.width  = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (cancelled) break;
        rendered.push({
          index:  i - 1,
          canvas,
          width:  viewport.width,
          height: viewport.height,
          dataUrl: canvas.toDataURL("image/png"),
        });
        // Update state progressively
        setPages(p => [...p, rendered[rendered.length - 1]]);
      }
    })();

    return () => { cancelled = true; };
  }, [file]);

  // ── Sync annotations to ref for exporter ─────────────────────────────────
  useEffect(() => {
    if (annotationsRef) annotationsRef.current = annotations;
  }, [annotations]);

  // ── Clear page signal ─────────────────────────────────────────────────────
  useEffect(() => {
    if (clearPageSignal == null) return;
    setAnnotations(prev => ({
      ...prev,
      [clearPageSignal]: emptyAnnotations(),
    }));
  }, [clearPageSignal]);

  // ── Annotation change handler ─────────────────────────────────────────────
  const handleAnnotationsChange = useCallback((pageIndex, newAnno) => {
    setAnnotations(prev => ({ ...prev, [pageIndex]: newAnno }));
  }, []);

  // ── Scroll spy — track current page ──────────────────────────────────────
  const pageRefs = useRef([]);
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(entries => {
      let maxRatio = 0, maxIdx = 0;
      entries.forEach(e => {
        const idx = parseInt(e.target.dataset.pageIndex || "0");
        if (e.intersectionRatio > maxRatio) { maxRatio = e.intersectionRatio; maxIdx = idx; }
      });
      if (maxRatio > 0) setCurrentPage(maxIdx);
    }, { root: container, threshold: [0, 0.25, 0.5, 0.75, 1] });

    pageRefs.current.forEach(el => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [pages.length]);

  if (!file) {
    return (
      <div style={{
        flex:1, display:"flex", alignItems:"center", justifyContent:"center",
        flexDirection:"column", gap:16, color:"#3a3a48",
      }}>
        <div style={{ fontSize:64, opacity:0.3 }}>📄</div>
        <div style={{ fontSize:18, fontWeight:600, color:"#6b6b7a" }}>No PDF loaded</div>
        <div style={{ fontSize:13, color:"#3a3a48" }}>Upload a PDF using the button above</div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      style={{
        flex:1, overflowY:"auto", padding:"24px 0 48px",
        display:"flex", flexDirection:"column", alignItems:"center", gap:16,
      }}
    >
      {/* Page counter badge */}
      {pages.length > 0 && (
        <div style={{
          position:"sticky", top:8, zIndex:10, alignSelf:"flex-end",
          marginRight:20, background:"rgba(10,10,14,0.85)", backdropFilter:"blur(8px)",
          border:"1px solid rgba(255,255,255,0.08)", borderRadius:99,
          padding:"3px 12px", fontSize:11, color:"#6b6b7a",
        }}>
          Page {currentPage + 1} / {pages.length}
        </div>
      )}

      {pages.length === 0 && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, marginTop:48 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{
              width: 595, height: 12, borderRadius:4,
              background:"linear-gradient(90deg,#0f0f16 25%,#13131c 50%,#0f0f16 75%)",
              backgroundSize:"200% 100%",
              animation:"shimmer 1.6s infinite",
              opacity: 1 - i * 0.2,
            }} />
          ))}
          <div style={{ marginTop:8, fontSize:13, color:"#3a3a48" }}>Rendering pages…</div>
        </div>
      )}

      {pages.map(({ index, dataUrl, width, height }) => (
        <div
          key={index}
          data-page-index={index}
          ref={el => pageRefs.current[index] = el}
          style={{
            position:"relative",
            width: Math.min(width, window.innerWidth - 48),
            height: (height / width) * Math.min(width, window.innerWidth - 48),
            boxShadow:"0 8px 48px rgba(0,0,0,0.7)",
            borderRadius:3,
            overflow:"hidden",
            border:"1px solid rgba(255,255,255,0.06)",
            background:"white",
            flexShrink:0,
          }}
        >
          {/* PDF page image */}
          <img
            src={dataUrl}
            alt={`Page ${index + 1}`}
            style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block", pointerEvents:"none" }}
            draggable={false}
          />

          {/* Overlay annotation layer */}
          <CanvasLayer
            pageIndex={index}
            width={width}
            height={height}
            activeTool={activeTool}
            color={color}
            fontSize={fontSize}
            fontFamily={fontFamily}
            bold={bold}
            align={align}
            brushSize={brushSize}
            annotations={annotations[index] || emptyAnnotations()}
            onAnnotationsChange={(anno) => handleAnnotationsChange(index, anno)}
          />
        </div>
      ))}
    </div>
  );
}