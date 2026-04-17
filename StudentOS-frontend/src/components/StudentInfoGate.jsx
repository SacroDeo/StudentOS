// File: src/components/StudentInfoGate.jsx

import { useState, useCallback } from "react";

export const STORAGE_KEY = "studentos_student_info";

/* ─────────────────────────────────────────────────────────────
   GATE_CSS — injected at runtime by StudentOS.jsx
   (only this string is injected; StudentOS.css is bundled normally)
───────────────────────────────────────────────────────────── */
export const GATE_CSS = `
/* ── Gate overlay ── */
.gate-overlay {
  position: fixed;
  inset: 0;
  z-index: 8000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(7, 7, 15, 0.82);
  backdrop-filter: blur(22px) saturate(180%);
  animation: gateIn .35s cubic-bezier(0.16,1,0.3,1) forwards;
}
@keyframes gateIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* ── Gate card ── */
.gate-card {
  width: 100%;
  max-width: 460px;
  background: #0e0e1c;
  border: 1px solid rgba(200,255,62,0.14);
  border-radius: 24px;
  padding: 44px 40px 40px;
  position: relative;
  box-shadow:
    0 2px 0 1px rgba(200,255,62,0.12),
    0 8px 0 0 rgba(110,140,8,0.25),
    0 24px 60px rgba(0,0,0,0.70),
    0 48px 100px rgba(0,0,0,0.40);
  animation: cardUp .45s cubic-bezier(0.34,1.56,0.64,1) .08s both;
}
@keyframes cardUp {
  from { opacity: 0; transform: translateY(36px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}
.gate-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(200,255,62,0.35), transparent);
  border-radius: 24px 24px 0 0;
  pointer-events: none;
}

/* ── Gate header ── */
.gate-eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Fira Code', monospace;
  font-size: 9px;
  letter-spacing: .22em;
  text-transform: uppercase;
  color: #c8ff3e;
  margin-bottom: 14px;
}
.gate-eyebrow-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: #c8ff3e;
  box-shadow: 0 0 8px #c8ff3e;
  animation: gateDotPulse 2s ease-in-out infinite;
}
@keyframes gateDotPulse {
  0%,100% { opacity:1; transform:scale(1);   }
  50%      { opacity:.2; transform:scale(.5); }
}
.gate-title {
  font-size: 26px;
  font-weight: 900;
  letter-spacing: -.04em;
  color: #f0f0fa;
  margin-bottom: 6px;
  line-height: 1.15;
}
.gate-title em {
  font-style: normal;
  color: #c8ff3e;
}
.gate-sub {
  font-size: 13px;
  font-weight: 300;
  color: rgba(240,240,250,0.45);
  margin-bottom: 34px;
  line-height: 1.65;
}

/* ── Fields ── */
.gate-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 26px;
}
.gate-field-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.gate-label {
  font-family: 'Fira Code', monospace;
  font-size: 9px;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: rgba(240,240,250,0.35);
  padding-left: 2px;
}
.gate-input, .gate-select {
  width: 100%;
  padding: 13px 16px;
  border-radius: 12px;
  border: 1px solid rgba(240,240,250,0.10);
  background: rgba(240,240,250,0.05);
  color: #f0f0fa;
  font-family: 'Epilogue', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 400;
  outline: none;
  transition: border-color .2s, box-shadow .2s, background .2s;
  -webkit-appearance: none;
  appearance: none;
}
.gate-input::placeholder { color: rgba(240,240,250,0.22); }
.gate-input:focus,
.gate-select:focus {
  border-color: rgba(200,255,62,0.40);
  background: rgba(200,255,62,0.04);
  box-shadow: 0 0 0 3px rgba(200,255,62,0.08);
}
.gate-select {
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(240,240,250,0.3)' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 38px;
}
.gate-select option {
  background: #0e0e1c;
  color: #f0f0fa;
}
.gate-input-error {
  border-color: rgba(248,113,113,0.50) !important;
  box-shadow: 0 0 0 3px rgba(248,113,113,0.10) !important;
}
.gate-error-msg {
  font-family: 'Fira Code', monospace;
  font-size: 9px;
  color: #f87171;
  letter-spacing: .06em;
  padding-left: 2px;
  animation: gateErrIn .2s ease forwards;
}
@keyframes gateErrIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0);    }
}

/* ── Row layout for two fields ── */
.gate-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* ── Submit button ── */
.gate-submit {
  width: 100%;
  padding: 15px 24px;
  border-radius: 14px;
  border: none;
  cursor: pointer;
  font-family: 'Epilogue', system-ui, sans-serif;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -.02em;
  color: #07070f;
  background: linear-gradient(160deg, #d8ff6e 0%, #c8ff3e 100%);
  box-shadow:
    0 2px 0 1px rgba(200,255,62,0.85),
    0 6px 0 0 rgba(130,170,10,0.55),
    0 14px 28px rgba(0,0,0,0.55);
  transform: translateY(-2px);
  transition: transform .22s cubic-bezier(0.34,1.56,0.64,1), box-shadow .22s, opacity .2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  position: relative;
  overflow: hidden;
}
.gate-submit::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 46%;
  background: linear-gradient(to bottom, rgba(255,255,255,0.26), transparent);
  border-radius: 14px 14px 0 0;
  pointer-events: none;
}
.gate-submit:hover:not(:disabled) {
  transform: translateY(-4px);
  box-shadow:
    0 3px 0 1px rgba(200,255,62,0.90),
    0 10px 0 0 rgba(130,170,10,0.60),
    0 20px 40px rgba(0,0,0,0.60);
}
.gate-submit:active:not(:disabled) {
  transform: translateY(0);
  box-shadow:
    0 1px 0 1px rgba(200,255,62,0.70),
    0 3px 0 0 rgba(130,170,10,0.40),
    0 6px 14px rgba(0,0,0,0.40);
}
.gate-submit:disabled {
  cursor: not-allowed;
  opacity: 0.75;
}

/* ── Spinner ── */
.gate-spinner {
  width: 18px;
  height: 18px;
  border: 2.5px solid rgba(7,7,15,0.25);
  border-top-color: #07070f;
  border-radius: 50%;
  animation: gateSpin .65s linear infinite;
  flex-shrink: 0;
}
@keyframes gateSpin {
  to { transform: rotate(360deg); }
}

/* ── Loading state overlay on card ── */
.gate-card.gate-loading::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 24px;
  background: rgba(14,14,28,0.35);
  pointer-events: all;
  z-index: 10;
}

/* ── Privacy note ── */
.gate-privacy {
  margin-top: 16px;
  font-family: 'Fira Code', monospace;
  font-size: 9px;
  letter-spacing: .09em;
  color: rgba(240,240,250,0.22);
  text-align: center;
  line-height: 1.6;
}

@media (max-width: 520px) {
  .gate-card { padding: 32px 22px 28px; }
  .gate-row  { grid-template-columns: 1fr; }
}
`;

/* ─────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────── */
const BOARDS  = ["CBSE", "ICSE", "IB", "State Board", "Cambridge", "Other"];
const CLASSES = ["8", "9", "10", "11", "12", "Undergraduate", "Other"];

export function StudentInfoGate({ onComplete }) {
  const [form, setForm] = useState({ name: "", class: "", board: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = useCallback((key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: "" }));
  }, []);

  const validate = () => {
    const errs = {};
    if (!form.name.trim())  errs.name  = "Please enter your name";
    if (!form.class)        errs.class = "Select your class";
    if (!form.board)        errs.board = "Select your board";
    return errs;
  };

  const handleSubmit = useCallback(async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);

    // Simulate a brief async save (e.g. future API call)
    await new Promise(r => setTimeout(r, 900));

    const data = { name: form.name.trim(), class: form.class, board: form.board };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }

    setLoading(false);
    onComplete(data);
  }, [form, onComplete]);

  return (
    <div className="gate-overlay" onMouseDown={e => e.stopPropagation()}>
      <div className={`gate-card${loading ? " gate-loading" : ""}`}>

        {/* Header */}
        <div className="gate-eyebrow">
          <div className="gate-eyebrow-dot"/>
          Quick Setup
        </div>
        <div className="gate-title">
          Welcome to <em>StudentOS</em>
        </div>
        <p className="gate-sub">
          Tell us a bit about yourself so we can tailor answers to your board and class.
        </p>

        {/* Fields */}
        <div className="gate-fields">
          {/* Name */}
          <div className="gate-field-wrap">
            <label className="gate-label">Your Name</label>
            <input
              className={`gate-input${errors.name ? " gate-input-error" : ""}`}
              placeholder="e.g. Arjun Mehta"
              value={form.name}
              onChange={e => set("name", e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              disabled={loading}
              autoFocus
            />
            {errors.name && <span className="gate-error-msg">{errors.name}</span>}
          </div>

          {/* Class + Board row */}
          <div className="gate-row">
            <div className="gate-field-wrap">
              <label className="gate-label">Class</label>
              <select
                className={`gate-select${errors.class ? " gate-input-error" : ""}`}
                value={form.class}
                onChange={e => set("class", e.target.value)}
                disabled={loading}
              >
                <option value="">Select</option>
                {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
              </select>
              {errors.class && <span className="gate-error-msg">{errors.class}</span>}
            </div>

            <div className="gate-field-wrap">
              <label className="gate-label">Board</label>
              <select
                className={`gate-select${errors.board ? " gate-input-error" : ""}`}
                value={form.board}
                onChange={e => set("board", e.target.value)}
                disabled={loading}
              >
                <option value="">Select</option>
                {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              {errors.board && <span className="gate-error-msg">{errors.board}</span>}
            </div>
          </div>
        </div>

        {/* Submit */}
        <button className="gate-submit" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <span className="gate-spinner"/>
              Setting up your profile…
            </>
          ) : (
            <>
              Get Started
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="#07070f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </>
          )}
        </button>

        <p className="gate-privacy">
          Your info stays on your device · Never shared · Used only to format answers
        </p>
      </div>
    </div>
  );
}