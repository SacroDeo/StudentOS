// File: src/components/StudentInfoGate.jsx

import { useState, useCallback } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";

const STORAGE_KEY = "studentData";

const FIELDS = [
  { name: "name",           label: "Full Name",       placeholder: "e.g. Arjun Sharma",  type: "text" },
  { name: "registerNumber", label: "Register Number", placeholder: "e.g. 21CS001",       type: "text" },
  { name: "section",        label: "Section",         placeholder: "e.g. A",             type: "text" },
  { name: "programme",      label: "Programme",       placeholder: "e.g. B.Tech CSE",    type: "text" },
];

const GATE_CSS = `
.sig-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: #07070f;
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  font-family: 'Epilogue', system-ui, sans-serif;
}
.sig-overlay::before {
  content: '';
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 60% 50% at 20% 20%, rgba(99,102,241,0.09) 0%, transparent 60%),
    radial-gradient(ellipse 55% 45% at 80% 80%, rgba(200,255,62,0.04) 0%, transparent 55%);
}
.sig-card {
  position: relative; z-index: 1;
  width: 100%; max-width: 440px;
  background: #0b0b16;
  border: 1px solid rgba(240,240,250,0.09);
  border-radius: 24px;
  padding: 40px 36px 36px;
  box-shadow:
    0 1px 0 1px rgba(255,255,255,0.05),
    0 8px 32px rgba(0,0,0,0.55),
    0 24px 64px rgba(0,0,0,0.35);
}
.sig-card::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(200,255,62,0.28), transparent);
  border-radius: 24px 24px 0 0;
}
.sig-logo-row {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 28px;
}
.sig-logo-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #c8ff3e;
  box-shadow: 0 0 8px rgba(200,255,62,0.5);
}
.sig-logo-text {
  font-size: 13px; font-weight: 800; letter-spacing: -0.03em;
  color: #f0f0fa;
}
.sig-logo-text em { font-style: normal; color: #c8ff3e; }
.sig-heading {
  font-size: 22px; font-weight: 900; letter-spacing: -0.04em;
  color: #f0f0fa; line-height: 1.15; margin-bottom: 6px;
}
.sig-sub {
  font-size: 13px; font-weight: 300; color: rgba(240,240,250,0.45);
  line-height: 1.6; margin-bottom: 28px;
}
.sig-field { margin-bottom: 16px; }
.sig-label {
  display: block;
  font-family: 'Fira Code', monospace;
  font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase;
  color: rgba(240,240,250,0.38);
  margin-bottom: 7px;
}
.sig-input {
  width: 100%; padding: 11px 14px;
  background: rgba(240,240,250,0.04);
  border: 1px solid rgba(240,240,250,0.09);
  border-radius: 10px;
  font-family: 'Epilogue', system-ui, sans-serif;
  font-size: 14px; font-weight: 400;
  color: #f0f0fa;
  outline: none;
  transition: border-color 0.18s, background 0.18s;
  -webkit-appearance: none;
}
.sig-input::placeholder { color: rgba(240,240,250,0.22); }
.sig-input:focus {
  border-color: rgba(200,255,62,0.35);
  background: rgba(200,255,62,0.04);
}
.sig-input.error { border-color: rgba(248,113,113,0.45); }
.sig-error {
  font-size: 11px; color: #f87171;
  margin-top: 5px; display: flex; align-items: center; gap: 4px;
}
.sig-submit {
  width: 100%; margin-top: 8px;
  padding: 13px 24px;
  font-family: 'Epilogue', system-ui, sans-serif;
  font-size: 14px; font-weight: 700; letter-spacing: -0.01em;
  border: none; border-radius: 12px; cursor: pointer;
  background: linear-gradient(160deg, #d8ff6e 0%, #c8ff3e 100%);
  color: #07070f;
  box-shadow:
    0 2px 0 1px rgba(200,255,62,0.75),
    0 6px 0 0 rgba(110,140,8,0.45),
    0 14px 28px rgba(0,0,0,0.45);
  transform: translateY(-2px);
  transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1),
              box-shadow 0.2s, opacity 0.2s;
  position: relative; overflow: hidden;
}
.sig-submit::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 46%;
  background: linear-gradient(to bottom, rgba(255,255,255,0.22), transparent);
  border-radius: 12px 12px 0 0; pointer-events: none;
}
.sig-submit:hover:not(:disabled) {
  transform: translateY(-4px);
  box-shadow:
    0 3px 0 1px rgba(200,255,62,0.85),
    0 10px 0 0 rgba(110,140,8,0.55),
    0 22px 40px rgba(0,0,0,0.55);
}
.sig-submit:active:not(:disabled) { transform: translateY(0); }
.sig-submit:disabled {
  opacity: 0.38; cursor: not-allowed; transform: translateY(-2px);
}
.sig-note {
  text-align: center; margin-top: 16px;
  font-family: 'Fira Code', monospace;
  font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase;
  color: rgba(240,240,250,0.2);
}
`;

function StudentInfoGate({ onComplete }) {
  const [values, setValues]   = useState({ name: "", registerNumber: "", section: "", programme: "" });
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const isAllFilled = FIELDS.every(f => values[f.name].trim().length > 0);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleBlur = useCallback((e) => {
    setTouched(prev => ({ ...prev, [e.target.name]: true }));
  }, []);

const handleSubmit = useCallback(async () => {
  if (!isAllFilled) {
    setTouched(FIELDS.reduce((acc, f) => ({ ...acc, [f.name]: true }), {}));
    return;
  }

  const trimmed = Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k, v.trim()])
  );

  try {
    // 🔥 SEND TO FIREBASE
    await addDoc(collection(db, "students"), {
      ...trimmed,
      createdAt: new Date(),
      userAgent: navigator.userAgent,
    });

    // ✅ KEEP LOCAL STORAGE (DON’T REMOVE THIS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));

    setSubmitted(true);
    onComplete(trimmed);

  } catch (err) {
    console.error("Firebase error:", err);
    alert("Error saving data");
  }
}, [isAllFilled, values, onComplete]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter") handleSubmit();
  }, [handleSubmit]);

  if (submitted) return null;

  const showError = (field) => touched[field] && values[field].trim().length === 0;

  return (
    <div className="sig-overlay">
      <div className="sig-card">
        <div className="sig-logo-row">
          <div className="sig-logo-dot"/>
          <span className="sig-logo-text">Student<em>OS</em></span>
        </div>

        <h1 className="sig-heading">Before you begin</h1>
        <p className="sig-sub">
          Enter your details once. They're stored locally and never sent to any server.
        </p>

        {FIELDS.map(({ name, label, placeholder, type }) => (
          <div className="sig-field" key={name}>
            <label className="sig-label" htmlFor={`sig-${name}`}>{label}</label>
            <input
              id={`sig-${name}`}
              className={`sig-input${showError(name) ? " error" : ""}`}
              type={type}
              name={name}
              value={values[name]}
              placeholder={placeholder}
              autoComplete="off"
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
            {showError(name) && (
              <div className="sig-error">↑ This field is required</div>
            )}
          </div>
        ))}

        <button className="sig-submit" onClick={handleSubmit}>
          Continue to StudentOS →
        </button>

        <p className="sig-note">Stored locally · Never uploaded</p>
      </div>
    </div>
  );
}

export { StudentInfoGate, GATE_CSS, STORAGE_KEY };