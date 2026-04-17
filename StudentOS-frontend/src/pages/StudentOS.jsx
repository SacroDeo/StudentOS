// File: src/pages/StudentOS.jsx

import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useCallback, useState } from "react";
import { StudentInfoGate, GATE_CSS, STORAGE_KEY } from "../components/StudentInfoGate.jsx";
import greenLogo from "../assets/studentos.png";
import "./StudentOS.css";

/* ─────────────── Icons ─────────────── */
const ArrowRight = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const IconBolt = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c8ff3e" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const IconPen = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
  </svg>
);
const OpenAILogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.843-3.372L15.114 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.07.07 0 0 1 .028-.057l4.83-2.791a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057v-5.583a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 9.47a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"
      fill="#ececec"/>
  </svg>
);

/* ─────────────── Demo data ─────────────── */
const GPT_ROUNDS = [
  { user: "Explain democracy with key features for 3 marks", angry: false, thinkMs: 1800,
    reply: "Democracy is a system of government by the whole population. It involves free elections, protection of rights, rule of law, separation of powers, political equality, and accountability of elected representatives to the public." },
  { user: "That's too long, I only need 3 marks worth...", angry: false, thinkMs: 1600,
    reply: "Sure! Shorter version:\n• Free elections\n• Rule of law\n• Protection of rights\n\nThough I'd recommend expanding each point slightly for full marks." },
  { user: "Now it's too short!! I need proper points not bullets", angry: true, thinkMs: 2000,
    reply: "Apologies! (1) Popular Sovereignty — power rests with citizens. (2) Rule of Law — all are equal before the law. (3) Fundamental Rights — freedoms like speech are protected." },
  { user: "WHY didn't you just do that the first time??", angry: true, thinkMs: 1400,
    reply: "You're right, I should have asked for the mark count upfront. I'll remember that context in future. Anything else to adjust?" },
];
const EX_POINTS = [
  { kw: "Popular Sovereignty",  rest: " — ultimate power rests with citizens through free and fair elections." },
  { kw: "Rule of Law",          rest: " — every citizen, including those in power, is equally bound by the law." },
  { kw: "Fundamental Rights",   rest: " — freedoms like speech and assembly are constitutionally protected." },
  { kw: "Separation of Powers", rest: " — legislature, executive, and judiciary function independently." },
];

const PARTICLES = Array.from({ length: 7 }, (_, i) => ({
  id: i, left: `${8 + i * 12}%`,
  w: i % 3 === 0 ? 2 : 1.5,
  delay: `${-(i * 2.1)}s`,
  dur:   `${13 + (i % 4) * 3}s`,
  drift: `${(i % 2 === 0 ? -1 : 1) * (10 + i * 5)}px`,
}));

/* ─────────────── Clay magnetic button ─────────────── */
function ClayBtn({ className = "", children, onClick }) {
  const ref = useRef(null);
  const onMouseMove = useCallback((e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width  / 2)) * 0.22;
    const dy = (e.clientY - (r.top  + r.height / 2)) * 0.22;
    el.style.transition = "box-shadow .2s, border-color .2s";
    el.style.transform  = `translate(${dx}px,${dy}px) translateY(-3px)`;
  }, []);
  const onMouseLeave = useCallback(() => {
    const el = ref.current; if (!el) return;
    el.style.transition = "transform .55s cubic-bezier(0.34,1.56,0.64,1), box-shadow .25s";
    el.style.transform  = "translate(0,0) translateY(-3px)";
  }, []);
  return (
    <button ref={ref} className={`clay-btn ${className}`} onClick={onClick}
      onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
      {children}
    </button>
  );
}

/* ─────────────── Feature card with spotlight ─────────────── */
function FeatCard({ className = "", children, onClick }) {
  const ref = useRef(null);
  const onMouseMove = useCallback((e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--fx', `${((e.clientX - r.left) / r.width  * 100).toFixed(1)}%`);
    el.style.setProperty('--fy', `${((e.clientY - r.top)  / r.height * 100).toFixed(1)}%`);
  }, []);
  return (
    <div ref={ref} className={className} onMouseMove={onMouseMove} onClick={onClick}>
      <div className="fspot"/>
      {children}
    </div>
  );
}

/* ─────────────── Animated counter ─────────────── */
function Counter({ target, suffix = "", duration = 1800 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const t0 = performance.now();
        const tick = (now) => {
          const t = Math.min((now - t0) / duration, 1);
          const ease = 1 - Math.pow(1 - t, 3);
          setVal(Math.floor(ease * target));
          if (t < 1) requestAnimationFrame(tick); else setVal(target);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

/* ═══════════════════════════════════════════════
   DEMO COMPONENT — ChatGPT vs Examify
═══════════════════════════════════════════════ */
function DemoComparison() {
  const wrapRef    = useRef(null);
  const gptFeedRef = useRef(null);
  const frustRef   = useRef(null);
  const roundRef   = useRef(null);
  const gptTimeRef = useRef(null);
  const exTimeRef  = useRef(null);
  const exDoneRef  = useRef(null);
  const exPillRef  = useRef(null);
  const exOutRef   = useRef(null);
  const exIntroRef = useRef(null);
  const exStatRef  = useRef(null);
  const ptRef0 = useRef(null); const ptRef1 = useRef(null);
  const ptRef2 = useRef(null); const ptRef3 = useRef(null);
  const ptRefs = [ptRef0, ptRef1, ptRef2, ptRef3];
  const started = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        launchAll();
        obs.disconnect();
      }
    }, { threshold: 0.2 });
    if (wrapRef.current) obs.observe(wrapRef.current);
    return () => obs.disconnect();
  }, []);

  const scrollFeed = () => {
    if (gptFeedRef.current) gptFeedRef.current.scrollTop = gptFeedRef.current.scrollHeight;
  };

  const appendUserBubble = (text, angry) => {
    if (!gptFeedRef.current) return;
    const d = document.createElement('div');
    d.className = 'cmp-user-msg' + (angry ? ' angry' : '');
    d.textContent = text;
    gptFeedRef.current.appendChild(d);
    scrollFeed();
    requestAnimationFrame(() => d.classList.add('show'));
  };

  const appendTypingDots = () => {
    if (!gptFeedRef.current) return null;
    const w = document.createElement('div');
    w.className = 'cmp-dots-wrap';
    w.innerHTML = '<div class="cmp-dots"><span></span><span></span><span></span></div>';
    gptFeedRef.current.appendChild(w);
    scrollFeed();
    return w;
  };

  const appendGptReply = (text) => {
    return new Promise((resolve) => {
      if (!gptFeedRef.current) { resolve(); return; }
      const wrap = document.createElement('div');
      wrap.className = 'cmp-gpt-msg-wrap';
      const bub = document.createElement('div');
      bub.className = 'cmp-gpt-bubble';
      const cursor = document.createElement('span');
      cursor.className = 'cmp-cur-g';
      bub.appendChild(cursor);
      wrap.appendChild(bub);
      gptFeedRef.current.appendChild(wrap);
      let i = 0;
      const tick = () => {
        if (i < text.length) {
          bub.insertBefore(document.createTextNode(text[i]), cursor);
          i++;
          scrollFeed();
          setTimeout(tick, 10 + Math.random() * 20);
        } else {
          bub.removeChild(cursor);
          resolve();
        }
      };
      tick();
    });
  };

  const launchGptClock = () => {
    let s = 1680;
    const tick = () => {
      s = Math.max(0, s - 1);
      if (gptTimeRef.current)
        gptTimeRef.current.textContent = `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
      if (s > 0) setTimeout(tick, 1000);
    };
    setTimeout(tick, 1000);
  };

  const launchExamify = () => {
    let s = 0;
    const tick = () => {
      s++;
      if (exTimeRef.current)
        exTimeRef.current.textContent = `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
      if (s < 4) setTimeout(tick, 1000);
      else {
        if (exTimeRef.current) exTimeRef.current.textContent = '00:04';
        if (exDoneRef.current) exDoneRef.current.classList.add('show');
        if (exPillRef.current) exPillRef.current.textContent = 'Complete ✓';
      }
    };
    setTimeout(tick, 400);
    setTimeout(() => { if (exOutRef.current)   exOutRef.current.classList.add('show'); },   500);
    setTimeout(() => { if (exIntroRef.current) exIntroRef.current.classList.add('show'); }, 720);
    ptRefs.forEach((r, i) =>
      setTimeout(() => { if (r.current) r.current.classList.add('show'); }, 920 + i * 270)
    );
    setTimeout(() => { if (exStatRef.current) exStatRef.current.textContent = 'Complete'; }, 920 + 4 * 270);
  };

  const launchGptRounds = async () => {
    await new Promise(r => setTimeout(r, 300));
    for (let idx = 0; idx < GPT_ROUNDS.length; idx++) {
      const round = GPT_ROUNDS[idx];
      appendUserBubble(round.user, round.angry);
      if (roundRef.current) roundRef.current.textContent = `Round ${idx + 1} / ${GPT_ROUNDS.length}`;
      if (frustRef.current) frustRef.current.style.width = `${((idx + 1) / GPT_ROUNDS.length) * 100}%`;
      const dots = appendTypingDots();
      await new Promise(r => setTimeout(r, round.thinkMs));
      if (dots) dots.remove();
      if (idx === GPT_ROUNDS.length - 1 && roundRef.current) {
        roundRef.current.textContent = '4 rounds later...';
        roundRef.current.style.color = '#e87171';
      }
      await appendGptReply(round.reply);
      if (idx < GPT_ROUNDS.length - 1) {
        await new Promise(r => setTimeout(r, 1200));
      }
    }
  };

  const launchAll = () => {
    launchGptClock();
    launchExamify();
    launchGptRounds();
  };

  return (
    <div className="cmp-wrap" ref={wrapRef}>
      <div className="cmp-panel cmp-gpt">
        <div className="cmp-gpt-layout">
          <div className="cmp-sidebar">
            <OpenAILogo/>
            <div style={{ width: 28, height: 1, background: '#2a2a2a', margin: '2px 0' }}/>
            <div style={{ width: 22, height: 22, borderRadius: 4, background: '#2a2a2a', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </div>
          </div>
          <div className="cmp-gpt-body">
            <div className="cmp-gpt-topbar">
              <div className="cmp-gpt-model">
                <div className="cmp-gpt-model-dot"/>
                ChatGPT 4o
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <div className="cmp-frust-track">
              <div className="cmp-frust-fill" ref={frustRef}/>
            </div>
            <div className="cmp-round-lbl" ref={roundRef}>Round 1 / 4</div>
            <div className="cmp-gpt-feed" ref={gptFeedRef}/>
            <div className="cmp-gpt-foot">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#e87171" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span className="cmp-foot-label">Exam time left</span>
              <span className="cmp-gpt-time" ref={gptTimeRef}>28:00</span>
            </div>
          </div>
        </div>
      </div>

      <div className="cmp-panel cmp-ex">
        <div className="cmp-ex-topbar">
          <div className="cmp-ex-brand">
            <div className="cmp-ex-dot"/>
            <div className="cmp-ex-name">Student<em>OS</em></div>
          </div>
          <div className="cmp-ex-pill" ref={exPillRef}>Examify</div>
        </div>
        <div className="cmp-ex-feed">
          <div className="cmp-ex-q">
            <div className="cmp-ex-q-lbl">Your question</div>
            What is Democracy? Explain key features. (3 marks)
            <div className="cmp-ex-tags">
              <span className="cmp-ex-tag">3 marks</span>
              <span className="cmp-ex-tag">Auto-detected</span>
              <span className="cmp-ex-tag">No mnemonic</span>
            </div>
          </div>
          <div className="cmp-ex-out" ref={exOutRef}>
            <div className="cmp-ex-out-hdr">
              <div className="cmp-nd cmp-nd-r"/><div className="cmp-nd cmp-nd-y"/><div className="cmp-nd cmp-nd-g"/>
              <div className="cmp-ex-status" ref={exStatRef}>Generating</div>
            </div>
            <div className="cmp-ex-body">
              <div className="cmp-ex-intro" ref={exIntroRef}>
                Democracy is a system where supreme power is vested in the people and exercised through elected representatives.
                <span className="cmp-cur-l"/>
              </div>
              {EX_POINTS.map((pt, i) => (
                <div className="cmp-ex-pt" key={i} ref={ptRefs[i]}>
                  <span className="cmp-ex-pt-num">{i + 1}.</span>
                  <span>
                    <span className="cmp-ex-pt-kw">{pt.kw}</span>
                    <span className="cmp-ex-pt-rest">{pt.rest}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="cmp-ex-foot">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c8ff3e" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span className="cmp-foot-label">Time taken</span>
          <span className="cmp-ex-time" ref={exTimeRef}>00:00</span>
          <span className="cmp-ex-done" ref={exDoneRef}>✓ Done</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   MAIN PAGE COMPONENT
═══════════════════════════════════ */
export default function StudentOS() {
  const navigate = useNavigate();

  const [studentData, setStudentData] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [showGate, setShowGate]         = useState(false);
  const [pendingRoute, setPendingRoute] = useState(null);

  const handleProtectedNavigation = useCallback((path) => {
    let data = studentData;
    if (!data) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        data = raw ? JSON.parse(raw) : null;
        if (data) setStudentData(data);
      } catch { /* ignore */ }
    }
    if (data) {
      navigate(path);
    } else {
      setPendingRoute(path);
      setShowGate(true);
    }
  }, [studentData, navigate]);

  const handleGateComplete = useCallback((data) => {
    setStudentData(data);
    setShowGate(false);
    setPendingRoute((route) => {
      if (route) navigate(route);
      return null;
    });
  }, [navigate]);

  const handleEditInfo = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setStudentData(null);
  }, []);

  // ── DOM / scroll effect ──
  // FIX: Only inject GATE_CSS here.
  // StudentOS.css is already bundled via `import "./StudentOS.css"` above.
  // The original bug: `styleEl.textContent = CSS + GATE_CSS`
  // `CSS` is an undefined variable — importing a .css file gives you
  // nothing (or a Module object with CSS Modules), NOT a string.
  // Concatenating undefined + string produces "undefinedGATE_CSS..."
  // which corrupts the entire stylesheet and breaks the gate's styles.
  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = GATE_CSS; // ← FIXED: removed the bogus `CSS +`
    document.head.appendChild(styleEl);

    const scrollBar = document.createElement("div");
    scrollBar.id = "scroll-bar";
    document.body.prepend(scrollBar);

    const onScroll = () => {
      const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100;
      scrollBar.style.width = `${pct}%`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); }
      }),
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(".sr").forEach(t => obs.observe(t));

    return () => {
      document.head.removeChild(styleEl);
      if (document.body.contains(scrollBar)) document.body.removeChild(scrollBar);
      window.removeEventListener("scroll", onScroll);
      obs.disconnect();
    };
  }, []);

  return (
    <div>
      {showGate && (
        <StudentInfoGate onComplete={handleGateComplete} />
      )}

      <div className="ns-bg">
        <div className="ns-mesh"/><div className="ns-grid"/>
        <div className="ns-orb ns-orb-1"/><div className="ns-orb ns-orb-2"/>
        {PARTICLES.map(p => (
          <div key={p.id} className="ns-particle" style={{
            left: p.left, width:`${p.w}px`, height:`${p.w}px`,
            animationDuration: p.dur, animationDelay: p.delay, '--drift': p.drift,
          }}/>
        ))}
      </div>

      <nav className="ns-nav">
        <div className="ns-nav-brand" onClick={() => navigate("/")}>
          <img src={greenLogo} alt="StudentOS" className="ns-nav-logo"/>
          <span className="ns-nav-name">Student<em>OS</em></span>
        </div>
        <ul className="ns-nav-links">
          <li onClick={() => handleProtectedNavigation("/examify")}>Examify</li>
          <li onClick={() => handleProtectedNavigation("/handwriting")}>Riter</li>
        </ul>
        <div className="ns-nav-user">
          {studentData && (
            <span className="ns-nav-user-name">
              {studentData.name?.split(" ")[0]?.toUpperCase()}
            </span>
          )}
          {studentData ? (
            <button className="ns-nav-signout" onClick={handleEditInfo}>Edit Info</button>
          ) : (
            <button className="ns-nav-signout" onClick={() => { setPendingRoute(null); setShowGate(true); }}>
              Set Info
            </button>
          )}
        </div>
      </nav>

      <section className="ns-hero">
        <div className="ns-hero-halo"/>
        <div className="ns-chip ns-chip-1"><span>⚡</span><span>Avg. answer</span><span className="ns-chip-val">~4s</span></div>
        <div className="ns-chip ns-chip-2"><span>🎯</span><span>Structured output</span><span className="ns-chip-val">Always</span></div>
        <div className="ns-chip ns-chip-3"><span>⏱</span><span>Time saved</span><span className="ns-chip-val">Daily</span></div>
        <div className="ns-chip ns-chip-4"><span>🧠</span><span>Mnemonics</span><span className="ns-chip-val">Optional</span></div>

        <div className="ns-eyebrow">
          <div className="ns-eyebrow-pulse"/>
          <span className="ns-eyebrow-text"><span className="ns-eyebrow-inner">AI-Powered Academic Toolkit</span></span>
        </div>

        <h1 className="ns-headline">
          <span className="ns-hl1">Get exam answers right,</span>
          <span className="ns-hl2">the first time.</span>
        </h1>

        <p className="ns-sub">Structured, to-the-point answers that actually score marks.</p>

        <div className="ns-hero-actions">
          <ClayBtn className="clay-primary" onClick={() => handleProtectedNavigation("/examify")}>
            Generate Answers <ArrowRight size={13} color="#07070f"/>
          </ClayBtn>
          <ClayBtn className="clay-ghost" onClick={() => handleProtectedNavigation("/handwriting")}>
            Try Handwriting
          </ClayBtn>
        </div>

        <div className="ns-trust">
          <span>Fast</span><span className="ns-trust-sep">·</span>
          <span>Smart</span><span className="ns-trust-sep">·</span>
          <span>Exam Ready</span>
        </div>
      </section>

      <div className="ns-divider">
        <div className="ns-div-line"/>
        <div className="ns-div-glyph"><span>◈</span><div className="ns-div-dot"/><span>◈</span></div>
        <div className="ns-div-line ns-div-line-r"/>
      </div>

      <div className="ns-wrap" style={{ paddingTop: 36, paddingBottom: 72 }}>
        <div className="ns-stats sr">
          <div className="ns-stat">
            <div className="ns-stat-val"><Counter target={4} suffix="s" duration={900}/></div>
            <div className="ns-stat-label">Avg. Answer Time</div>
            <div className="ns-stat-note">From paste to structured output</div>
          </div>
          <div className="ns-stat">
            <div className="ns-stat-val"><Counter target={100} suffix="+" duration={1200}/></div>
            <div className="ns-stat-label">Questions Per Batch</div>
            <div className="ns-stat-note">Bulk mode, any subject</div>
          </div>
          <div className="ns-stat">
            <div className="ns-stat-val"><Counter target={3} suffix=" tools" duration={800}/></div>
            <div className="ns-stat-label">All-in-One Toolkit</div>
            <div className="ns-stat-note">Answers · Handwriting · PDF</div>
          </div>
        </div>
      </div>

      <div className="ns-divider">
        <div className="ns-div-line"/>
        <div className="ns-div-glyph"><span>◈</span><div className="ns-div-dot"/><span>◈</span></div>
        <div className="ns-div-line ns-div-line-r"/>
      </div>

      <section className="ns-wrap">
        <div className="ns-label sr">Why Examify</div>
        <h2 className="ns-title sr sr-d1">ChatGPT vs Examify.</h2>
        <p className="ns-desc sr sr-d2">
          Watch 4 rounds of back-and-forth collapse into one clean, mark-ready answer — in 4 seconds flat.
        </p>
        <div className="sr sr-d3" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <DemoComparison/>
        </div>
      </section>

      <div className="ns-divider">
        <div className="ns-div-line"/>
        <div className="ns-div-glyph"><span>◈</span><div className="ns-div-dot"/><span>◈</span></div>
        <div className="ns-div-line ns-div-line-r"/>
      </div>

      <section className="ns-wrap">
        <div className="ns-label sr">Two Tools</div>
        <h2 className="ns-title sr sr-d1">Everything you need.<br/>Nothing you don't.</h2>
        <p className="ns-desc sr sr-d2">Two focused tools built for one purpose — saving you time on academic work.</p>

        <div className="ns-bento">
          <FeatCard className="ns-feat ns-feat-1 sr sr-d2" onClick={() => handleProtectedNavigation("/examify")}>
            <div className="ns-feat-inner">
              <div className="ns-feat-ico"><IconBolt/></div>
              <div className="ns-feat-badge">01 / Examify</div>
              <div className="ns-feat-name">Answer<br/>Generator</div>
              <p className="ns-feat-desc">Paste any exam question — single, bulk, or from notes. Get a structured, mark-scheme-ready answer with intro, key points, and an optional memory aid. In seconds. Works for any subject, any board.</p>
            </div>
          </FeatCard>

          <FeatCard className="ns-feat ns-feat-2 sr sr-d3" onClick={() => handleProtectedNavigation("/handwriting")}>
            <div className="ns-feat-inner">
              <div className="ns-feat-ico"><IconPen/></div>
              <div className="ns-feat-badge">02 / Riter</div>
              <div className="ns-feat-name">Handwriting AI</div>
              <p className="ns-feat-desc">Type any content, pick a style. Download a realistic handwritten PDF. Submit without writing a word.</p>
            </div>
          </FeatCard>
        </div>
      </section>

      <div className="ns-divider">
        <div className="ns-div-line"/>
        <div className="ns-div-glyph"><span>◈</span><div className="ns-div-dot"/><span>◈</span></div>
        <div className="ns-div-line ns-div-line-r"/>
      </div>

      <section className="ns-cta">
        <div className="ns-cta-aurora"/>
        <div className="ns-cta-wm">STUDENTOS</div>
        <h2 className="ns-cta-h sr">Ready to study<br/><em>smarter?</em></h2>
        <p className="ns-cta-sub sr sr-d1">
          Join students using StudentOS to generate answers, submit assignments, and ace exams — without the busywork.
        </p>
        <ClayBtn className="clay-cta sr sr-d2" onClick={() => handleProtectedNavigation("/examify")}>
          Start Now — It's Free <ArrowRight size={15} color="#07070f"/>
        </ClayBtn>
      </section>

      <footer className="ns-footer">
        <div className="ns-footer-brand" onClick={() => navigate("/")}>
          <img src={greenLogo} alt="StudentOS" className="ns-footer-logo"/>
          <span className="ns-footer-name">Student<em>OS</em></span>
        </div>
        <span className="ns-footer-copy">© 2025 StudentOS — Built for students who move fast</span>
        <div className="ns-footer-links">
          <span onClick={() => handleProtectedNavigation("/examify")}>Examify</span>
          <span onClick={() => handleProtectedNavigation("/handwriting")}>Riter</span>
        </div>
      </footer>
    </div>
  );
}