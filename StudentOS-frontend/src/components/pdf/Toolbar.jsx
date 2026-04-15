// src/components/pdf/Toolbar.jsx
import { useRef } from "react";

const FONTS = ["Outfit", "Georgia", "Courier New"];

const TOOL_ICONS = {
  text:    { icon: "T",  label: "Text" },
  draw:    { icon: "✏", label: "Draw" },
  highlight: { icon: "▬", label: "Highlight" },
  replace: { icon: "⊡", label: "Replace" },
};

export default function Toolbar({
  activeTool, setActiveTool,
  color, setColor,
  fontSize, setFontSize,
  fontFamily, setFontFamily,
  bold, setBold,
  align, setAlign,
  brushSize, setBrushSize,
  onClearPage,
  onDownload,
  hasFile,
}) {
  const colorRef = useRef();

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 300,
      background: "rgba(10,10,14,0.97)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      backdropFilter: "blur(16px)",
      display: "flex", alignItems: "center", gap: 0,
      height: 52, padding: "0 16px",
      boxShadow: "0 2px 24px rgba(0,0,0,0.5)",
      overflowX: "auto",
    }}>

      {/* Logo */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginRight:20, flexShrink:0 }}>
        <div style={{ width:26, height:26, borderRadius:4, background:"rgba(198,241,53,0.12)", border:"1px solid rgba(198,241,53,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>✎</div>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:15, color:"#f5f5f7", letterSpacing:"0.1em", textTransform:"uppercase", whiteSpace:"nowrap" }}>
          PDF<span style={{ color:"#c6f135" }}>.</span>Editor
        </span>
      </div>

      <Sep />

      {/* Tool Selector */}
      <div style={{ display:"flex", gap:3, flexShrink:0 }}>
        {Object.entries(TOOL_ICONS).map(([key, { icon, label }]) => (
          <ToolBtn
            key={key}
            active={activeTool === key}
            onClick={() => setActiveTool(key)}
            title={label}
          >
            <span style={{ fontSize: key === "text" ? 13 : 14, fontWeight: key === "text" ? 800 : 400 }}>{icon}</span>
            <span style={{ fontSize: 10, marginTop: 1 }}>{label}</span>
          </ToolBtn>
        ))}
      </div>

      <Sep />

      {/* Font controls — only show for text/replace tool */}
      {(activeTool === "text" || activeTool === "replace") && (<>
        <select
          value={fontFamily}
          onChange={e => setFontFamily(e.target.value)}
          style={{
            background:"#13131c", border:"1px solid rgba(255,255,255,0.08)",
            color:"#c2c2cc", borderRadius:6, padding:"4px 8px",
            fontSize:12, fontFamily:"var(--font)", cursor:"pointer",
            height:30, flexShrink:0,
          }}
        >
          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        <div style={{ display:"flex", alignItems:"center", gap:4, marginLeft:6, flexShrink:0 }}>
          <IconBtn title="Decrease size" onClick={() => setFontSize(s => Math.max(8, s - 2))}>−</IconBtn>
          <span style={{ fontSize:12, color:"#c2c2cc", minWidth:24, textAlign:"center" }}>{fontSize}</span>
          <IconBtn title="Increase size" onClick={() => setFontSize(s => Math.min(72, s + 2))}>+</IconBtn>
        </div>

        <IconBtn
          title="Bold"
          active={bold}
          onClick={() => setBold(b => !b)}
          style={{ marginLeft:4, fontWeight:800, fontSize:13 }}
        >B</IconBtn>

        <Sep />

        {/* Alignment */}
        <div style={{ display:"flex", gap:3, flexShrink:0 }}>
          {[["left","⬜ L"],["center","⬜ C"],["right","⬜ R"]].map(([a, lbl]) => (
            <IconBtn key={a} active={align === a} onClick={() => setAlign(a)} title={`Align ${a}`}>
              {a === "left" ? "≡" : a === "center" ? "☰" : "≣"}
            </IconBtn>
          ))}
        </div>

        <Sep />
      </>)}

      {/* Brush size — draw only */}
      {activeTool === "draw" && (
        <>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
            <span style={{ fontSize:10, color:"#6b6b7a", whiteSpace:"nowrap" }}>Brush</span>
            <input
              type="range" min={1} max={24} value={brushSize}
              onChange={e => setBrushSize(Number(e.target.value))}
              style={{ width:72, accentColor:"#c6f135", cursor:"pointer" }}
            />
            <span style={{ fontSize:11, color:"#c2c2cc", minWidth:18 }}>{brushSize}</span>
          </div>
          <Sep />
        </>
      )}

      {/* Color picker — all tools except highlight */}
      {activeTool !== "highlight" && (
        <div
          onClick={() => colorRef.current?.click()}
          title="Color"
          style={{
            width:26, height:26, borderRadius:6, background:color,
            border:"2px solid rgba(255,255,255,0.2)", cursor:"pointer",
            flexShrink:0, position:"relative",
          }}
        >
          <input
            ref={colorRef}
            type="color" value={color}
            onChange={e => setColor(e.target.value)}
            style={{ position:"absolute", opacity:0, width:0, height:0, pointerEvents:"none" }}
          />
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex:1 }} />

      {/* Actions */}
      {hasFile && (
        <>
          <ActionBtn onClick={onClearPage} danger title="Clear all annotations on current page">
            🗑 Clear Page
          </ActionBtn>
          <ActionBtn onClick={onDownload} accent title="Export annotated PDF">
            ↓ Export PDF
          </ActionBtn>
        </>
      )}
    </div>
  );
}

function Sep() {
  return <div style={{ width:1, height:28, background:"rgba(255,255,255,0.07)", margin:"0 10px", flexShrink:0 }} />;
}

function ToolBtn({ active, onClick, children, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: active ? "rgba(198,241,53,0.12)" : "transparent",
        border: active ? "1px solid rgba(198,241,53,0.3)" : "1px solid transparent",
        color: active ? "#c6f135" : "#6b6b7a",
        borderRadius:6, padding:"3px 10px", cursor:"pointer",
        display:"flex", flexDirection:"column", alignItems:"center", gap:0,
        fontFamily:"inherit", transition:"all .15s", height:42,
        justifyContent:"center", minWidth:44,
      }}
    >
      {children}
    </button>
  );
}

function IconBtn({ active, onClick, children, title, style: extraStyle }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: active ? "rgba(198,241,53,0.12)" : "rgba(255,255,255,0.04)",
        border: active ? "1px solid rgba(198,241,53,0.3)" : "1px solid rgba(255,255,255,0.08)",
        color: active ? "#c6f135" : "#9a9aaa",
        borderRadius:5, width:28, height:28, cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"inherit", fontSize:13, transition:"all .15s",
        flexShrink:0, ...extraStyle,
      }}
    >
      {children}
    </button>
  );
}

function ActionBtn({ onClick, children, accent, danger, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: accent ? "#c6f135" : danger ? "rgba(255,60,60,0.08)" : "rgba(255,255,255,0.05)",
        border: accent ? "none" : danger ? "1px solid rgba(255,60,60,0.2)" : "1px solid rgba(255,255,255,0.08)",
        color: accent ? "#050507" : danger ? "#ff3c3c" : "#9a9aaa",
        borderRadius:6, padding:"5px 14px", cursor:"pointer",
        fontFamily:"inherit", fontSize:12, fontWeight: accent ? 700 : 500,
        transition:"all .15s", marginLeft:6, whiteSpace:"nowrap", flexShrink:0,
        height:30,
      }}
    >
      {children}
    </button>
  );
}