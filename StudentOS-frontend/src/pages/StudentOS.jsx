// File: src/pages/StudentOS.jsx

import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useCallback, useState } from "react";
import { StudentInfoGate, GATE_CSS, STORAGE_KEY } from "../components/StudentInfoGate.jsx";
import greenLogo from "../assets/studentos.png";

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@200;300;400;500;600;700;800;900&family=Fira+Code:wght@300;400;500&display=swap');

:root {
  --void:        #07070f;
  --void-1:      #0b0b16;
  --void-2:      #10101e;
  --void-3:      #16162a;
  --lime:        #c8ff3e;
  --lime-soft:   #d8ff6e;
  --lime-dim:    rgba(200,255,62,0.12);
  --lime-glow:   rgba(200,255,62,0.28);
  --lime-halo:   rgba(200,255,62,0.06);
  --clay-purple: #a855f7;
  --clay-blue:   #3b82f6;
  --clay-red:    #f87171;
  --clay-cyan:   #22d3ee;
  --white:       #f0f0fa;
  --white-80:    rgba(240,240,250,0.80);
  --white-55:    rgba(240,240,250,0.55);
  --white-30:    rgba(240,240,250,0.30);
  --white-12:    rgba(240,240,250,0.12);
  --white-06:    rgba(240,240,250,0.06);
  --white-03:    rgba(240,240,250,0.03);
  --border:      rgba(240,240,250,0.08);
  --border-hi:   rgba(240,240,250,0.15);
  --sans:        'Epilogue', system-ui, sans-serif;
  --mono:        'Fira Code', 'Courier New', monospace;
  --spring:      cubic-bezier(0.16,1,0.3,1);
  --bounce:      cubic-bezier(0.34,1.56,0.64,1);
  --out:         cubic-bezier(0.22,1,0.36,1);

  --clay-lime:
    0 2px 0 1px rgba(200,255,62,0.85),
    0 6px 0 0px rgba(130,170,10,0.55),
    0 14px 28px rgba(0,0,0,0.55),
    0 28px 56px rgba(0,0,0,0.30);
  --clay-lime-hover:
    0 3px 0 1px rgba(200,255,62,0.90),
    0 10px 0 0px rgba(130,170,10,0.60),
    0 20px 40px rgba(0,0,0,0.60),
    0 36px 70px rgba(0,0,0,0.35);
  --clay-ghost:
    0 2px 0 1px rgba(255,255,255,0.09),
    0 6px 0 0px rgba(80,80,110,0.30),
    0 12px 32px rgba(0,0,0,0.50),
    0 24px 52px rgba(0,0,0,0.28);
  --clay-ghost-hover:
    0 3px 0 1px rgba(255,255,255,0.13),
    0 10px 0 0px rgba(80,80,110,0.38),
    0 18px 44px rgba(0,0,0,0.58),
    0 32px 64px rgba(0,0,0,0.32);
  --card-shadow:
    0 1px 0 1px rgba(255,255,255,0.06),
    0 8px 32px rgba(0,0,0,0.55),
    0 24px 64px rgba(0,0,0,0.32);
  --card-shadow-hover:
    0 1px 0 1px rgba(255,255,255,0.10),
    0 18px 52px rgba(0,0,0,0.72),
    0 36px 84px rgba(0,0,0,0.44);
}

*,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
html { scroll-behavior: smooth; }
body {
  background: var(--void); color: var(--white);
  font-family: var(--sans); -webkit-font-smoothing: antialiased;
  overflow-x: hidden; cursor: default;
}
body::after {
  content: ''; position: fixed; inset: 0; z-index: 9990;
  pointer-events: none;
  background-image: ${NOISE_SVG};
  background-size: 200px 200px;
  opacity: 0.025; mix-blend-mode: overlay;
}
::-webkit-scrollbar { width: 3px; }
::-webkit-scrollbar-track { background: var(--void-1); }
::-webkit-scrollbar-thumb { background: var(--lime-glow); border-radius: 2px; }

#scroll-bar {
  position: fixed; top: 0; left: 0; height: 2px; z-index: 9995;
  background: linear-gradient(90deg, var(--lime), var(--clay-cyan));
  width: 0%; transition: width 0.06s linear;
  box-shadow: 0 0 10px var(--lime-glow);
}

.clay-btn { cursor: pointer; }
.ns-nav-brand, .ns-nav-links li, .ns-nav-pill,
.ns-feat, .ns-footer-links span, .ns-chip { cursor: pointer; }

.ns-bg { position:fixed; inset:0; z-index:0; pointer-events:none; overflow:hidden; }
.ns-mesh {
  position:absolute; inset:0;
  background:
    radial-gradient(ellipse 80% 55% at 15%  8%, rgba(99,102,241,0.11) 0%,transparent 60%),
    radial-gradient(ellipse 60% 50% at 82% 18%, rgba(168,85,247,0.07) 0%,transparent 55%),
    radial-gradient(ellipse 65% 50% at  8% 72%, rgba(200,255,62,0.04) 0%,transparent 55%),
    radial-gradient(ellipse 85% 40% at 50% 100%,rgba(168,85,247,0.04) 0%,transparent 60%);
  animation: meshDrift 26s ease-in-out infinite alternate; will-change:transform;
}
@keyframes meshDrift { 0%{transform:scale(1) rotate(0deg)} 100%{transform:scale(1.05) rotate(1.2deg)} }

.ns-grid {
  position:absolute; inset:0;
  background-image:
    linear-gradient(rgba(240,240,250,0.018) 1px, transparent 1px),
    linear-gradient(90deg, rgba(240,240,250,0.018) 1px, transparent 1px);
  background-size:60px 60px;
  mask-image:radial-gradient(ellipse 88% 72% at 50% 35%, black 0%, transparent 100%);
}

.ns-orb { position:absolute; border-radius:50%; filter:blur(90px); animation:orbPulse ease-in-out infinite; }
.ns-orb-1 { width:600px;height:600px;top:-180px;left:-120px;background:radial-gradient(circle,rgba(99,102,241,0.13) 0%,transparent 70%);animation-duration:19s; }
.ns-orb-2 { width:420px;height:420px;bottom:8%;left:18%;background:radial-gradient(circle,rgba(168,85,247,0.09) 0%,transparent 70%);animation-duration:23s;animation-delay:-6s; }
@keyframes orbPulse { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:0.85;transform:scale(1.08)} }

.ns-particle { position:absolute; border-radius:50%; background:var(--lime); opacity:0; animation:particleRise linear infinite; }
@keyframes particleRise {
  0%{opacity:0;transform:translateY(100vh) translateX(0)}
  8%{opacity:0.35} 92%{opacity:0.10}
  100%{opacity:0;transform:translateY(-30px) translateX(var(--drift,0px))}
}

.ns-nav {
  position:fixed; top:0; left:0; right:0; z-index:500;
  height:66px; display:flex; align-items:center; justify-content:space-between;
  padding:0 52px;
  background:rgba(7,7,15,0.78);
  backdrop-filter:blur(28px) saturate(200%);
  border-bottom:1px solid var(--border);
}
.ns-nav::after {
  content:''; position:absolute; bottom:-1px; left:0; right:0; height:1px;
  background:linear-gradient(90deg,transparent,var(--lime-glow),transparent); opacity:0.5;
}
.ns-nav-brand { display:flex; align-items:center; gap:10px; cursor:pointer; }
.ns-nav-logo  { width:26px; height:26px; object-fit:contain; filter:drop-shadow(0 0 8px var(--lime-glow)); }
.ns-nav-name  { font-size:15px; font-weight:800; letter-spacing:-0.035em; }
.ns-nav-name em { font-style:normal; color:var(--lime); }
.ns-nav-links { display:flex; gap:36px; list-style:none; }
.ns-nav-links li {
  font-size:13px; font-weight:400; color:var(--white-55); cursor:pointer;
  transition:color .2s; position:relative; padding-bottom:3px;
}
.ns-nav-links li::before {
  content:''; position:absolute; bottom:-1px; left:50%; right:50%; height:2px;
  background:var(--lime); border-radius:2px;
  transition:left .3s var(--spring), right .3s var(--spring);
}
.ns-nav-links li:hover { color:var(--white); }
.ns-nav-links li:hover::before { left:0; right:0; }

.ns-nav-pill {
  font-family:var(--sans); font-size:13px; font-weight:700; letter-spacing:-0.01em;
  padding:9px 22px; border-radius:100px; border:none; cursor:pointer;
  background:var(--lime); color:#07070f;
  box-shadow:var(--clay-lime); transform:translateY(-2px);
  transition:transform .2s var(--bounce), box-shadow .2s; position:relative; overflow:hidden;
  will-change:transform;
}
.ns-nav-pill::before {
  content:''; position:absolute; top:0; left:0; right:0; height:48%;
  background:linear-gradient(to bottom,rgba(255,255,255,0.28),transparent);
  border-radius:100px 100px 0 0; pointer-events:none;
}
.ns-nav-pill:hover { transform:translateY(-4px); box-shadow:var(--clay-lime-hover); }
.ns-nav-pill:active { transform:translateY(0); }

.ns-nav-user {
  display:flex; align-items:center; gap:10px;
}
.ns-nav-user-name {
  font-family:var(--mono); font-size:11px; letter-spacing:.08em;
  color:var(--lime); text-transform:uppercase; max-width:140px;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.ns-nav-signout {
  font-family:var(--mono); font-size:10px; letter-spacing:.1em;
  color:var(--white-30); cursor:pointer; text-transform:uppercase;
  padding:5px 12px; border-radius:100px;
  border:1px solid var(--border); background:transparent;
  transition:color .2s, border-color .2s;
}
.ns-nav-signout:hover { color:var(--lime); border-color:rgba(200,255,62,0.35); }

.ns-hero {
  min-height:100vh;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  text-align:center;
  padding:120px 24px 90px;
  position:relative;
  z-index:1;
}

.ns-hero-halo {
  position:absolute; width:780px; height:780px;
  top:50%; left:50%; transform:translate(-50%,-54%); pointer-events:none;
  background:radial-gradient(ellipse at 50% 50%,rgba(200,255,62,0.032) 0%,rgba(99,102,241,0.022) 35%,transparent 70%);
  animation:haloBreath 10s ease-in-out infinite;
}
@keyframes haloBreath { 0%,100%{transform:translate(-50%,-54%) scale(1);opacity:.6} 50%{transform:translate(-50%,-54%) scale(1.10);opacity:0.9} }

.ns-eyebrow {
  display:inline-flex; align-items:center; gap:9px;
  font-family:var(--mono); font-size:10px; font-weight:400;
  letter-spacing:0.2em; text-transform:uppercase;
  color:var(--lime); padding:7px 18px; border-radius:100px;
  background:rgba(200,255,62,0.09); border:1px solid rgba(200,255,62,0.24);
  margin-bottom:38px; position:relative; z-index:1;
  opacity:0; animation:fadeUp .7s var(--spring) .06s forwards;
  box-shadow:0 0 0 5px rgba(200,255,62,0.03), var(--clay-ghost);
}
.ns-eyebrow-pulse {
  width:5px; height:5px; border-radius:50%; background:var(--lime);
  box-shadow:0 0 8px var(--lime); flex-shrink:0;
  animation:dotPulse 2s ease-in-out infinite;
}
@keyframes dotPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.25;transform:scale(.5)} }

.ns-eyebrow-text { overflow:hidden; display:inline-block; }
.ns-eyebrow-inner { display:inline-block; white-space:nowrap; overflow:hidden; width:0; animation:typeIn 1.4s steps(28,end) .5s forwards; }
@keyframes typeIn { from{width:0} to{width:100%} }

.ns-headline {
  font-size:clamp(54px,9.2vw,122px); font-weight:900;
  letter-spacing:-0.056em; line-height: 1.05; padding-top: 10px;
  margin-bottom:30px; position:relative; z-index:10; max-width:960px;
  opacity:0; animation:fadeUp .88s var(--spring) .22s forwards;
}
.ns-hl1 {
  display:block; color:var(--white);
  margin-bottom: 8px;
  text-shadow: 0 2px 6px rgba(0,0,0,0.4);
}
.ns-hl2 {
  display:block; position:relative;
  background:linear-gradient(135deg,#c8ff3e 0%,#e8ff80 45%,#a8e800 100%);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  filter: drop-shadow(0 0 16px rgba(200,255,62,0.18));
}

.ns-sub {
  font-size:17px; font-weight:300; line-height:1.78; letter-spacing:.005em;
  color:var(--white-55); max-width:450px; margin-bottom:52px;
  position:relative; z-index:1;
  opacity:0; animation:fadeUp .88s var(--spring) .36s forwards;
}
.ns-sub strong { color:var(--white-80); font-weight:600; }

.ns-hero-actions {
  display:flex; align-items:center; gap:14px; flex-wrap:wrap; justify-content:center;
  margin-bottom:20px; position:relative; z-index:1;
  opacity:0; animation:fadeUp .88s var(--spring) .50s forwards;
}

.ns-trust {
  display:flex; align-items:center;
  font-family:var(--mono); font-size:9px; letter-spacing:.18em; text-transform:uppercase;
  color:var(--white-30); position:relative; z-index:1;
  opacity:0; animation:fadeUp .88s var(--spring) .63s forwards;
  margin-top:8px;
}
.ns-trust span { padding:0 13px; }
.ns-trust-sep  { color:var(--white-12); font-size:18px; }

@keyframes fadeUp { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }

.ns-chip {
  position:absolute; display:flex; align-items:center; gap:9px;
  padding:9px 14px; border-radius:14px; cursor:pointer;
  background:rgba(11,11,22,0.72); border:1px solid var(--border);
  backdrop-filter:blur(16px);
  font-size:11px; font-weight:500; color:var(--white-30);
  animation:chipFloat ease-in-out infinite;
  box-shadow:var(--card-shadow); opacity:0.55; transition:opacity .3s;
}
.ns-chip:hover { opacity:0.85; }
.ns-chip::before {
  content:''; position:absolute; top:0; left:0; right:0; height:48%;
  background:linear-gradient(to bottom,rgba(255,255,255,0.04),transparent);
  border-radius:14px 14px 0 0; pointer-events:none;
}
.ns-chip-val { font-family:var(--mono); color:var(--lime); font-size:12px; letter-spacing:.02em; }
.ns-chip-1 { top:24%;left:5%;   animation-duration:7s;  animation-delay:0s; }
.ns-chip-2 { top:34%;right:4%;  animation-duration:9s;  animation-delay:-3s; }
.ns-chip-3 { bottom:28%;left:6%;animation-duration:8s;  animation-delay:-5s; }
.ns-chip-4 { bottom:22%;right:5%;animation-duration:6.5s;animation-delay:-2s; }
@keyframes chipFloat { 0%,100%{transform:translateY(0) rotate(-.2deg)} 50%{transform:translateY(-9px) rotate(.2deg)} }

.clay-btn {
  position:relative; display:inline-flex; align-items:center; gap:9px;
  cursor:pointer; border:none; font-family:var(--sans);
  will-change:transform; border-radius:14px; overflow:hidden;
  transition:transform .22s var(--bounce), box-shadow .22s;
}
.clay-btn::before {
  content:''; position:absolute; top:0; left:0; right:0; height:46%;
  background:linear-gradient(to bottom,rgba(255,255,255,0.22),transparent);
  border-radius:14px 14px 0 0; pointer-events:none; z-index:2;
}
.clay-primary {
  font-size:14px; font-weight:700; letter-spacing:-.01em; padding:15px 32px;
  background:linear-gradient(160deg,var(--lime-soft) 0%,var(--lime) 100%);
  color:#07070f; box-shadow:var(--clay-lime); transform:translateY(-3px);
}
.clay-primary:hover { transform:translateY(-5px); box-shadow:var(--clay-lime-hover); }
.clay-primary:active { transform:translateY(0); }

.clay-ghost {
  font-size:14px; font-weight:600; letter-spacing:-.01em; padding:15px 32px;
  background:rgba(240,240,250,0.08); color:var(--white-80);
  border:1px solid rgba(240,240,250,0.13) !important;
  box-shadow:var(--clay-ghost); transform:translateY(-2px);
}
.clay-ghost::before { background:linear-gradient(to bottom,rgba(255,255,255,0.07),transparent); }
.clay-ghost:hover { transform:translateY(-4px); box-shadow:var(--clay-ghost-hover); background:rgba(240,240,250,0.12); }
.clay-ghost:active { transform:translateY(0); }

.clay-cta {
  font-size:16px; font-weight:800; letter-spacing:-.025em; padding:18px 44px;
  border-radius:18px;
  background:linear-gradient(160deg,var(--lime-soft) 0%,var(--lime) 100%);
  color:#07070f; box-shadow:var(--clay-lime); transform:translateY(-3px);
}
.clay-cta::before { border-radius:18px 18px 0 0; }
.clay-cta:hover { transform:translateY(-6px); box-shadow:0 3px 0 1px rgba(200,255,62,.9),0 12px 0 0 rgba(130,170,10,.6),0 24px 44px rgba(0,0,0,.6),0 40px 80px rgba(0,0,0,.35); }
.clay-cta:active { transform:translateY(0); }

.ns-divider {
  display:flex; align-items:center; justify-content:center; gap:12px;
  padding:0 24px; height:56px; position:relative; z-index:1;
}
.ns-div-line  { flex:1; max-width:200px; height:1px; background:linear-gradient(90deg,transparent,var(--border-hi)); }
.ns-div-line-r{ background:linear-gradient(90deg,var(--border-hi),transparent); }
.ns-div-glyph { font-family:var(--mono); font-size:11px; letter-spacing:.14em; color:var(--white-30); display:flex; align-items:center; gap:8px; }
.ns-div-dot   { width:4px; height:4px; border-radius:50%; background:var(--lime); box-shadow:0 0 6px var(--lime); animation:dotPulse 2.4s ease-in-out infinite; }

.ns-wrap { padding:100px 24px 120px; display:flex; flex-direction:column; align-items:center; position:relative; z-index:1; }

.ns-label {
  font-family:var(--mono); font-size:9px; letter-spacing:.22em; text-transform:uppercase;
  color:var(--lime); margin-bottom:16px; display:flex; align-items:center; gap:12px;
}
.ns-label::before,.ns-label::after { content:''; height:1px; width:30px; background:linear-gradient(90deg,transparent,var(--lime-glow)); }
.ns-label::after { background:linear-gradient(90deg,var(--lime-glow),transparent); }
.ns-title { font-size:clamp(30px,4.8vw,58px); font-weight:900; letter-spacing:-.044em; line-height:1.05; color:var(--white); margin-bottom:18px; text-align:center; }
.ns-desc  { font-size:15px; font-weight:300; color:var(--white-55); line-height:1.78; max-width:440px; text-align:center; margin-bottom:72px; letter-spacing:.005em; }

.sr { opacity:0; transform:translateY(40px); transition:opacity .8s var(--out),transform .8s var(--out); }
.sr.in { opacity:1; transform:translateY(0); }
.sr-d1{transition-delay:.1s} .sr-d2{transition-delay:.2s} .sr-d3{transition-delay:.3s}
.sr-d4{transition-delay:.4s} .sr-d5{transition-delay:.5s}

.ns-stats {
  display:grid; grid-template-columns:repeat(3,1fr);
  max-width:820px; width:100%; gap:20px;
}
.ns-stat {
  padding:32px 28px; border-radius:20px; text-align:center;
  background:rgba(11,11,22,0.78); border:1px solid var(--border);
  backdrop-filter:blur(20px); position:relative; overflow:hidden;
  box-shadow:var(--card-shadow);
  transition:transform .38s var(--bounce), box-shadow .35s;
  will-change:transform; transform:translateY(-2px);
}
.ns-stat::before {
  content:''; position:absolute; top:0; left:0; right:0; height:40%;
  background:linear-gradient(to bottom,rgba(255,255,255,0.05),transparent);
  border-radius:20px 20px 0 0; pointer-events:none;
}
.ns-stat:hover { transform:translateY(-7px); box-shadow:var(--card-shadow-hover); }
.ns-stat-val {
  font-size:42px; font-weight:900; letter-spacing:-.04em; color:var(--lime);
  line-height:1; margin-bottom:8px; font-variant-numeric:tabular-nums;
  text-shadow:0 0 24px rgba(200,255,62,.3);
}
.ns-stat-label { font-family:var(--mono); font-size:10px; letter-spacing:.16em; text-transform:uppercase; color:var(--white-30); margin-bottom:6px; }
.ns-stat-note  { font-size:11px; color:var(--white-30); line-height:1.5; margin-top:8px; font-weight:300; }

.cmp-wrap {
  display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr);
  gap:20px; max-width:1040px; width:100%;
}
.cmp-panel {
  border-radius:20px; overflow:hidden;
  display:flex; flex-direction:column; height:580px;
  box-shadow:var(--card-shadow);
}
.cmp-gpt { background:#212121; border:1px solid #2a2a2a; }
.cmp-ex  { background:#0b0b16; border:1px solid rgba(200,255,62,0.12); }

.cmp-gpt-layout { display:flex; height:100%; }
.cmp-sidebar {
  width:52px; flex-shrink:0; background:#171717; border-right:1px solid #2a2a2a;
  display:flex; flex-direction:column; align-items:center; padding:12px 0; gap:10px;
}
.cmp-gpt-body { flex:1; display:flex; flex-direction:column; min-width:0; }
.cmp-gpt-topbar {
  display:flex; align-items:center; justify-content:space-between;
  padding:10px 14px; border-bottom:1px solid #2a2a2a; background:#212121; flex-shrink:0;
}
.cmp-gpt-model { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:#ececec; font-family:var(--sans); }
.cmp-gpt-model-dot { width:7px; height:7px; border-radius:50%; background:#19c37d; }
.cmp-frust-track { height:3px; background:#2a2a2a; flex-shrink:0; }
.cmp-frust-fill  { height:100%; background:#e87171; width:0%; transition:width .8s ease; }
.cmp-round-lbl {
  font-size:9px; color:#555; font-family:var(--mono);
  letter-spacing:.1em; padding:3px 14px; text-align:right; flex-shrink:0;
}
.cmp-gpt-feed {
  flex:1; overflow-y:auto; padding:12px;
  display:flex; flex-direction:column; gap:9px;
  scrollbar-width:thin; scrollbar-color:#333 transparent;
}
.cmp-gpt-feed::-webkit-scrollbar { width:3px; }
.cmp-gpt-feed::-webkit-scrollbar-thumb { background:#444; border-radius:2px; }

.cmp-user-msg {
  align-self: flex-end;
  max-width: 84%;
  background: #2a2a2a;
  color: #e5e5e5;
  padding: 9px 13px;
  border-radius: 18px 18px 4px 18px;
  font-size: 12px;
  line-height: 1.5;
  font-family: var(--sans);
  opacity: 0;
  transform: translateY(6px);
  transition: opacity .3s, transform .3s;
}
.cmp-user-msg.show { opacity:1; transform:none; }

.cmp-gpt-msg-wrap {
  display: block;
  margin-bottom: 10px;
}
.cmp-gpt-bubble {
  max-width: 90%;
  color: #d1d1d1;
  font-size: 13px;
  line-height: 1.7;
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
  white-space: pre-line;
  font-family: var(--sans);
}
.cmp-dots-wrap { align-self:flex-start; }
.cmp-dots {
  display:inline-flex; gap:4px; padding:7px 11px;
  background:#2a2a2a; border-radius:12px;
}
.cmp-dots span {
  width:5px; height:5px; border-radius:50%; background:#555;
  animation:cmpDot 1.2s ease-in-out infinite;
}
.cmp-dots span:nth-child(2){animation-delay:.2s}
.cmp-dots span:nth-child(3){animation-delay:.4s}
@keyframes cmpDot{0%,80%,100%{transform:scale(.6);opacity:.35}40%{transform:scale(1);opacity:1}}

.cmp-gpt-foot {
  display:flex; align-items:center; gap:7px;
  padding:7px 14px; background:#1a1a1a;
  border-top:1px solid #2a2a2a; flex-shrink:0;
}
.cmp-foot-label { font-size:10px; color:#555; font-family:var(--mono); letter-spacing:.05em; }
.cmp-gpt-time { font-size:13px; font-weight:800; font-family:var(--mono); color:#e87171; letter-spacing:.08em; }

.cmp-ex-topbar {
  display:flex; align-items:center; justify-content:space-between;
  padding:10px 14px; border-bottom:1px solid rgba(200,255,62,0.1);
  background:#0e0e1c; flex-shrink:0;
}
.cmp-ex-brand { display:flex; align-items:center; gap:7px; }
.cmp-ex-dot { width:7px; height:7px; border-radius:50%; background:#c8ff3e; }
.cmp-ex-name { font-size:13px; font-weight:800; color:#f0f0fa; letter-spacing:-.02em; font-family:var(--sans); }
.cmp-ex-name em { font-style:normal; color:#c8ff3e; }
.cmp-ex-pill {
  font-size:9px; font-family:var(--mono); letter-spacing:.12em;
  text-transform:uppercase; color:#07070f; background:#c8ff3e;
  padding:3px 9px; border-radius:100px;
}
.cmp-ex-feed {
  flex:1; overflow-y:auto; padding:12px;
  display:flex; flex-direction:column; gap:10px;
  scrollbar-width:thin; scrollbar-color:rgba(200,255,62,.15) transparent;
}
.cmp-ex-feed::-webkit-scrollbar { width:3px; }
.cmp-ex-feed::-webkit-scrollbar-thumb { background:rgba(200,255,62,.2); border-radius:2px; }

.cmp-ex-q {
  background:rgba(240,240,250,.04); border:1px solid rgba(240,240,250,.09);
  border-radius:12px; padding:10px 12px; font-size:12px; color:#a0a0bc; line-height:1.5;
  font-family:var(--sans);
}
.cmp-ex-q-lbl {
  font-size:9px; font-family:var(--mono); letter-spacing:.16em; text-transform:uppercase;
  color:#c8ff3e; margin-bottom:5px; display:flex; align-items:center; gap:4px;
}
.cmp-ex-q-lbl::before { content:"▸"; }
.cmp-ex-tags { display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; }
.cmp-ex-tag {
  font-size:9px; font-family:var(--mono); padding:3px 8px; border-radius:100px;
  border:1px solid rgba(200,255,62,.22); color:#c8ff3e; background:rgba(200,255,62,.07);
}
.cmp-ex-out {
  background:rgba(11,11,22,.7); border:1px solid rgba(200,255,62,.1);
  border-radius:12px; overflow:hidden;
  opacity:0; transform:translateY(6px); transition:opacity .3s,transform .3s;
}
.cmp-ex-out.show { opacity:1; transform:none; }
.cmp-ex-out-hdr {
  display:flex; align-items:center; gap:5px; padding:8px 12px;
  border-bottom:1px solid rgba(240,240,250,.06); background:rgba(255,255,255,.02);
}
.cmp-nd { width:7px; height:7px; border-radius:50%; }
.cmp-nd-r{background:#ff5f57} .cmp-nd-y{background:#febc2e} .cmp-nd-g{background:#28c840}
.cmp-ex-status {
  font-size:9px; font-family:var(--mono); letter-spacing:.14em; text-transform:uppercase;
  color:#07070f; background:#c8ff3e; padding:2px 8px; border-radius:100px; margin-left:auto;
}
.cmp-ex-body { padding:12px; display:flex; flex-direction:column; gap:8px; }
.cmp-ex-intro {
  font-size:12px; color:#b8b8d0; line-height:1.6; font-family:var(--sans);
  padding-bottom:8px; border-bottom:1px solid rgba(240,240,250,.07);
  opacity:0; transition:opacity .35s;
}
.cmp-ex-intro.show { opacity:1; }
.cmp-ex-pt {
  display:flex; gap:8px; font-size:12px; line-height:1.55; font-family:var(--sans);
  opacity:0; transform:translateY(4px); transition:opacity .3s,transform .3s;
}
.cmp-ex-pt.show { opacity:1; transform:none; }
.cmp-ex-pt-num  { font-family:var(--mono); font-size:10px; color:#c8ff3e; flex-shrink:0; padding-top:1px; }
.cmp-ex-pt-kw   { font-weight:700; color:#f0f0fa; }
.cmp-ex-pt-rest { color:#6868a0; }

.cmp-ex-foot {
  display:flex; align-items:center; gap:7px;
  padding:7px 14px; background:rgba(200,255,62,.04);
  border-top:1px solid rgba(200,255,62,.08); flex-shrink:0;
}
.cmp-ex-time { font-size:13px; font-weight:800; font-family:var(--mono); color:#c8ff3e; letter-spacing:.08em; }
.cmp-ex-done { font-size:9px; font-family:var(--mono); color:#c8ff3e; opacity:0; transition:opacity .4s; margin-left:auto; }
.cmp-ex-done.show { opacity:1; }

.cmp-cur-g { display:inline-block; width:1.5px; height:11px; background:#19c37d; margin-left:2px; vertical-align:middle; animation:cmpBlink .8s ease-in-out infinite; }
.cmp-cur-l { display:inline-block; width:1.5px; height:11px; background:#c8ff3e;  margin-left:2px; vertical-align:middle; animation:cmpBlink .8s ease-in-out infinite; }
@keyframes cmpBlink{0%,100%{opacity:1}50%{opacity:0}}

.ns-bento {
  display:grid; grid-template-columns:1fr 1fr;
  max-width:900px; width:100%; gap:16px;
}
.ns-feat {
  border-radius:22px; overflow:hidden; cursor:pointer; position:relative;
  backdrop-filter:blur(24px) saturate(180%);
  transition:transform .42s var(--bounce), box-shadow .4s; will-change:transform;
}
.ns-feat::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; z-index:5; pointer-events:none; }
.ns-feat .fspot { position:absolute; inset:0; pointer-events:none; z-index:2; border-radius:inherit; background:radial-gradient(280px circle at var(--fx,50%) var(--fy,50%),rgba(255,255,255,0.055) 0%,transparent 60%); opacity:0; transition:opacity .4s; }
.ns-feat:hover .fspot { opacity:1; }

.ns-feat-1 {
  grid-column:1; grid-row:1; padding:44px 36px;
  background:rgba(11,11,22,0.82); border:1px solid rgba(200,255,62,0.11);
  box-shadow:0 2px 0 1px rgba(200,255,62,0.16), 0 8px 0 0 rgba(110,140,8,.3), 0 18px 42px rgba(0,0,0,.55), 0 30px 72px rgba(0,0,0,.3);
  transform:translateY(-3px);
}
.ns-feat-1::before { background:linear-gradient(90deg,transparent,rgba(200,255,62,0.22),transparent); }
.ns-feat-1:hover {
  transform:translateY(-8px) perspective(700px) rotateX(1.2deg);
  border-color:rgba(200,255,62,0.22);
  box-shadow:0 3px 0 1px rgba(200,255,62,.22), 0 14px 0 0 rgba(110,140,8,.38), 0 26px 60px rgba(0,0,0,.65), 0 44px 90px rgba(0,0,0,.36);
}
.ns-feat-2 {
  grid-column:2; grid-row:1; padding:44px 36px;
  background:rgba(11,11,22,0.82); border:1px solid rgba(248,113,113,0.11);
  box-shadow:0 2px 0 1px rgba(248,113,113,.22), 0 7px 0 0 rgba(130,35,35,.35), 0 16px 38px rgba(0,0,0,.52), 0 28px 62px rgba(0,0,0,.28);
  transform:translateY(-3px);
}
.ns-feat-2::before { background:linear-gradient(90deg,transparent,rgba(248,113,113,0.22),transparent); }
.ns-feat-2:hover {
  transform:translateY(-7px) perspective(700px) rotateX(1.2deg);
  border-color:rgba(248,113,113,.22);
  box-shadow:0 3px 0 1px rgba(248,113,113,.28), 0 12px 0 0 rgba(130,35,35,.42), 0 24px 56px rgba(0,0,0,.62), 0 40px 84px rgba(0,0,0,.33);
}
.ns-feat-inner { position:relative; z-index:3; }
.ns-feat-ico {
  width:50px; height:50px; border-radius:14px;
  display:flex; align-items:center; justify-content:center; margin-bottom:28px;
  background:rgba(255,255,255,0.05); border:1px solid var(--border);
  box-shadow:0 4px 14px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07);
}
.ns-feat-1 .ns-feat-ico { background:rgba(200,255,62,0.10); border-color:rgba(200,255,62,0.22); box-shadow:0 4px 20px rgba(200,255,62,0.18),inset 0 1px 0 rgba(200,255,62,0.18); }
.ns-feat-2 .ns-feat-ico { background:rgba(248,113,113,0.10); border-color:rgba(248,113,113,0.22); box-shadow:0 4px 20px rgba(248,113,113,0.18),inset 0 1px 0 rgba(248,113,113,0.18); }
.ns-feat-badge {
  display:inline-flex; align-items:center; gap:6px;
  font-family:var(--mono); font-size:9px; letter-spacing:.18em; text-transform:uppercase;
  padding:5px 12px; border-radius:100px; margin-bottom:18px;
}
.ns-feat-1 .ns-feat-badge { color:var(--lime); background:rgba(200,255,62,0.09); border:1px solid rgba(200,255,62,0.2); }
.ns-feat-2 .ns-feat-badge { color:var(--clay-red); background:rgba(248,113,113,0.09); border:1px solid rgba(248,113,113,0.2); }
.ns-feat-name { font-weight:800; letter-spacing:-.03em; color:var(--white); line-height:1.15; margin-bottom:14px; font-size:22px; }
.ns-feat-desc { font-size:14px; font-weight:300; color:var(--white-55); line-height:1.72; }

.ns-cta {
  padding:130px 24px 150px; display:flex; flex-direction:column;
  align-items:center; text-align:center; position:relative; z-index:1; overflow:hidden;
}
.ns-cta-aurora {
  position:absolute; inset:0; pointer-events:none;
  background:
    radial-gradient(ellipse 70% 55% at 50% 100%,rgba(200,255,62,0.07) 0%,transparent 70%),
    radial-gradient(ellipse 44% 40% at 25% 88%,rgba(99,102,241,0.06) 0%,transparent 60%),
    radial-gradient(ellipse 44% 40% at 75% 88%,rgba(168,85,247,0.05) 0%,transparent 60%);
  animation:auroraBreath 9s ease-in-out infinite;
}
@keyframes auroraBreath { 0%,100%{opacity:.7;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
.ns-cta-wm {
  position:absolute; bottom:10px; left:50%; transform:translateX(-50%) rotate(-3deg);
  font-size:clamp(80px,16vw,190px); font-weight:900; letter-spacing:-.06em;
  color:rgba(240,240,250,0.018); pointer-events:none; white-space:nowrap; user-select:none;
}
.ns-cta-h {
  font-size:clamp(44px,6.5vw,84px); font-weight:900; letter-spacing:-.05em; line-height:1.0;
  color:var(--white); margin-bottom:20px; position:relative; z-index:1;
}
.ns-cta-h em { font-style:normal; color:var(--lime); text-shadow:0 0 40px rgba(200,255,62,.4); }
.ns-cta-sub { font-size:15px; font-weight:300; color:var(--white-55); line-height:1.78; max-width:375px; margin-bottom:52px; position:relative; z-index:1; }
.ns-cta-note { margin-top:20px; font-family:var(--mono); font-size:9px; letter-spacing:.18em; color:var(--white-30); position:relative; z-index:1; text-transform:uppercase; display:flex; align-items:center; gap:10px; }
.ns-cta-note::before,.ns-cta-note::after { content:''; height:1px; width:24px; background:var(--border-hi); }

.ns-footer {
  border-top:1px solid var(--border); padding:30px 52px;
  display:flex; align-items:center; justify-content:space-between;
  position:relative; z-index:1; background:rgba(7,7,15,0.55); backdrop-filter:blur(16px);
}
.ns-footer::before { content:''; position:absolute; top:-1px; left:10%; right:10%; height:1px; background:linear-gradient(90deg,transparent,var(--border-hi),transparent); }
.ns-footer-brand { display:flex; align-items:center; gap:9px; cursor:pointer; }
.ns-footer-logo  { width:20px; height:20px; object-fit:contain; filter:drop-shadow(0 0 5px rgba(200,255,62,0.4)); }
.ns-footer-name  { font-size:14px; font-weight:800; letter-spacing:-.03em; }
.ns-footer-name em { font-style:normal; color:var(--lime); }
.ns-footer-copy { font-family:var(--mono); font-size:9px; letter-spacing:.07em; color:var(--white-30); text-transform:uppercase; }
.ns-footer-links { display:flex; gap:28px; }
.ns-footer-links span { font-family:var(--mono); font-size:9px; letter-spacing:.12em; color:var(--white-30); cursor:pointer; transition:color .2s; text-transform:uppercase; }
.ns-footer-links span:hover { color:var(--lime); }

@media (max-width:900px) {
  .ns-nav{padding:0 20px} .ns-nav-links{display:none}
  .cmp-wrap,.ns-bento{grid-template-columns:1fr}
  .cmp-panel{height:500px}
  .ns-feat-1,.ns-feat-2{grid-column:1;grid-row:auto}
  .ns-stats{grid-template-columns:1fr;gap:12px}
  .ns-footer{flex-direction:column;gap:18px;text-align:center;padding:24px}
  .ns-footer-links{justify-content:center}
  .ns-chip{display:none}
  .ns-nav-user-name{display:none}
}
@media (max-width:540px) {
  .ns-hero-actions{flex-direction:column;width:100%}
  .clay-primary,.clay-ghost{width:100%;justify-content:center}
}
`;

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
      {/* ── Left panel: ChatGPT ── */}
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

      {/* ── Right panel: Examify ── */}
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

  // ── Student data: read once from localStorage on mount ──
  const [studentData, setStudentData] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // ── Gate state: shown only on-demand, never on page load ──
  const [showGate, setShowGate]         = useState(false);
  const [pendingRoute, setPendingRoute] = useState(null);

  // ─────────────────────────────────────────────────────────
  // handleProtectedNavigation
  //   Called by every tool button/card/nav-link.
  //   If student data exists → navigate immediately.
  //   If not → store the intended path, open the gate.
  // ─────────────────────────────────────────────────────────
  const handleProtectedNavigation = useCallback((path) => {
    // Re-read from storage in case the tab just got the value
    let data = studentData;
    if (!data) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        data = raw ? JSON.parse(raw) : null;
        if (data) setStudentData(data); // sync state if found
      } catch { /* ignore parse errors */ }
    }

    if (data) {
      navigate(path);
    } else {
      setPendingRoute(path);
      setShowGate(true);
    }
  }, [studentData, navigate]);

  // ─────────────────────────────────────────────────────────
  // handleGateComplete
  //   Called by StudentInfoGate after the form is submitted.
  //   Saves data to state, hides gate, navigates to pending route.
  // ─────────────────────────────────────────────────────────
  const handleGateComplete = useCallback((data) => {
    setStudentData(data);
    setShowGate(false);
    setPendingRoute((route) => {
      if (route) navigate(route);
      return null;
    });
  }, [navigate]);

  // ─────────────────────────────────────────────────────────
  // handleEditInfo
  //   Clears stored data; does NOT force the gate open.
  //   Gate only appears next time a tool is clicked.
  // ─────────────────────────────────────────────────────────
  const handleEditInfo = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setStudentData(null);
  }, []);

  // ── DOM / scroll effect ──
  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = CSS + GATE_CSS;
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
      {/* ── Gate: rendered as overlay ONLY when showGate is true ── */}
      {showGate && (
        <StudentInfoGate onComplete={handleGateComplete} />
      )}

      {/* Ambient background */}
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

      {/* ── NAV ── */}
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
            <button className="ns-nav-signout" onClick={handleEditInfo}>
              Edit Info
            </button>
          ) : (
            /* Show "Set Info" when no data — opens gate with no pending route */
            <button className="ns-nav-signout" onClick={() => {
              setPendingRoute(null);
              setShowGate(true);
            }}>
              Set Info
            </button>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
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

        <p className="ns-sub">
          Structured, to-the-point answers that actually score marks.
        </p>

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

      {/* ── DIVIDER ── */}
      <div className="ns-divider">
        <div className="ns-div-line"/>
        <div className="ns-div-glyph"><span>◈</span><div className="ns-div-dot"/><span>◈</span></div>
        <div className="ns-div-line ns-div-line-r"/>
      </div>

      {/* ── STATS ── */}
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

      {/* ── DIVIDER ── */}
      <div className="ns-divider">
        <div className="ns-div-line"/>
        <div className="ns-div-glyph"><span>◈</span><div className="ns-div-dot"/><span>◈</span></div>
        <div className="ns-div-line ns-div-line-r"/>
      </div>

      {/* ── DEMO: ChatGPT vs Examify ── */}
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

      {/* ── DIVIDER ── */}
      <div className="ns-divider">
        <div className="ns-div-line"/>
        <div className="ns-div-glyph"><span>◈</span><div className="ns-div-dot"/><span>◈</span></div>
        <div className="ns-div-line ns-div-line-r"/>
      </div>

      {/* ── BENTO FEATURES ── */}
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

      {/* ── DIVIDER ── */}
      <div className="ns-divider">
        <div className="ns-div-line"/>
        <div className="ns-div-glyph"><span>◈</span><div className="ns-div-dot"/><span>◈</span></div>
        <div className="ns-div-line ns-div-line-r"/>
      </div>

      {/* ── CTA ── */}
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

      {/* ── FOOTER ── */}
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