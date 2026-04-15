// ═══════════════════════════════════════════════════════════════
//  keyManager.js
//  Manages 20+ Groq API keys with:
//    - Atomic per-key lock (activeRequests counter)
//    - Round-robin fair distribution
//    - 60s cooldown on 429, 3× cooldown on repeated errors
//    - O(1) key lookup via pre-built index Map
//    - availableCount() correctly excludes fully-loaded keys
// ═══════════════════════════════════════════════════════════════

// ── CHANGE 1: Tunable constants extracted to top-level ───────────
// Previously MAX_PER_KEY was buried inside getAvailableKey()'s loop.
// Now all tunables are visible and adjustable in one place.
const KEY_COOLDOWN_MS     = 60000; // 60s standard cooldown on 429
const KEY_COOLDOWN_LONG   = KEY_COOLDOWN_MS * 3; // 3min after 5+ errors
const MAX_PER_KEY         = 2;     // max simultaneous requests per key
const ERROR_THRESHOLD     = 5;     // errors before extended cooldown
const MAX_KEY_INDEX       = 25;    // ── CHANGE 2: supports GROQ_KEY_1…GROQ_KEY_25

// ── CHANGE 2: buildKeyList reads GROQ_KEY_1 to GROQ_KEY_25 ──────
// Previously capped at GROQ_KEY_10 — keys 11–20+ were silently dropped.
function buildKeyList() {
  const raw = [];

  for (let i = 1; i <= MAX_KEY_INDEX; i++) {
    const val = process.env[`GROQ_KEY_${i}`];
    if (val && val.trim().length > 0) raw.push(val.trim());
  }

  // Legacy fallback — GROQ_API_KEY used before numbered keys existed
  const legacy = process.env.GROQ_API_KEY;
  if (legacy && legacy.trim().length > 0) raw.push(legacy.trim());

  // Deduplicate — GROQ_API_KEY may duplicate a numbered key
  const seen = new Set();
  const keys = raw.filter(k => {
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  if (!keys.length) throw new Error("[keyManager] No Groq API keys found in environment.");

  console.log(`[keyManager] Loaded ${keys.length} API key(s).`);

  return keys.map((key, i) => ({
    key,
    index:          i,
    activeRequests: 0,   // current in-flight requests on this key
    cooldownUntil:  0,   // epoch ms; 0 = available now
    useCount:       0,   // lifetime successful uses
    errorCount:     0,   // lifetime errors (429 + network)
    lastUsed:       0,   // epoch ms of last successful use
  }));
}

const keyState = buildKeyList();

// ── CHANGE 3: O(1) key lookup Map ───────────────────────────────
// Previously every markX(key) call used keyState.find(s => s.key === key)
// which is O(n). With 20+ keys under parallel load, this adds up.
// A Map gives O(1) access at the cost of one-time build.
const keyMap = new Map(keyState.map(entry => [entry.key, entry]));

// Round-robin pointer — advances each time a key is successfully acquired
let rrPointer = 0;

// ── CHANGE 4: getAvailableKey — excludes keys at MAX_PER_KEY load ─
// Previously availableCount() and getAvailableKey() disagreed:
// availableCount() only checked cooldownUntil (not activeRequests),
// so the dispatcher thought keys were free when they were fully loaded.
// Now both checks — cooldown AND activeRequests — are applied consistently.
function getAvailableKey() {
  const now   = Date.now();
  const total = keyState.length;
  const start = rrPointer % total;

  for (let i = 0; i < total; i++) {
    const idx   = (start + i) % total;
    const entry = keyState[idx];

    if (entry.cooldownUntil <= now && entry.activeRequests < MAX_PER_KEY) {
      rrPointer = (idx + 1) % total; // advance pointer past this key
      return entry;
    }
  }

  return null; // all keys on cooldown or fully loaded
}

// ── CHANGE 5: all markX functions use O(1) Map lookup ───────────
// Previously: keyState.find(s => s.key === key) — O(n) each call
// Now: keyMap.get(key) — O(1)

// Call immediately after getAvailableKey() returns — before the HTTP call
function markInUse(key) {
  const entry = keyMap.get(key);
  if (entry) entry.activeRequests++;
}

// Call in finally{} after every HTTP call completes or throws
function markFree(key) {
  const entry = keyMap.get(key);
  if (entry && entry.activeRequests > 0) entry.activeRequests--;
}

// Call after a confirmed successful API response
function markUsed(key) {
  const entry = keyMap.get(key);
  if (!entry) return;
  entry.useCount++;
  entry.lastUsed = Date.now();
}

// Call when the API returns HTTP 429
function markCooldown(key) {
  const entry = keyMap.get(key);
  if (!entry) return;

  entry.errorCount++;

  // Extended cooldown after repeated failures — key is clearly overwhelmed
  const cooldownDuration = entry.errorCount > ERROR_THRESHOLD
    ? KEY_COOLDOWN_LONG
    : KEY_COOLDOWN_MS;

  entry.cooldownUntil = Date.now() + cooldownDuration;

  console.warn(
    `[keyManager] Key ...${key.slice(-6)} on cooldown ` +
    `${Math.round(cooldownDuration / 1000)}s (errors: ${entry.errorCount})`
  );
}

// ── CHANGE 6: markError now applies a short cooldown ────────────
// Previously markError only incremented errorCount — no backoff applied.
// Network errors (ECONNRESET, timeout) should also back off the key
// briefly, or they'll keep hammering a degraded endpoint.
function markError(key) {
  const entry = keyMap.get(key);
  if (!entry) return;

  entry.errorCount++;

  // Short backoff on network errors — not a full 429 cooldown,
  // but enough to let the connection recover before the next retry.
  const backoff = Math.min(5000 * entry.errorCount, 30000); // 5s, 10s, 15s … cap 30s
  entry.cooldownUntil = Math.max(entry.cooldownUntil, Date.now() + backoff);

  console.warn(
    `[keyManager] Key ...${key.slice(-6)} network error — ` +
    `backoff ${backoff / 1000}s (errors: ${entry.errorCount})`
  );
}

// ── CHANGE 7: availableCount correctly excludes fully-loaded keys ─
// Previously only checked cooldownUntil — a key at activeRequests=2
// was still counted as "available", causing over-dispatch.
function availableCount() {
  const now = Date.now();
  return keyState.filter(
    s => s.cooldownUntil <= now && s.activeRequests < MAX_PER_KEY
  ).length;
}

// How many ms until any key becomes dispatchable (0 if one is ready now)
function msUntilAvailable() {
  const now = Date.now();

  // Check activeRequests too — a loaded key doesn't become available by time alone
  const ready = keyState.some(
    s => s.cooldownUntil <= now && s.activeRequests < MAX_PER_KEY
  );
  if (ready) return 0;

  // Find soonest cooldown expiry among keys that aren't fully loaded
  const candidates = keyState
    .filter(s => s.activeRequests < MAX_PER_KEY && s.cooldownUntil > now)
    .map(s => s.cooldownUntil);

  if (!candidates.length) return KEY_COOLDOWN_MS; // all fully loaded — wait a full cycle
  return Math.max(0, Math.min(...candidates) - now);
}

// Status summary — used by /health endpoint
function getStatus() {
  const now = Date.now();
  return keyState.map((s, i) => ({
    index:          i + 1,
    available:      s.cooldownUntil <= now && s.activeRequests < MAX_PER_KEY,
    cooldown:       s.cooldownUntil > now
      ? `${Math.ceil((s.cooldownUntil - now) / 1000)}s`
      : "ready",
    activeRequests: s.activeRequests,   // ── CHANGE 8: expose activeRequests in status
    uses:           s.useCount,
    errors:         s.errorCount,
  }));
}

module.exports = {
  markInUse,
  markFree,
  getAvailableKey,
  markUsed,
  markCooldown,
  markError,
  msUntilAvailable,
  availableCount,
  getStatus,
};