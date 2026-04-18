import { useState, useCallback } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

export const STORAGE_KEY = "studentos_student_info";

// ── Firebase config — replace with your project's config ──
const firebaseConfig = {
  apiKey: "AIzaSyCmBpKss5MqZcJqmNstebpiIiaKatRhRWg",
  authDomain: "studentt-os.firebaseapp.com",
  projectId: "studentt-os",
  storageBucket: "studentt-os.firebasestorage.app",
  messagingSenderId: "893388872937",
  appId: "1:893388872937:web:0b2d30bc99903028652478",
  measurementId: "G-ECS0TB15V0"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db  = getFirestore(app);

/* ─────────────────────────────────────────────────────────────
   GATE_CSS — injected at runtime by StudentOS.jsx
───────────────────────────────────────────────────────────── */
export const GATE_CSS = `
.gate-overlay {
  position: fixed; inset: 0; z-index: 8000;
  display: flex; align-items: center; justify-content: center; padding: 24px;
  background: rgba(7,7,15,0.82);
  backdrop-filter: blur(22px) saturate(180%);
  animation: gateIn .35s cubic-bezier(0.16,1,0.3,1) forwards;
}
@keyframes gateIn { from{opacity:0} to{opacity:1} }

.gate-card {
  width: 100%; max-width: 480px;
  background: #0e0e1c;
  border: 1px solid rgba(200,255,62,0.14);
  border-radius: 24px; padding: 44px 40px 40px;
  position: relative;
  box-shadow:
    0 2px 0 1px rgba(200,255,62,0.12),
    0 8px 0 0 rgba(110,140,8,0.25),
    0 24px 60px rgba(0,0,0,0.70),
    0 48px 100px rgba(0,0,0,0.40);
  animation: cardUp .45s cubic-bezier(0.34,1.56,0.64,1) .08s both;
}
@keyframes cardUp {
  from { opacity:0; transform:translateY(36px) scale(0.97); }
  to   { opacity:1; transform:translateY(0) scale(1); }
}
.gate-card::before {
  content:''; position:absolute; top:0; left:0; right:0; height:1px;
  background:linear-gradient(90deg,transparent,rgba(200,255,62,0.35),transparent);
  border-radius:24px 24px 0 0; pointer-events:none;
}
.gate-eyebrow {
  display:flex; align-items:center; gap:8px;
  font-family:'Fira Code',monospace; font-size:9px;
  letter-spacing:.22em; text-transform:uppercase;
  color:#c8ff3e; margin-bottom:14px;
}
.gate-eyebrow-dot {
  width:5px; height:5px; border-radius:50%;
  background:#c8ff3e; box-shadow:0 0 8px #c8ff3e;
  animation:gateDotPulse 2s ease-in-out infinite;
}
@keyframes gateDotPulse {
  0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.2;transform:scale(.5)}
}
.gate-title { font-size:26px; font-weight:900; letter-spacing:-.04em; color:#f0f0fa; margin-bottom:6px; line-height:1.15; }
.gate-title em { font-style:normal; color:#c8ff3e; }
.gate-sub { font-size:13px; font-weight:300; color:rgba(240,240,250,0.45); margin-bottom:30px; line-height:1.65; }

.gate-fields { display:flex; flex-direction:column; gap:14px; margin-bottom:26px; }
.gate-field-wrap { display:flex; flex-direction:column; gap:6px; }
.gate-label {
  font-family:'Fira Code',monospace; font-size:9px;
  letter-spacing:.18em; text-transform:uppercase;
  color:rgba(240,240,250,0.35); padding-left:2px;
}
.gate-input {
  width:100%; padding:13px 16px; border-radius:12px;
  border:1px solid rgba(240,240,250,0.10);
  background:rgba(240,240,250,0.05);
  color:#f0f0fa; font-family:'Epilogue',system-ui,sans-serif;
  font-size:14px; font-weight:400; outline:none;
  transition:border-color .2s,box-shadow .2s,background .2s;
  -webkit-appearance:none; appearance:none;
}
.gate-input::placeholder { color:rgba(240,240,250,0.22); }
.gate-input:focus {
  border-color:rgba(200,255,62,0.40);
  background:rgba(200,255,62,0.04);
  box-shadow:0 0 0 3px rgba(200,255,62,0.08);
}
.gate-input-error { border-color:rgba(248,113,113,0.50)!important; box-shadow:0 0 0 3px rgba(248,113,113,0.10)!important; }
.gate-error-msg {
  font-family:'Fira Code',monospace; font-size:9px; color:#f87171;
  letter-spacing:.06em; padding-left:2px;
  animation:gateErrIn .2s ease forwards;
}
@keyframes gateErrIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }

.gate-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

.gate-submit {
  width:100%; padding:15px 24px; border-radius:14px; border:none; cursor:pointer;
  font-family:'Epilogue',system-ui,sans-serif;
  font-size:15px; font-weight:800; letter-spacing:-.02em; color:#07070f;
  background:linear-gradient(160deg,#d8ff6e 0%,#c8ff3e 100%);
  box-shadow:
    0 2px 0 1px rgba(200,255,62,0.85),
    0 6px 0 0 rgba(130,170,10,0.55),
    0 14px 28px rgba(0,0,0,0.55);
  transform:translateY(-2px);
  transition:transform .22s cubic-bezier(0.34,1.56,0.64,1),box-shadow .22s,opacity .2s;
  display:flex; align-items:center; justify-content:center; gap:10px;
  position:relative; overflow:hidden;
}
.gate-submit::before {
  content:''; position:absolute; top:0;left:0;right:0;height:46%;
  background:linear-gradient(to bottom,rgba(255,255,255,0.26),transparent);
  border-radius:14px 14px 0 0; pointer-events:none;
}
.gate-submit:hover:not(:disabled) {
  transform:translateY(-4px);
  box-shadow:
    0 3px 0 1px rgba(200,255,62,0.90),
    0 10px 0 0 rgba(130,170,10,0.60),
    0 20px 40px rgba(0,0,0,0.60);
}
.gate-submit:active:not(:disabled) {
  transform:translateY(0);
  box-shadow:0 1px 0 1px rgba(200,255,62,0.70),0 3px 0 0 rgba(130,170,10,0.40),0 6px 14px rgba(0,0,0,0.40);
}
.gate-submit:disabled { cursor:not-allowed; opacity:0.75; }

.gate-spinner {
  width:18px; height:18px;
  border:2.5px solid rgba(7,7,15,0.25);
  border-top-color:#07070f;
  border-radius:50%;
  animation:gateSpin .65s linear infinite;
  flex-shrink:0;
}
@keyframes gateSpin { to{transform:rotate(360deg)} }

.gate-card.gate-loading::after {
  content:''; position:absolute; inset:0;
  border-radius:24px; background:rgba(14,14,28,0.35);
  pointer-events:all; z-index:10;
}

.gate-firebase-err {
  margin-top:12px; padding:10px 14px; border-radius:10px;
  background:rgba(248,113,113,0.08); border:1px solid rgba(248,113,113,0.22);
  font-family:'Fira Code',monospace; font-size:10px; color:#f87171;
  letter-spacing:.05em; line-height:1.55;
}

.gate-privacy {
  margin-top:16px; font-family:'Fira Code',monospace;
  font-size:9px; letter-spacing:.09em;
  color:rgba(240,240,250,0.22); text-align:center; line-height:1.6;
}

@media (max-width:520px) {
  .gate-card { padding:32px 22px 28px; }
  .gate-row  { grid-template-columns:1fr; }
}
`;

/* ─────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────── */
export function StudentInfoGate({ onComplete }) {
  const [form, setForm] = useState({ name: "", registerNo: "", section: "", program: "" });
  const [errors, setErrors]       = useState({});
  const [loading, setLoading]     = useState(false);
  const [firebaseErr, setFirebaseErr] = useState("");

  const set = useCallback((key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: "" }));
    setFirebaseErr("");
  }, []);

  const validate = () => {
    const errs = {};
    if (!form.name.trim())       errs.name       = "Please enter your full name";
    if (!form.registerNo.trim()) errs.registerNo = "Please enter your register number";
    if (!form.section.trim())    errs.section    = "Please enter your section";
    if (!form.program.trim())    errs.program    = "Please enter your program";
    return errs;
  };

  const handleSubmit = useCallback(async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setFirebaseErr("");

    const data = {
      name:       form.name.trim(),
      registerNo: form.registerNo.trim(),
      section:    form.section.trim(),
      program:    form.program.trim(),
    };

    try {
      // Save to Firestore under "students" collection
      await addDoc(collection(db, "students"), {
        ...data,
        createdAt: serverTimestamp(),
      });

      // Also persist locally for session continuity
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error("Firestore error:", err);
      setFirebaseErr("Couldn't save to database. Check your Firebase config and try again.");
      setLoading(false);
      return;
    }

    setLoading(false);
    onComplete(data);
  }, [form, onComplete]);

  return (
    <div className="gate-overlay" onMouseDown={e => e.stopPropagation()}>
      <div className={`gate-card${loading ? " gate-loading" : ""}`}>

        <div className="gate-eyebrow">
          <div className="gate-eyebrow-dot"/>
          Quick Setup
        </div>
        <div className="gate-title">
          Welcome to <em>StudentOS</em>
        </div>
        <p className="gate-sub">
          Enter your details so we can personalize answers to your program and section.
        </p>

        <div className="gate-fields">
          {/* Full Name */}
          <div className="gate-field-wrap">
            <label className="gate-label">Full Name</label>
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

          {/* Register No + Section row */}
          <div className="gate-row">
            <div className="gate-field-wrap">
              <label className="gate-label">Register No.</label>
              <input
                className={`gate-input${errors.registerNo ? " gate-input-error" : ""}`}
                placeholder="e.g. 21CSE001"
                value={form.registerNo}
                onChange={e => set("registerNo", e.target.value)}
                disabled={loading}
              />
              {errors.registerNo && <span className="gate-error-msg">{errors.registerNo}</span>}
            </div>

            <div className="gate-field-wrap">
              <label className="gate-label">Section</label>
              <input
                className={`gate-input${errors.section ? " gate-input-error" : ""}`}
                placeholder="e.g. A"
                value={form.section}
                onChange={e => set("section", e.target.value)}
                disabled={loading}
              />
              {errors.section && <span className="gate-error-msg">{errors.section}</span>}
            </div>
          </div>

          {/* Program */}
          <div className="gate-field-wrap">
            <label className="gate-label">Program</label>
            <input
              className={`gate-input${errors.program ? " gate-input-error" : ""}`}
              placeholder="e.g. B.Tech Computer Science"
              value={form.program}
              onChange={e => set("program", e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              disabled={loading}
            />
            {errors.program && <span className="gate-error-msg">{errors.program}</span>}
          </div>
        </div>

        {firebaseErr && <div className="gate-firebase-err">{firebaseErr}</div>}

        <button className="gate-submit" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <span className="gate-spinner"/>
              Saving your profile…
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
          Stored securely in Firebase · Never shared · Used only to format answers
        </p>
      </div>
    </div>
  );
}