// ════════════════════════════════════════════════════════════════
//  throttle.js  —  place in src/
//  Global token-bucket rate limiter.
//
//  Guarantees: no more than GLOBAL_RPS calls/sec across ALL
//  workers, retry paths, and job processors combined.
//
//  Why here and not queue.js:
//    apiCaller.js is the single choke point every call passes
//    through — primary, retry, inline BAD_JSON retry, item retry.
//    A delay in queue.js worker loops is bypassed by all retry paths.
// ════════════════════════════════════════════════════════════════

// ── Tunables (override via .env) ─────────────────────────────────
// GLOBAL_RPS: max HTTP calls to Groq per second across entire process.
// With 20 keys at Groq's ~30 RPM/key = 600 RPM = 10 RPS ceiling.
// 8 leaves headroom for retry bursts.
const GLOBAL_RPS = parseInt(process.env.GLOBAL_RPS || "20", 10);
const BURST_CAPACITY      = parseInt(process.env.BURST_CAPACITY      || "25",     10);
const THROTTLE_TIMEOUT_MS = parseInt(process.env.THROTTLE_TIMEOUT_MS || "30000", 10);

// ── State ─────────────────────────────────────────────────────────
let tokens     = BURST_CAPACITY; // start full — first burst is free
let lastRefill = Date.now();
const waiters  = [];             // FIFO queue of { resolve, reject, timer }

// ── Token refill ──────────────────────────────────────────────────
function _refill() {
  const now     = Date.now();
  const elapsed = (now - lastRefill) / 1000;
  tokens        = Math.min(BURST_CAPACITY, tokens + elapsed * GLOBAL_RPS);
  lastRefill    = now;
}

// ── Drain waiters in FIFO order ───────────────────────────────────
function _drain() {
  while (waiters.length > 0 && tokens >= 1) {
    const waiter = waiters.shift();
    clearTimeout(waiter.timer);
    tokens -= 1;
    waiter.resolve();
  }
}

// ── acquire() — called by apiCaller.js before every HTTP call ─────
// Returns a Promise that resolves when a token is consumed.
// Rejects after THROTTLE_TIMEOUT_MS if the system is persistently overloaded.
function acquire() {
  _refill();

  if (tokens >= 1) {
    tokens -= 1;
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const idx = waiters.findIndex(w => w.resolve === resolve);
      if (idx !== -1) waiters.splice(idx, 1);
      reject({
        code:    "THROTTLE_TIMEOUT",
        message: `Global throttle: no token available after ${THROTTLE_TIMEOUT_MS}ms. System overloaded.`,
      });
    }, THROTTLE_TIMEOUT_MS);

    waiters.push({ resolve, reject, timer });
  });
}

// ── Periodic refill pump ──────────────────────────────────────────
// Without this, waiters only wake up when the next acquire() fires.
// The pump guarantees waiting callers are unblocked on schedule
// even if no new requests arrive.
const REFILL_INTERVAL_MS = Math.floor(1000 / GLOBAL_RPS);
const _pump = setInterval(() => {
  _refill();
  _drain();
}, REFILL_INTERVAL_MS);

// Don't prevent clean process exit during tests
if (_pump.unref) _pump.unref();

// ── Status — exposed in /api/health ──────────────────────────────
function getThrottleStatus() {
  _refill();
  return {
    tokens:      parseFloat(tokens.toFixed(2)),
    capacity:    BURST_CAPACITY,
    rps:         GLOBAL_RPS,
    waiters:     waiters.length,
    refillEvery: `${REFILL_INTERVAL_MS}ms`,
  };
}

module.exports = { acquire, getThrottleStatus };