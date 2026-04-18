// ═══════════════════════════════════════════════════════════════
//  apiClient.js  —  src/apiClient.js
// ═══════════════════════════════════════════════════════════════

const API_BASE = import.meta.env.VITE_API_URL;

if (!API_BASE || !API_BASE.startsWith("http")) {
  console.error(
    `[apiClient] VITE_API_URL is missing or invalid: "${API_BASE}". ` +
    `Set it to "https://your-backend-domain.com" in your .env or Vercel env vars.`
  );
}

let _tokens = { prompt: 0, completion: 0 };

export function addTokenUsage(usage) {
  if (!usage) return;
  _tokens.prompt     += usage.prompt_tokens     || 0;
  _tokens.completion += usage.completion_tokens || 0;
}
export function getTokenUsage()   { return { ..._tokens }; }
export function resetTokenUsage() { _tokens = { prompt: 0, completion: 0 }; }


export async function generateAnswers(
  prompt,
  marks           = "5M",
  simpleEnglish   = false,
  fallbackQuestion = "",
  questionCount   = 1
) {
  if (!API_BASE || !API_BASE.startsWith("http")) {
    throw new Error("Cannot reach server. API URL is not configured correctly.");
  }

  let res;

  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 30000);

    try {
      res = await fetch(`${API_BASE}/api/generate`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          prompt,
          marks,
          simpleEnglish,
          fallbackQuestion,
          questionCount,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (networkErr) {
    if (networkErr.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw new Error("Cannot reach server. Check your internet connection.");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const code = data.code || "";
    if (res.status === 429 || code === "RATE_LIMIT" || code === "IP_RATE_LIMIT") {
      throw new Error("RATE_LIMIT");
    }
    if (res.status === 503 || code === "QUEUE_FULL" || code === "ALL_KEYS_BUSY" || code === "THROTTLE_TIMEOUT") {
      throw new Error("Server is busy. Please wait a moment and try again.");
    }
    if (res.status === 504 || code === "TIMEOUT") {
      throw new Error("Request timed out. Please try again.");
    }
    if (res.status === 502 || code === "BAD_JSON") {
      throw new Error("Server returned malformed data. Please try again.");
    }
    throw new Error(data.error || "Something went wrong. Please try again.");
  }

  addTokenUsage(data.usage);

  return data.results || [];
}


export async function getQueueDepth() {
  try {
    const res  = await fetch(`${API_BASE}/api/queue`);
    const data = await res.json();
    return data.depth || 0;
  } catch {
    return 0;
  }
}