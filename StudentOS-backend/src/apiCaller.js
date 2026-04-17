// ═══════════════════════════════════════════════════════════════
//  apiCaller.js
//  Makes a single Groq API call with hardened retry logic.
//
//  Phase 5 changes vs previous version:
//    - await throttle.acquire() before EVERY HTTP call (primary +
//      retry + inline BAD_JSON retry) — hard global RPS ceiling
//    - Exponential backoff with jitter (no synchronized stampedes)
//    - 429 path immediately continues to next key (no forced wait)
//    - Inline BAD_JSON retry uses _singleFetch (own AbortController)
//    - Key acquired AFTER backoff sleep, not before
//    - markError imported once at top
// ═══════════════════════════════════════════════════════════════

const throttle = require("./throttle"); // ✅ Phase 5: global token-bucket throttle

const {
  getAvailableKey,
  markUsed,
  markCooldown,
  markError,
  msUntilAvailable,
  markInUse,
  markFree,
} = require("./keyManager");

const MODELS = {
  "3": "llama-3.1-8b-instant",
  "4": "llama-3.1-8b-instant",
  "5": "llama-3.3-70b-versatile",
};

function getMaxTokens(marks) {
  if (marks === "3M") return 1200;
  if (marks === "4M") return 1800;
  return 4000;
}

const TEMPERATURE    = 0.3;
const TIMEOUT_MS     = 60000;
const RETRY_BASE_MS  = 4000;
const RETRY_MAX_MS   = 30000;
const MAX_ATTEMPTS   = 2; // 1 primary + 3 retries

// Exponential backoff with jitter — prevents synchronized stampedes
// when multiple workers all retry at the same moment.
function _backoffMs(attempt) {
  const exp    = Math.min(RETRY_BASE_MS * Math.pow(2, attempt), RETRY_MAX_MS);
  const jitter = Math.random() * 2000;
  return Math.floor(exp + jitter);
}

const JSON_SYSTEM_SUFFIX = `

CRITICAL OUTPUT RULES:
- Return ONLY valid JSON. Nothing else.
- No text before or after the JSON.
- No markdown, code fences, or backticks.
- JSON must be complete and properly closed.
- Every string must be properly escaped.
- Every array and object must be fully closed.`;

// ── JSON helpers ──────────────────────────────────────────────────
function extractJSON(text) {
  if (typeof text !== "string") throw new Error("Input is not a string");

  const firstBrace   = text.indexOf("{");
  const firstBracket = text.indexOf("[");

  if (firstBrace === -1 && firstBracket === -1) throw new Error("No JSON found");

  let start, endChar;
  if (firstBracket === -1 || (firstBrace !== -1 && firstBrace < firstBracket)) {
    start = firstBrace; endChar = "}";
  } else {
    start = firstBracket; endChar = "]";
  }

  const end = text.lastIndexOf(endChar);
  if (end === -1 || end <= start) throw new Error("No closing delimiter found");
  return text.slice(start, end + 1);
}

function _safeParseJSON(text) {
  const stripped = text.replace(/```json|```/gi, "").trim();

  try { return JSON.parse(extractJSON(stripped)); } catch (_) {}

  const fixed = stripped.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
  try { return JSON.parse(extractJSON(fixed)); } catch (_) {}

  try {
    const repaired = _repairTruncated(extractJSON(fixed));
    if (repaired) return JSON.parse(repaired);
  } catch (_) {}

  return null;
}

function _repairTruncated(text) {
  const stack  = [];
  const close  = { "{": "}", "[": "]" };
  let inString = false;
  let escape   = false;

  for (const ch of text) {
    if (escape)                      { escape = false; continue; }
    if (ch === "\\")                 { escape = true;  continue; }
    if (ch === '"')                  { inString = !inString; continue; }
    if (inString)                    continue;
    if (ch === "{" || ch === "[")    { stack.push(ch); continue; }
    if (ch === "}" || ch === "]")    { stack.pop();    continue; }
  }

  if (stack.length === 0 || stack.length > 10) return null;
  return text + stack.reverse().map(c => close[c]).join("");
}

function _buildFallbackData(prompt) {
  const isBulk = prompt.trimStart().startsWith("[") ||
                 /EXACTLY \d+ objects/i.test(prompt);

  const placeholder = {
    question:     "Could not generate answer",
    introduction: "",
    table:        null,
    points:       ["The model returned malformed output. Please retry this question."],
    conclusion:   "",
    mnemonic:     "",
    quick_answer: "",
    error:        true,
  };

  return isBulk ? [placeholder] : placeholder;
}

// ── _singleFetch — one HTTP call with its own AbortController ────
// Extracted so both the primary path and the inline BAD_JSON retry
// use identical timeout + abort handling (inline retry was previously
// a bare fetch() that could hang indefinitely on timeout).
async function _singleFetch(apiKey, body) {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:  "POST",
      signal:  controller.signal,
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    return res;
  } finally {
    clearTimeout(timer); // always clear — success, error, or abort
  }
}

// ════════════════════════════════════════════════════════════════
//  callGroqWithRetry — main entry point called by queue.js
// ════════════════════════════════════════════════════════════════
async function callGroqWithRetry(payload) {
  const { prompt, marks = "5M", simpleEnglish = false } = payload;

  const m         = marks.replace("M", "");
  const model     = MODELS[m] || MODELS["5"];
  const maxTokens = getMaxTokens(marks);

  const baseSystem = simpleEnglish
    ? "You MUST use VERY simple English. Short sentences. Explain every technical term in brackets."
    : "You are a university exam answer writer.";

  const systemMsg = baseSystem + JSON_SYSTEM_SUFFIX;

  const requestBody = {
    model,
    max_tokens:  maxTokens,
    temperature: TEMPERATURE,
    messages: [
      { role: "system", content: systemMsg },
      { role: "user",   content: prompt    },
    ],
  };

  let lastError;
  let badJsonCount = 0;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {

    // Exponential backoff with jitter on every retry (not attempt 0).
    // Key is acquired AFTER the sleep — not locked during the wait.
    if (attempt > 0) {
      const delay = _backoffMs(attempt - 1);
      console.log(`[apiCaller] Attempt ${attempt + 1}/${MAX_ATTEMPTS} — backoff ${delay}ms`);
      await _sleep(delay);
    }

    // ✅ Phase 5: Global throttle gate.
    // Every path (primary, retry, item retry from queue.js) passes
    // through callGroqWithRetry → every call consumes 1 token here.
    // Waits if bucket is empty. Rejects after THROTTLE_TIMEOUT_MS.
    await throttle.acquire();

    // Acquire key AFTER throttle + backoff sleep so we get the
    // freshest available key, not one locked during the sleep.
    let keyEntry = getAvailableKey();

    if (!keyEntry) {
      const wait = msUntilAvailable();
      if (wait > 0) {
        console.log(`[apiCaller] All keys busy — waiting ${Math.ceil(wait / 1000)}s`);
        await _sleep(wait + 500);
        keyEntry = getAvailableKey();
      }
      if (!keyEntry) {
        throw { code: "ALL_KEYS_BUSY", message: "All API keys are on cooldown. Please try again in ~60 seconds." };
      }
    }

    markInUse(keyEntry.key);

    try {
      const res = await _singleFetch(keyEntry.key, requestBody);
      const text = await res.text();
      // 429: mark cooldown and continue immediately to next iteration.
      // Do NOT sleep here — let the loop pick a different available key.
      // If all keys are on cooldown, the next iteration's msUntilAvailable()
      // handles the wait.
      if (res.status === 429) {
        markCooldown(keyEntry.key);
        markFree(keyEntry.key);
        lastError = { code: "RATE_LIMIT", message: "Rate limit hit — switching key." };
        continue;
      }

      if (res.status === 401 || res.status === 403) {
  let body = {};
  try { body = JSON.parse(text); } catch {}

  markError(keyEntry.key);   // mark bad key
  markFree(keyEntry.key);    // release it

  lastError = {
    code: "AUTH_ERROR",
    message: body?.error?.message || "Invalid API key."
  };

  continue; // 🔥 IMPORTANT: skip rest of loop
}


if (!res.ok) {
  console.error("❌ GROQ ERROR STATUS:", res.status);
  console.error("❌ GROQ RAW RESPONSE:", text);

  let body = {};
  try { body = JSON.parse(text); } catch {}

  lastError = {
    code: "API_ERROR",
    message: body?.error?.message || `HTTP ${res.status}`
  };

  continue;
}
 let data;
try {
  data = JSON.parse(text);
} catch (e) {
  console.error("❌ JSON PARSE ERROR:", text);
  lastError = { code: "BAD_JSON", message: "Invalid JSON response" };
  continue;
}

      
      const raw  = data?.choices?.[0]?.message?.content?.trim();

      if (!raw) {
        lastError = { code: "EMPTY_RESPONSE", message: "Model returned empty response." };
        continue;
      }

      let parsed = _safeParseJSON(raw);

      if (!parsed) {
        badJsonCount++;
        console.warn(`[apiCaller] BAD_JSON attempt ${attempt + 1} (count=${badJsonCount}), raw length: ${raw.length}`);

        // Inline BAD_JSON retry — lower temperature, uses _singleFetch
        // so it has its own AbortController and cannot hang.
        // Only on first BAD_JSON and not the final attempt.
        if (badJsonCount === 1 && attempt < MAX_ATTEMPTS - 1) {
          console.log("[apiCaller] Inline BAD_JSON retry — lower temperature");
          await _sleep(1500 + Math.random() * 1000);

          // Inline retry also needs a throttle token — it is a real HTTP call.
          try {
            await throttle.acquire();
            const inlineBody = { ...requestBody, temperature: 0.1 };
            const inlineRes  = await _singleFetch(keyEntry.key, inlineBody);

            if (inlineRes.ok) {
              const inlineData = await inlineRes.json();
              const inlineRaw  = inlineData?.choices?.[0]?.message?.content?.trim();
              if (inlineRaw) {
                parsed = _safeParseJSON(inlineRaw);
                if (parsed) console.log("[apiCaller] Inline BAD_JSON retry succeeded");
              }
            }
          } catch (inlineErr) {
            console.warn("[apiCaller] Inline retry failed:", inlineErr.message || inlineErr.code);
          }
        }

        if (!parsed) {
          if (attempt < MAX_ATTEMPTS - 1) {
            lastError = { code: "BAD_JSON", message: "Malformed JSON — retrying." };
            continue;
          }
          console.error("[apiCaller] All attempts BAD_JSON — returning structured fallback");
          parsed = _buildFallbackData(prompt);
        }
      }

      markUsed(keyEntry.key);
      return { data: parsed, usage: data.usage || {}, model };

    } catch (err) {
  console.error("❌ FETCH ERROR:", err);   // ADD THIS LINE

  markError(keyEntry.key);

      if (err.name === "AbortError") {
        lastError = { code: "TIMEOUT", message: "Request timed out." };
        continue;
      }

      // Non-retryable — bubble immediately
      if (err.code === "AUTH_ERROR" || err.code === "ALL_KEYS_BUSY" || err.code === "THROTTLE_TIMEOUT") {
        throw err;
      }

      lastError = { code: "UNKNOWN", message: err.message || "Unknown error." };

    } finally {
      // Guaranteed release — runs on success, error, and abort.
      if (keyEntry?.key) markFree(keyEntry.key);
    }
  }

  throw lastError || { code: "FAILED", message: "All retries exhausted." };
}

function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { callGroqWithRetry };