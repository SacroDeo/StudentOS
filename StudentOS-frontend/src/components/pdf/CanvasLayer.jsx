// src/components/pdf/CanvasLayer.jsx
// Overlay layer per PDF page. Handles drawing, highlights, text boxes, and replace-text.
// All annotation state is managed externally (in PdfViewer) and passed as props.

import { useRef, useEffect, useState, useCallback } from "react";

const HANDLE_SIZE = 7;

// ── helpers ──────────────────────────────────────────────────────────────────
function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function ptInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function resizeHandles(r) {
  const cx = r.x + r.w, cy = r.y + r.h;
  return [
    { id:"se", x: cx, y: cy },
    { id:"e",  x: cx, y: r.y + r.h / 2 },
    { id:"s",  x: r.x + r.w / 2, y: cy },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
export default function CanvasLayer({
  pageIndex,
  width,
  height,
  activeTool,
  color,
  fontSize,
  fontFamily,
  bold,
  align,
  brushSize,
  annotations,           // { strokes, highlights, textBoxes } for this page
  onAnnotationsChange,   // (newAnnotations) => void
}) {
  const svgRef      = useRef();
  const containerRef = useRef();

  // local draw state — not lifted until stroke ends
  const [currentStroke, setCurrentStroke] = useState(null);
  const [currentRect,   setCurrentRect]   = useState(null); // highlight / replace drag

  // text editing state
  const [editingId,  setEditingId]  = useState(null);
  const [dragState,  setDragState]  = useState(null); // { id, type:"move"|"resize", ox, oy, orig }
  const [selected,   setSelected]   = useState(null);

  const isDrawing = useRef(false);

  // ── coordinate helper ─────────────────────────────────────────────────────
  function svgPt(e) {
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width)  * width,
      y: ((clientY - rect.top)  / rect.height) * height,
    };
  }

  // ── pointer down ─────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    if (e.button === 2) return; // right click ignore
    e.preventDefault();

    const { x, y } = svgPt(e);

    // ── check if clicking a text box handle / body (any tool) ────────────
    const tbs = annotations.textBoxes;
    for (let i = tbs.length - 1; i >= 0; i--) {
      const tb = tbs[i];
      const handles = resizeHandles(tb);
      const hit = handles.find(h => Math.abs(h.x - x) < 8 && Math.abs(h.y - y) < 8);
      if (hit) {
        setSelected(tb.id);
        setDragState({ id: tb.id, type:"resize", handle: hit.id, ox: x, oy: y, orig: { ...tb } });
        return;
      }
      if (ptInRect(x, y, tb)) {
        setSelected(tb.id);
        setDragState({ id: tb.id, type:"move", ox: x - tb.x, oy: y - tb.y });
        return;
      }
    }

    setSelected(null);

    if (activeTool === "draw") {
      isDrawing.current = true;
      setCurrentStroke({
        id: uid(), points: [{ x, y }],
        color, size: brushSize,
      });
      return;
    }

    if (activeTool === "highlight" || activeTool === "replace") {
      isDrawing.current = true;
      setCurrentRect({ x0: x, y0: y, x1: x, y1: y });
      return;
    }

    if (activeTool === "text") {
      const newTb = makeTextBox(x, y, fontSize, fontFamily, bold, align, color);
      onAnnotationsChange({
        ...annotations,
        textBoxes: [...annotations.textBoxes, newTb],
      });
      setEditingId(newTb.id);
      setSelected(newTb.id);
    }
  }, [activeTool, annotations, color, brushSize, fontSize, fontFamily, bold, align]);

  // ── pointer move ─────────────────────────────────────────────────────────
  const onPointerMove = useCallback((e) => {
    if (!isDrawing.current && !dragState) return;
    e.preventDefault();
    const { x, y } = svgPt(e);

    if (dragState) {
      const { id, type, ox, oy, orig, handle } = dragState;
      const tbs = annotations.textBoxes.map(tb => {
        if (tb.id !== id) return tb;
        if (type === "move") {
          return { ...tb, x: x - ox, y: y - oy };
        }
        if (type === "resize") {
          const dx = x - ox, dy = y - oy;
          return {
            ...tb,
            w: Math.max(60, orig.w + dx),
            h: Math.max(24, orig.h + dy),
          };
        }
        return tb;
      });
      onAnnotationsChange({ ...annotations, textBoxes: tbs });
      return;
    }

    if (activeTool === "draw" && currentStroke) {
      setCurrentStroke(s => ({ ...s, points: [...s.points, { x, y }] }));
      return;
    }

    if ((activeTool === "highlight" || activeTool === "replace") && currentRect) {
      setCurrentRect(r => ({ ...r, x1: x, y1: y }));
    }
  }, [activeTool, currentStroke, currentRect, dragState, annotations]);

  // ── pointer up ────────────────────────────────────────────────────────────
  const onPointerUp = useCallback((e) => {
    if (dragState) { setDragState(null); return; }
    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (activeTool === "draw" && currentStroke && currentStroke.points.length > 1) {
      onAnnotationsChange({
        ...annotations,
        strokes: [...annotations.strokes, currentStroke],
      });
      setCurrentStroke(null);
      return;
    }

    if ((activeTool === "highlight" || activeTool === "replace") && currentRect) {
      const x = Math.min(currentRect.x0, currentRect.x1);
      const y = Math.min(currentRect.y0, currentRect.y1);
      const w = Math.abs(currentRect.x1 - currentRect.x0);
      const h = Math.abs(currentRect.y1 - currentRect.y0);

      if (w < 4 || h < 4) { setCurrentRect(null); return; }

      if (activeTool === "highlight") {
        onAnnotationsChange({
          ...annotations,
          highlights: [...annotations.highlights, { id: uid(), x, y, w, h }],
        });
      } else {
        // Replace: white cover + textbox on top
        const coverId = uid();
        const newTb   = makeTextBox(x + 2, y + 2, fontSize, fontFamily, bold, align, color, w - 4, h - 4);
        onAnnotationsChange({
          ...annotations,
          covers:    [...(annotations.covers || []), { id: coverId, x, y, w, h }],
          textBoxes: [...annotations.textBoxes, newTb],
        });
        setEditingId(newTb.id);
        setSelected(newTb.id);
      }

      setCurrentRect(null);
    }
  }, [activeTool, currentStroke, currentRect, dragState, annotations, fontSize, fontFamily, bold, align, color]);

  // ── delete selected ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!selected) return;
    const onKey = (e) => {
      if ((e.key === "Delete" || e.key === "Backspace") && editingId === null) {
        onAnnotationsChange({
          ...annotations,
          textBoxes: annotations.textBoxes.filter(tb => tb.id !== selected),
        });
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, editingId, annotations]);

  // ── text change ───────────────────────────────────────────────────────────
  const onTextChange = (id, value) => {
    onAnnotationsChange({
      ...annotations,
      textBoxes: annotations.textBoxes.map(tb => tb.id === id ? { ...tb, text: value } : tb),
    });
  };

  // ── SVG path string ───────────────────────────────────────────────────────
  function strokePath(pts) {
    if (!pts || pts.length < 2) return "";
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  }

  const scaleX = `${(100 / width).toFixed(4)}%`;

  return (
    <div
      ref={containerRef}
      style={{
        position:"absolute", inset:0, userSelect:"none",
        cursor: cursorFor(activeTool),
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <svg
        ref={svgRef}
        width="100%" height="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={{ position:"absolute", inset:0, overflow:"visible" }}
      >
        {/* White covers (replace tool) */}
        {(annotations.covers || []).map(c => (
          <rect key={c.id} x={c.x} y={c.y} width={c.w} height={c.h} fill="white" />
        ))}

        {/* Highlights */}
        {annotations.highlights.map(h => (
          <rect key={h.id} x={h.x} y={h.y} width={h.w} height={h.h}
            fill="rgba(255,230,0,0.38)" stroke="rgba(255,200,0,0.4)" strokeWidth={1} />
        ))}

        {/* Finished strokes */}
        {annotations.strokes.map(s => (
          <path key={s.id} d={strokePath(s.points)}
            stroke={s.color} strokeWidth={s.size}
            fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}

        {/* Current live stroke */}
        {currentStroke && (
          <path d={strokePath(currentStroke.points)}
            stroke={currentStroke.color} strokeWidth={currentStroke.size}
            fill="none" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Current highlight / replace drag preview */}
        {currentRect && (() => {
          const x = Math.min(currentRect.x0, currentRect.x1);
          const y = Math.min(currentRect.y0, currentRect.y1);
          const w = Math.abs(currentRect.x1 - currentRect.x0);
          const h = Math.abs(currentRect.y1 - currentRect.y0);
          return activeTool === "highlight"
            ? <rect x={x} y={y} width={w} height={h} fill="rgba(255,230,0,0.3)" stroke="rgba(255,200,0,0.5)" strokeWidth={1} strokeDasharray="4 2" />
            : <rect x={x} y={y} width={w} height={h} fill="rgba(255,255,255,0.7)" stroke="#c6f135" strokeWidth={1} strokeDasharray="4 2" />;
        })()}

        {/* Resize handles for selected text box */}
        {selected && (() => {
          const tb = annotations.textBoxes.find(t => t.id === selected);
          if (!tb) return null;
          return resizeHandles(tb).map(h => (
            <rect key={h.id}
              x={h.x - HANDLE_SIZE / 2} y={h.y - HANDLE_SIZE / 2}
              width={HANDLE_SIZE} height={HANDLE_SIZE}
              fill="#c6f135" stroke="#050507" strokeWidth={1}
              rx={2} style={{ cursor:"se-resize" }}
            />
          ));
        })()}

        {/* Selection border */}
        {selected && (() => {
          const tb = annotations.textBoxes.find(t => t.id === selected);
          if (!tb) return null;
          return <rect x={tb.x - 1} y={tb.y - 1} width={tb.w + 2} height={tb.h + 2}
            fill="none" stroke="rgba(198,241,53,0.5)" strokeWidth={1} strokeDasharray="4 2" rx={3} />;
        })()}
      </svg>

      {/* Text boxes — rendered as HTML for native editing */}
      {annotations.textBoxes.map(tb => (
        <TextBox
          key={tb.id}
          tb={tb}
          width={width}
          height={height}
          isEditing={editingId === tb.id}
          isSelected={selected === tb.id}
          onActivate={() => { setEditingId(tb.id); setSelected(tb.id); }}
          onBlur={() => setEditingId(null)}
          onChange={v => onTextChange(tb.id, v)}
        />
      ))}
    </div>
  );
}

// ── TextBox sub-component ──────────────────────────────────────────────────
function TextBox({ tb, width, height, isEditing, isSelected, onActivate, onBlur, onChange }) {
  const taRef = useRef();

  useEffect(() => {
    if (isEditing && taRef.current) {
      taRef.current.focus();
      taRef.current.select();
    }
  }, [isEditing]);

  const pctX  = `${((tb.x / width)  * 100).toFixed(3)}%`;
  const pctY  = `${((tb.y / height) * 100).toFixed(3)}%`;
  const pctW  = `${((tb.w / width)  * 100).toFixed(3)}%`;
  const pctH  = `${((tb.h / height) * 100).toFixed(3)}%`;

  const sharedStyle = {
    position:"absolute",
    left: pctX, top: pctY, width: pctW, height: pctH,
    fontFamily: tb.fontFamily,
    fontSize: `${(tb.fontSize / height * 100).toFixed(3)}%`,
    fontWeight: tb.bold ? 700 : 400,
    color: tb.color,
    textAlign: tb.align,
    lineHeight: 1.4,
    background: "transparent",
    border: "none",
    outline: "none",
    resize: "none",
    padding: "2px 4px",
    boxSizing: "border-box",
    pointerEvents: "auto",
    overflow: "hidden",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
  };

  if (isEditing) {
    return (
      <textarea
        ref={taRef}
        value={tb.text}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        onPointerDown={e => e.stopPropagation()}
        style={{ ...sharedStyle, cursor:"text", background: "rgba(198,241,53,0.04)" }}
      />
    );
  }

  return (
    <div
      onDoubleClick={(e) => { e.stopPropagation(); onActivate(); }}
      onPointerDown={(e) => e.stopPropagation()} // let CanvasLayer handle drag
      style={{ ...sharedStyle, cursor:"move", whiteSpace:"pre-wrap" }}
    >
      {tb.text || <span style={{ color:"rgba(198,241,53,0.3)", fontSize:"0.85em" }}>Click to type…</span>}
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────
function makeTextBox(x, y, fontSize, fontFamily, bold, align, color, w = 180, h = 40) {
  return {
    id: uid(), x, y, w, h,
    text: "",
    fontSize, fontFamily, bold, align, color,
  };
}

function cursorFor(tool) {
  if (tool === "draw")      return "crosshair";
  if (tool === "highlight") return "crosshair";
  if (tool === "replace")   return "crosshair";
  if (tool === "text")      return "text";
  return "default";
}