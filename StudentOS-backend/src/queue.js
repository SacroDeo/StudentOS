// ════════════════════════════════════════════════════════════════
//  queue.js
//  Phase 4: lightweight job system layered over existing worker pool.
//
//  NEW CONCEPTS:
//    createJob()   — registers a job, splits questions into batches,
//                    enqueues all batches, tracks progress per batch.
//    jobStore      — in-memory Map of jobId → JobRecord (no Redis).
//    enqueueJob()  — public entry point replacing enqueue() for bulk.
//    enqueue()     — unchanged internal single-batch enqueue (used by
//                    enqueueJob and the legacy single-call path).
//
//  EXISTING LOGIC: untouched — worker pool, parallel execution,
//  per-worker delay, fair batch picker, item retry, dedup.
//
//  Phase 5 fix: _isFailedItem hardened — no runtime crash when
//  points contains objects, nulls, or non-string values.
// ════════════════════════════════════════════════════════════════

const crypto                = require("crypto");
const { callGroqWithRetry } = require("./apiCaller");
const { availableCount }    = require("./keyManager");
const { normalizeResponse } = require("./normalizer");

const PARALLEL_LIMIT = 4;
const JOB_TIMEOUT_MS = 120000;

// ── Timeout wrapper ──────────────────────────────────────────────
function withTimeout(promise, ms = JOB_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Job timeout")), ms)
    ),
  ]);
}

function normalizeQuestion(q) {
  if (typeof q !== "string") return "";
  return q.toLowerCase().trim().replace(/\s+/g, " ").replace(/[^\w\s]/g, "");
}

// Fair batch picker — 1 job per IP per dispatch round
function pickFairBatch(queue, limit) {
  const picked  = [];
  const usedIps = new Set();
  for (let i = 0; i < queue.length && picked.length < limit; i++) {
    const job = queue[i];
    if (!usedIps.has(job.ip)) {
      picked.push(queue.splice(i, 1)[0]);
      usedIps.add(job.ip);
      i--;
    }
  }
  return picked;
}

// ════════════════════════════════════════════════════════════════
//  JOB STORE — lightweight in-memory job registry
// ════════════════════════════════════════════════════════════════
const JOB_TTL_MS        = 30 * 60 * 1000; // 30 minutes
const MAX_ACTIVE_PER_IP = 2;

const jobStore = new Map();

setInterval(() => {
  const cutoff = Date.now() - JOB_TTL_MS;
  let swept = 0;
  for (const [id, job] of jobStore) {
    if (job.createdAt < cutoff) {
      jobStore.delete(id);
      swept++;
    }
  }
  if (swept > 0) console.log(`[jobStore] Swept ${swept} expired job(s)`);
}, 5 * 60 * 1000);

function _activeJobCount(ip) {
  let count = 0;
  for (const job of jobStore.values()) {
    if (job.ip === ip && job.status !== "completed" && job.status !== "failed") {
      count++;
    }
  }
  return count;
}

// ════════════════════════════════════════════════════════════════
//  QUESTION BATCH SPLITTER
// ════════════════════════════════════════════════════════════════
function getBatchSize(marks) {
  if (marks === "5M") return 2;
  if (marks === "4M") return 3;
  return 4; // 3M
}

function splitIntoBatches(questions, marks) {
  const size    = getBatchSize(marks);
  const batches = [];
  for (let i = 0; i < questions.length; i += size) {
    batches.push(questions.slice(i, i + size));
  }
  return batches;
}

// ════════════════════════════════════════════════════════════════
//  createJob — PUBLIC entry point for bulk question jobs.
// ════════════════════════════════════════════════════════════════
function createJob({ questions, marks, simpleEnglish, ip, buildPrompt, onApiCall }) {
  const active = _activeJobCount(ip);
  if (active >= MAX_ACTIVE_PER_IP) {
    throw {
      code:    "TOO_MANY_JOBS",
      message: `You already have ${active} active job(s). Wait for one to finish.`,
    };
  }

  const seen   = new Set();
  const unique = questions.filter(q => {
    const norm = normalizeQuestion(q);
    if (seen.has(norm)) return false;
    seen.add(norm);
    return true;
  });

  const deduped = questions.length - unique.length;
  if (deduped > 0) {
    console.log(`[createJob] Deduped ${deduped} duplicate question(s) for IP ${ip}`);
  }

  const batches = splitIntoBatches(unique, marks);
  const jobId   = crypto.randomBytes(12).toString("hex");

  const jobRecord = {
    id:            jobId,
    status:        "queued",
    ip,
    marks,
    simpleEnglish,
    totalBatches:  batches.length,
    doneBatches:   0,
    results:       new Array(unique.length).fill(null),
    error:         null,
    createdAt:     Date.now(),
    updatedAt:     Date.now(),
  };

  jobStore.set(jobId, jobRecord);
  console.log(`[createJob] Job ${jobId} created — ${unique.length} questions, ${batches.length} batches, IP: ${ip}`);

  _processJob({ jobId, batches, marks, simpleEnglish, ip, buildPrompt, onApiCall })
    .catch(err => {
      const job = jobStore.get(jobId);
      if (job) {
        job.status    = "failed";
        job.error     = err.message || err.code || "Unknown error";
        job.updatedAt = Date.now();
      }
      console.error(`[_processJob] Job ${jobId} failed fatally:`, err);
    });

  return {
    jobId,
    totalBatches:     batches.length,
    totalQuestions:   unique.length,
    deduped,
    estimatedWaitSec: Math.ceil(batches.length * getBatchSize(marks) * 1.5),
  };
}

// ════════════════════════════════════════════════════════════════
//  _processJob — background processor
// ════════════════════════════════════════════════════════════════
async function _processJob({ jobId, batches, marks, simpleEnglish, ip, buildPrompt, onApiCall }) {
  const job = jobStore.get(jobId);
  if (!job) return;

  job.status    = "processing";
  job.updatedAt = Date.now();

  let resultCursor = 0;

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch  = batches[batchIdx];
    const prompt = buildPrompt(batch, marks, simpleEnglish);

    try {
      const result = await enqueue(
        { prompt, marks, simpleEnglish, ip },
        onApiCall
      );

      const normalized   = normalizeResponse(result.data, marks, "");
      const batchResults = Array.isArray(normalized) ? normalized : [normalized];

      batchResults.forEach((r, i) => {
        job.results[resultCursor + i] = r;
      });

    } catch (err) {
      console.warn(`[_processJob] Job ${jobId} batch ${batchIdx} failed:`, err.code || err.message);
      for (let i = 0; i < batch.length; i++) {
        job.results[resultCursor + i] = {
          question:     batch[i],
          introduction: "",
          table:        null,
          points:       ["Could not generate answer. Please try again."],
          conclusion:   "",
          mnemonic:     "",
          quick_answer: "",
          error:        true,
        };
      }
    }

    resultCursor   += batch.length;
    job.doneBatches = batchIdx + 1;
    job.updatedAt   = Date.now();

    console.log(`[_processJob] Job ${jobId} — batch ${batchIdx + 1}/${batches.length} done`);
  }

  job.status    = "completed";
  job.updatedAt = Date.now();
  console.log(`[_processJob] Job ${jobId} completed — ${job.results.filter(Boolean).length} results`);
}

// ════════════════════════════════════════════════════════════════
//  getJob — called by GET /api/jobs/:id in server.js
// ════════════════════════════════════════════════════════════════
function getJob(jobId) {
  return jobStore.get(jobId) || null;
}

// ════════════════════════════════════════════════════════════════
//  EXISTING INTERNAL QUEUE MACHINERY
// ════════════════════════════════════════════════════════════════

const MAX_QUEUE  = 100;
const MAX_PER_IP = 30;

const queue            = [];
const inFlight         = new Map();
let   activeWorkers    = 0;
let   lastCallAt       = 0;
const workerLastCallAt = new Map();
const startupTime      = Date.now();

function getDynamicDelay(queueSize) {
  const available = availableCount();
  if (Date.now() - startupTime < 15000) return 800;
  if (available <= 2) return 800;
  if (available <= 4) return 500;
  if (queueSize < 20) return 600;
  if (queueSize < 50) return 400;
  if (queueSize < 80) return 700;
  return 1000;
}

function getDynamicWorkers(queueSize) {
  if (queueSize < 20) return 4;
  if (queueSize < 50) return 6;
  if (queueSize < 80) return 8;
  return 10;
}

function enqueue(payload, onApiCall) {
  if (queue.length >= MAX_QUEUE) {
    return Promise.reject({
      code:    "QUEUE_FULL",
      message: "Server is busy. Please try again in a moment.",
    });
  }

  const ip      = payload.ip || "unknown";
  const ipCount = queue.filter(j => j.ip === ip).length;

  if (ipCount >= MAX_PER_IP) {
    return Promise.reject({
      code:    "TOO_MANY_JOBS",
      message: `You have ${ipCount} requests queued.`,
    });
  }

  const rawPrompt = payload.prompt || "";
  const norm      = normalizeQuestion(rawPrompt);
  const dedupKey  = `${norm}|${payload.marks}|${payload.simpleEnglish}`;

  if (inFlight.has(dedupKey)) return inFlight.get(dedupKey);

  const jobPromise = new Promise((resolve, reject) => {
    queue.push({
      payload,
      resolve,
      reject,
      addedAt:   Date.now(),
      ip,
      onApiCall: onApiCall || null,
      dedupKey,
    });

    console.log(`[queue] Enqueued from IP ${ip}. Depth: ${queue.length}`);
    _spawnWorkers();
  });

  inFlight.set(dedupKey, jobPromise);
  jobPromise.finally(() => inFlight.delete(dedupKey));
  return jobPromise;
}

function getDepth()     { return queue.length; }
function isProcessing() { return activeWorkers > 0; }

function estimateWaitSec() {
  const depth   = queue.length;
  const workers = getDynamicWorkers(depth);
  return Math.ceil((depth / workers) * 3);
}

function _spawnWorkers() {
  const dynamicWorkers = getDynamicWorkers(queue.length);
  const maxConcurrency = availableCount() * 2;
  const allowedWorkers = Math.max(1, Math.floor(maxConcurrency / PARALLEL_LIMIT));
  const finalWorkers   = Math.min(dynamicWorkers, allowedWorkers);

  console.log("Queue:", queue.length, "Workers:", finalWorkers, "Delay:", getDynamicDelay(queue.length));

  while (activeWorkers < finalWorkers && queue.length > 0) {
    activeWorkers++;
    const wid = activeWorkers;
    _runWorker().finally(() => {
      activeWorkers--;
      workerLastCallAt.delete(wid);
      if (queue.length > 0) _spawnWorkers();
    });
  }
}

async function _runWorker() {
  const workerId = activeWorkers;

  while (queue.length > 0) {
    const jobs = pickFairBatch(queue, PARALLEL_LIMIT);
    if (jobs.length === 0 && queue.length > 0) jobs.push(queue.shift());

    const MIN_INTERVAL = getDynamicDelay(queue.length);
    const workerLast   = workerLastCallAt.get(workerId) || 0;
    const elapsed      = Date.now() - workerLast;
    if (elapsed < MIN_INTERVAL) await _sleep(MIN_INTERVAL - elapsed);

    const batchPromises = jobs.map(job =>
      withTimeout(_callWithItemRetry(job.payload, job.onApiCall))
        .then(result => job.resolve(result))
        .catch(err   => job.reject(err))
    );
    await Promise.allSettled(batchPromises);

    workerLastCallAt.set(workerId, Date.now());
    lastCallAt = Date.now();

    if (activeWorkers > getDynamicWorkers(queue.length)) break;
  }
}

const MAX_ITEM_RETRIES = 2;

async function _callWithItemRetry(payload, onApiCall) {
  if (typeof onApiCall === "function") onApiCall();
  const primaryResult = await callGroqWithRetry(payload);

  const normalized = Array.isArray(primaryResult.data)
    ? primaryResult.data
    : [primaryResult.data];

  let failedIndices = normalized
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => !item || _isFailedItem(item))
    .map(({ i }) => i);

  if (failedIndices.length === 0) return primaryResult;

  console.log(`[queue] ${failedIndices.length} failed item(s) — retrying in parallel`);

  for (let attempt = 1; attempt <= MAX_ITEM_RETRIES; attempt++) {
    if (failedIndices.length === 0) break;

    const backoff = (2000 * attempt) + Math.floor(Math.random() * 1500);
    console.log(`[queue] Retry ${attempt}/${MAX_ITEM_RETRIES} — backoff ${backoff}ms, items: [${failedIndices}]`);
    await _sleep(backoff);

    const retryResults = await Promise.allSettled(
      failedIndices.map(async idx => {
        try {
          const itemPayload = _buildItemPayload(payload, normalized[idx], idx);
          if (typeof onApiCall === "function") onApiCall();
          const retryResult = await callGroqWithRetry(itemPayload);
          const retryNorm   = Array.isArray(retryResult.data)
            ? retryResult.data[0]
            : retryResult.data;
          return { idx, retryNorm };
        } catch (err) {
          err._itemIdx = idx;
          throw err;
        }
      })
    );

    const stillFailing = [];
    for (const result of retryResults) {
      if (result.status === "fulfilled") {
        const { idx, retryNorm } = result.value;
        if (retryNorm && !_isFailedItem(retryNorm)) {
          normalized[idx] = retryNorm;
          console.log(`[queue] Item ${idx} recovered on retry ${attempt}`);
        } else {
          stillFailing.push(idx);
        }
      } else {
        const failedIdx = result.reason?._itemIdx;
        console.warn(`[queue] Item ${failedIdx ?? "?"} retry ${attempt} failed:`, result.reason?.code || result.reason?.message);
        if (failedIdx !== undefined) {
          stillFailing.push(failedIdx);
        } else {
          stillFailing.push(...failedIndices);
        }
      }
    }

    failedIndices = [...new Set(stillFailing)];
  }

  for (const idx of failedIndices) {
    console.warn(`[queue] Item ${idx} permanently failed — inserting fallback`);
    normalized[idx] = _fallbackItem(payload, idx);
  }

  return {
    data:  normalized.length === 1 ? normalized[0] : normalized,
    usage: primaryResult.usage,
    model: primaryResult.model,
  };
}

// ── _isFailedItem — hardened against non-string points ───────────
// Root cause: pts[0] was sometimes an object (model returned
// {heading, body} instead of a flat string), causing .includes()
// to throw "not a function".
// Fix: coerce pts[0] to string before calling .includes().
// All other checks (null, empty array, missing points) remain.
function _isFailedItem(item) {
  if (!item || typeof item !== "object")        return true;
  if (item.error === true)                      return true;
  const pts = item.points;
  if (!Array.isArray(pts) || pts.length === 0)  return true;
  // ✅ FIX: coerce to string — pts[0] may be an object or number
  const first = typeof pts[0] === "string" ? pts[0] : String(pts[0] ?? "");
  if (first.includes("Could not generate"))     return true;
  return false;
}

function _buildItemPayload(originalPayload, failedItem, idx) {
  const question = failedItem?.question || `Question ${idx + 1}`;
  return {
    ...originalPayload,
    prompt: _singleQuestionFallbackPrompt(question, originalPayload.marks),
  };
}

function _singleQuestionFallbackPrompt(question, marks = "5M") {
  const m = marks.replace("M", "");
  return `You are a university exam answer writer.
Answer this single ${m}-mark question.
Question: ${question}
Respond ONLY with valid JSON (no markdown, no backticks):
{"question":"${question.replace(/"/g, "'")}","introduction":"","table":null,"points":[],"conclusion":"","mnemonic":"","quick_answer":""}`;
}

function _fallbackItem(payload, idx) {
  return {
    question:     `Question ${idx + 1}`,
    introduction: "",
    table:        null,
    points:       ["Could not generate answer. Please try again."],
    conclusion:   "",
    mnemonic:     "",
    quick_answer: "",
    error:        true,
  };
}

function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = {
  createJob,
  getJob,
  enqueue,
  getDepth,
  isProcessing,
  estimateWaitSec,
};