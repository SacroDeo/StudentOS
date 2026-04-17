// ═══════════════════════════════════════════════════════════════
//  apiClient.js  —  Drop into your React src/ folder
//
//  This replaces callGroq() in Examify.jsx.
//  Instead of calling Groq directly from the browser,
//  it calls your Railway backend which handles everything.
// ═══════════════════════════════════════════════════════════════

// Your Railway backend URL — set this in your .env file
// e.g. VITE_API_URL=https://examify-backend.up.railway.app
const API_BASE = import.meta.env.VITE_API_URL;
// Token usage tracker (session-level, same as before)
let _tokens = { prompt: 0, completion: 0 };

export function addTokenUsage(usage) {
  if (!usage) return;
  _tokens.prompt     += usage.prompt_tokens     || 0;
  _tokens.completion += usage.completion_tokens || 0;
}
export function getTokenUsage()   { return { ..._tokens }; }
export function resetTokenUsage() { _tokens = { prompt: 0, completion: 0 }; }


// ── Main function — use this everywhere callGroq() was used ──────
//
//  Returns: Array of normalized answer objects (same shape as before)
//  Throws:  Error with .message set to user-friendly string
//
export async function generateAnswers(prompt, marks = "5M", simpleEnglish = false, fallbackQuestion = "", questionCount = 1) {
  let res;

  try {
    const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

try {
  res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, marks, simpleEnglish, fallbackQuestion, questionCount }),
    signal: controller.signal
  });
} finally {
  clearTimeout(timeoutId);
}
  } catch (networkErr) {
    // Network error — backend unreachable
    throw new Error("Cannot reach server. Check your internet connection.");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Map backend error codes to user-friendly messages
    const code = data.code || "";
    if (res.status === 429 || code === "RATE_LIMIT") {
      throw new Error("RATE_LIMIT");
    }
    if (res.status === 503 || code === "QUEUE_FULL" || code === "ALL_KEYS_BUSY") {
      throw new Error("Server is busy. Please wait a moment and try again.");
    }
    if (res.status === 504 || code === "TIMEOUT") {
      throw new Error("Request timed out. Please try again.");
    }
    throw new Error(data.error || "Something went wrong. Please try again.");
  }

  // Track token usage
  addTokenUsage(data.usage);

  return data.results || [];
}


// ── Convenience: get current queue depth from server ─────────────
export async function getQueueDepth() {
  try {
    const res  = await fetch(`${API_BASE}/api/queue`);
    const data = await res.json();
    return data.depth || 0;
  } catch {
    return 0;
  }
}


// ═══════════════════════════════════════════════════════════════
//  HOW TO MIGRATE Examify.jsx — Quick reference
// ═══════════════════════════════════════════════════════════════
//
//  1. Add import at top of Examify.jsx:
//     import { generateAnswers, getTokenUsage, resetTokenUsage } from "./apiClient";
//
//  2. In run(), replace every callGroq() call:
//
//     BEFORE (single):
//       const raw = await callGroq(singlePrompt(...), simpleEnglish);
//       const res = normalizeItem(Array.isArray(raw) ? raw[0] : raw, marks);
//
//     AFTER:
//       const results = await generateAnswers(
//         singlePrompt(question, marks, simpleEnglish),
//         marks, simpleEnglish, question
//       );
//       const res = results[0];
//
//     BEFORE (bulk):
//       const raw   = await callGroq(bulkPrompt(...), simpleEnglish);
//       const items = (Array.isArray(raw) ? raw : [raw]).map(item => normalizeItem(item, marks));
//
//     AFTER:
//       const items = await generateAnswers(
//         bulkPrompt(batch, marks, simpleEnglish),
//         marks, simpleEnglish
//       );
//
//  3. Replace token tracking:
//     resetTokens()  →  resetTokenUsage()
//     getTokens()    →  getTokenUsage()
//     addTokens()    →  (no longer needed — apiClient does it automatically)
//
//  4. Delete these from Examify.jsx (all handled by backend now):
//     - callGroq()
//     - normalizeItem()  (normalizeResponse is now in backend normalizer.js)
//     - _totalTokens, addTokens(), getTokens(), resetTokens()
//     - MODEL, GROQ_API_KEY, MAX_TOKENS, TEMPERATURE, BATCH_SIZE, CHUNK_WORDS
//     - chunkArray(), chunkText(), getBatchSize()  (keep if used for PDF splitting)
//
//  5. Add VITE_API_URL to your frontend .env:
//     VITE_API_URL=https://your-backend.up.railway.app