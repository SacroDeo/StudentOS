require("dotenv").config();

const crypto    = require("crypto");
const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const rateLimit = require("express-rate-limit");

// ── Phase 4: createJob + getJob added to imports ─────────────────
const {
  createJob,
  getJob,
  enqueue,
  getDepth,
  isProcessing,
  estimateWaitSec,
} = require("./src/queue");

const { getStatus }         = require("./src/keyManager");
const { normalizeResponse } = require("./src/normalizer");
const { getThrottleStatus } = require("./src/throttle"); // ✅ Phase 5

const app  = express();
const PORT = process.env.PORT || 3001;

app.set("trust proxy", 1);

// ── Middleware ───────────────────────────────────────────────────
app.use(helmet());
app.use(express.json({ limit: "10mb" }));

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin)                          return cb(null, true);
    if (!ALLOWED_ORIGINS.length)          return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`Origin ${origin} not allowed`));
  },
  credentials: true,
}));

// Express-level rate limit — 30 req / 5 min per IP
const limiter = rateLimit({
  windowMs:        5 * 60 * 1000,
  max:             30,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: "Too many requests. Please wait 5 minutes.", code: "RATE_LIMIT" },
});

// ════════════════════════════════════════════════════════════════
// METRICS
// ════════════════════════════════════════════════════════════════
const metrics = {
  totalRequests: 0,
  apiCalls:      0,
  cacheHits:     0,
  activeUsers:   new Set(),
};
const activeJobRequests = new Set();

function onApiCall() {
  metrics.apiCalls++;
}

// ════════════════════════════════════════════════════════════════
// NORMALIZATION — for cache key generation only
// ════════════════════════════════════════════════════════════════
function normalizeQuestion(q) {
  if (typeof q !== "string") return "";
  return q
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "");
}

// ════════════════════════════════════════════════════════════════
// QUESTION CACHE — sha256 keyed, 500 entries FIFO
// ════════════════════════════════════════════════════════════════
const MAX_CACHE_SIZE   = 500;
const questionCache    = new Map();
const cacheInsertOrder = [];

function questionCacheKey(question, marks, simpleEnglish) {
  const norm = normalizeQuestion(question);
  return crypto
    .createHash("sha256")
    .update(`${norm}|${marks}|${simpleEnglish}`)
    .digest("hex");
}

function cacheGet(key) {
  return questionCache.get(key) || null;
}

function cacheSet(key, result) {
  if (questionCache.has(key)) return;
  if (questionCache.size >= MAX_CACHE_SIZE) {
    const oldest = cacheInsertOrder.shift();
    if (oldest) questionCache.delete(oldest);
  }
  questionCache.set(key, result);
  cacheInsertOrder.push(key);
}

// ════════════════════════════════════════════════════════════════
// PDF CACHE — content-addressed, 100 entries FIFO
// ════════════════════════════════════════════════════════════════
const MAX_PDF_CACHE_SIZE  = 100;
const pdfCache            = new Map();
const pdfCacheInsertOrder = [];

function pdfCacheKey(pdfText) {
  return crypto
    .createHash("sha256")
    .update(typeof pdfText === "string" ? pdfText : String(pdfText))
    .digest("hex");
}

function pdfCacheGet(key) { return pdfCache.get(key) || null; }

function pdfCacheSet(key, result) {
  if (pdfCache.has(key)) return;
  if (pdfCache.size >= MAX_PDF_CACHE_SIZE) {
    const oldest = pdfCacheInsertOrder.shift();
    if (oldest) pdfCache.delete(oldest);
  }
  pdfCache.set(key, result);
  pdfCacheInsertOrder.push(key);
}

// ════════════════════════════════════════════════════════════════
// PER-IP RATE LIMIT — dynamic window based on questionCount
// ════════════════════════════════════════════════════════════════
const IP_WINDOW_MS = 60 * 1000;
const ipTimestamps = new Map();

function getIpLimit(questionCount) {
  return Math.max(40, questionCount * 3);
}

function checkIpRateLimit(ip, questionCount) {
  const now   = Date.now();
  const limit = getIpLimit(questionCount);
  const hits  = (ipTimestamps.get(ip) || []).filter(t => now - t < IP_WINDOW_MS);
  if (hits.length >= limit) return false;
  hits.push(now);
  ipTimestamps.set(ip, hits);
  return true;
}

// ════════════════════════════════════════════════════════════════
// LOAD CONTROL — dynamic batch size cap by queue depth
// ════════════════════════════════════════════════════════════════
const MAX_QUESTIONS_PER_CALL = 10;

function getEffectiveBatchCap(queueDepth) {
  if (queueDepth > 80) return Math.floor(MAX_QUESTIONS_PER_CALL * 0.50); // 10
  if (queueDepth > 50) return Math.floor(MAX_QUESTIONS_PER_CALL * 0.70); // 14
  return MAX_QUESTIONS_PER_CALL;
}

// ════════════════════════════════════════════════════════════════
// PROMPT BUILDER — shared by /api/jobs and /api/generate
// Kept in server.js so queue.js stays format-agnostic.
// ════════════════════════════════════════════════════════════════
function buildPrompt(batch, marks, simpleEnglish) {
  const m          = marks.replace("M", "");
  const simpleNote = simpleEnglish
    ? "Use very simple English. Explain all technical terms in brackets."
    : "";

  if (batch.length === 1) {
    return `You are a university exam answer writer. ${simpleNote}
Answer this ${m}-mark question.
Question: ${batch[0]}
Respond ONLY with valid JSON (no markdown, no backticks):
{"question":"","introduction":"","table":null,"points":[],"conclusion":"","mnemonic":"","quick_answer":""}`;
  }

  const qList = batch.map((q, i) => `${i + 1}. ${q}`).join("\n");
  return `You are a university exam answer writer. ${simpleNote}
Answer EXACTLY ${batch.length} ${m}-mark questions below.
Return a JSON ARRAY of ${batch.length} objects, one per question, in order.
Each object: {"question":"","introduction":"","table":null,"points":[],"conclusion":"","mnemonic":"","quick_answer":""}

Questions:
${qList}`;
}

// ════════════════════════════════════════════════════════════════
// POST /api/jobs  — Phase 4 async job endpoint
//
// Accepts a bulk questions array, registers a background job,
// returns 202 + jobId immediately. Frontend polls GET /api/jobs/:id.
// Connection is never held open — no blocked Express slots.
// ════════════════════════════════════════════════════════════════
app.post("/api/jobs", limiter, async (req, res) => {

    const clientIp = req.ip || req.connection?.remoteAddress || "unknown";
  
  if (activeJobRequests.has(clientIp)) {
    return res.status(429).json({
      error: "You already have a running request. Wait.",
    });
  }

  activeJobRequests.add(clientIp);

  try {
const {
    questions     = [],
    marks         = "5M",
    simpleEnglish = false,
    pdfText       = null,
  } = req.body;


  // ── Validation ────────────────────────────────────────────────
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({
      error: "questions must be a non-empty array.",
      code:  "VALIDATION",
    });
  }
  if (!["3M", "4M", "5M"].includes(marks)) {
    return res.status(400).json({
      error: "marks must be 3M, 4M, or 5M.",
      code:  "VALIDATION",
    });
  }
  if (questions.length > 150) {
    return res.status(400).json({
      error: "Maximum 150 questions per job.",
      code:  "BATCH_TOO_LARGE",
    });
  }

  metrics.totalRequests++;
  metrics.activeUsers.add(clientIp);

  // ── PDF cache check — return immediately on hit ───────────────
  if (pdfText && typeof pdfText === "string" && pdfText.trim().length > 0) {
    const pdfKey    = pdfCacheKey(pdfText);
    const pdfCached = pdfCacheGet(pdfKey);
    if (pdfCached) {
      metrics.cacheHits++;
      console.log(`[/api/jobs] ${clientIp} — PDF cache hit`);
      return res.json({
        success: true,
        results: pdfCached,
        cached:  true,
        source:  "pdf_cache",
      });
    }
  }

  // ── Question cache — filter out already-cached questions ──────
  const cachedResults     = [];
  const uncachedQuestions = [];
  const uncachedIndices   = [];

  questions.forEach((q, i) => {
    const key    = questionCacheKey(q, marks, simpleEnglish);
    const cached = cacheGet(key);
    if (cached) {
      metrics.cacheHits++;
      cachedResults.push({ index: i, result: { ...cached, cached: true } });
    } else {
      uncachedIndices.push(i);
      uncachedQuestions.push(q);
    }
  });

  // Full cache hit — skip queue entirely
  if (uncachedQuestions.length === 0) {
    const ordered = cachedResults.sort((a, b) => a.index - b.index).map(r => r.result);
    console.log(`[/api/jobs] ${clientIp} — 100% cache hit (${questions.length} questions)`);
    return res.json({ success: true, results: ordered, cached: true });
  }

  // ── Create background job ─────────────────────────────────────
  try {
    const job = createJob({
      questions:    uncachedQuestions,
      marks,
      simpleEnglish,
      ip:           clientIp,
      buildPrompt,
      onApiCall,
      // Pass cache writers so queue.js can populate cache as batches complete
      onBatchComplete: (batchQuestions, batchResults) => {
        batchQuestions.forEach((q, i) => {
          const answer = batchResults[i];
          if (answer && !answer.error) {
            cacheSet(questionCacheKey(q, marks, simpleEnglish), answer);
          }
        });
      },
      // Pass pdfCacheSet so completed PDF jobs are cached
      onJobComplete: (results) => {
        if (pdfText && typeof pdfText === "string" && pdfText.trim().length > 0) {
          pdfCacheSet(pdfCacheKey(pdfText), results);
          console.log(`[/api/jobs] PDF result cached for future requests`);
        }
      },
      // Pass pre-cached results so job response merges them correctly
      cachedResults,
      uncachedIndices,
      totalQuestionCount: questions.length,
    });

    console.log(`[/api/jobs] ${clientIp} — job ${job.jobId} created (${uncachedQuestions.length} uncached, ${cachedResults.length} from cache)`);

    return res.status(202).json({
      success:            true,
      jobId:              job.jobId,
      totalBatches:       job.totalBatches,
      totalQuestions:     job.totalQuestions,
      cachedCount:        cachedResults.length,
      deduped:            job.deduped,
      estimatedWaitSec:   job.estimatedWaitSec,
      queuePosition:      getDepth(),
      pollUrl:            `/api/jobs/${job.jobId}`,
    });

  }catch (err) {
  const statusMap = { TOO_MANY_JOBS: 429, QUEUE_FULL: 503 };
  return res
    .status(statusMap[err.code] || 500)
    .json({ error: err.message, code: err.code });
}
} catch (err) {
  console.error(err);
  return res.status(500).json({ error: "Server error" });
} finally {
  activeJobRequests.delete(clientIp);
}
});
// ════════════════════════════════════════════════════════════════
// GET /api/jobs/:id — poll job status + progress
//
// Returns live progress while processing, full results when done.
// Frontend polls this every 2s until status === "completed".
// ════════════════════════════════════════════════════════════════
app.get("/api/jobs/:id", (req, res) => {
  const job = getJob(req.params.id);

  if (!job) {
    return res.status(404).json({
      error: "Job not found or expired.",
      code:  "JOB_NOT_FOUND",
    });
  }

  const percent = job.totalBatches > 0
    ? Math.round((job.doneBatches / job.totalBatches) * 100)
    : 0;

  const response = {
    jobId:    job.id,
    status:   job.status,
    progress: {
      done:    job.doneBatches,
      total:   job.totalBatches,
      percent,
    },
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };

  // Only attach results when fully complete — no partial arrays
  if (job.status === "completed") {
    response.results    = job.results.filter(Boolean);
    response.totalCount = response.results.length;
  }

  if (job.status === "failed") {
    response.error = job.error;
  }

  return res.json(response);
});

// ════════════════════════════════════════════════════════════════
// POST /api/generate — legacy single-question / small batch path
// Unchanged from before Phase 4. Still used by single-question
// calls from the frontend. Bulk jobs should use /api/jobs instead.
// ════════════════════════════════════════════════════════════════
app.post("/api/generate", limiter, async (req, res) => {
  const {
    prompt,
    marks            = "5M",
    simpleEnglish    = false,
    fallbackQuestion = "",
    questionCount    = 1,
    questions        = [],
    pdfText          = null,
  } = req.body;

  const clientIp = req.ip || req.connection?.remoteAddress || "unknown";

  metrics.totalRequests++;
  metrics.activeUsers.add(clientIp);

  // ── Validation ────────────────────────────────────────────────
  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 10) {
    return res.status(400).json({ error: "prompt is required and must be at least 10 characters." });
  }
  if (!["3M", "4M", "5M"].includes(marks)) {
    return res.status(400).json({ error: "marks must be 3M, 4M, or 5M." });
  }
  if (!checkIpRateLimit(clientIp, questionCount)) {
    console.warn(`[/api/generate] Rate limit hit for IP ${clientIp}`);
    return res.status(429).json({ error: "Too many requests. Please wait.", code: "IP_RATE_LIMIT" });
  }

  const currentDepth = getDepth();
  if (currentDepth >= 100) {
    return res.status(503).json({ error: "Server is busy. Please try again.", code: "QUEUE_FULL" });
  }

  const effectiveCap = getEffectiveBatchCap(currentDepth);
  if (questionCount > effectiveCap) {
    return res.status(400).json({
      error: `Server load is high. Max ${effectiveCap} questions right now.`,
      code:  "BATCH_TOO_LARGE",
    });
  }

  // ── PDF cache ─────────────────────────────────────────────────
  if (pdfText && typeof pdfText === "string" && pdfText.trim().length > 0) {
    const pdfKey    = pdfCacheKey(pdfText);
    const pdfCached = pdfCacheGet(pdfKey);
    if (pdfCached) {
      metrics.cacheHits++;
      return res.json({ success: true, results: pdfCached, cached: true, source: "pdf_cache", queueDepth: getDepth() });
    }
  }

  // ── Question cache ────────────────────────────────────────────
  let cachedResults     = [];
  let uncachedIndices   = [];
  let uncachedQuestions = [];

  if (Array.isArray(questions) && questions.length > 0) {
    questions.forEach((q, i) => {
      const key    = questionCacheKey(q, marks, simpleEnglish);
      const cached = cacheGet(key);
      if (cached) {
        metrics.cacheHits++;
        cachedResults.push({ index: i, result: { ...cached, cached: true } });
      } else {
        uncachedIndices.push(i);
        uncachedQuestions.push(q);
      }
    });
  }

  if (Array.isArray(questions) && questions.length > 0 && uncachedQuestions.length === 0) {
    const ordered = cachedResults.sort((a, b) => a.index - b.index).map(r => r.result);
    return res.json({ success: true, results: ordered, cached: true, queueDepth: getDepth() });
  }

  // ── Dedup ─────────────────────────────────────────────────────
  const uniqueMap  = new Map();
  const uniqueList = [];
  const dupMap     = [];

  uncachedQuestions.forEach((q) => {
    const norm = normalizeQuestion(q);
    if (!uniqueMap.has(norm)) {
      uniqueMap.set(norm, uniqueList.length);
      uniqueList.push(q);
    }
    dupMap.push(uniqueMap.get(norm));
  });

  const dedupedCount = uncachedQuestions.length - uniqueList.length;
  if (dedupedCount > 0) {
    console.log(`[/api/generate] ${clientIp} — collapsed ${dedupedCount} duplicate(s)`);
  }

  const safePrompt = prompt.slice(0, 8000);

  try {

    const result     = await enqueue({ prompt: safePrompt, marks, simpleEnglish, ip: clientIp }, onApiCall);
    const normalized = normalizeResponse(result.data, marks, fallbackQuestion);

    if (pdfText && typeof pdfText === "string" && pdfText.trim().length > 0) {
      pdfCacheSet(pdfCacheKey(pdfText), normalized);
    }

    if (Array.isArray(questions) && questions.length > 0 && normalized.length > 0) {
      const expandedFresh = uncachedQuestions.map((q, i) => normalized[dupMap[i]] || null);

      uncachedQuestions.forEach((q, i) => {
        const answer = expandedFresh[i];
        if (answer && !answer.error) {
          cacheSet(questionCacheKey(q, marks, simpleEnglish), answer);
        }
      });

      const merged = new Array(questions.length);
      cachedResults.forEach(({ index, result: r }) => { merged[index] = r; });
      uncachedIndices.forEach((origIdx, i) => {
        if (expandedFresh[i]) merged[origIdx] = expandedFresh[i];
      });

      return res.json({
        success:    true,
        results:    merged.filter(Boolean),
        usage:      result.usage,
        model:      result.model,
        queueDepth: getDepth(),
        cacheStats: { cached: cachedResults.length, fresh: expandedFresh.filter(Boolean).length, deduped: dedupedCount },
      });
    }

    if (fallbackQuestion && normalized.length > 0) {
      cacheSet(questionCacheKey(fallbackQuestion, marks, simpleEnglish), normalized[0]);
    }

    return res.json({
      success:    true,
      results:    normalized,
      usage:      result.usage,
      model:      result.model,
      queueDepth: getDepth(),
    });

  } catch (err) {
    const code = err.code || "UNKNOWN";
    const msg  = err.message || "Something went wrong.";
    console.error(`[/api/generate] ${clientIp} — ${code}: ${msg}`);

    const statusMap = {
      QUEUE_FULL:        503,
      TOO_MANY_JOBS:     429,
      ALL_KEYS_BUSY:     503,
      RATE_LIMIT:        429,
      IP_RATE_LIMIT:     429,
      TIMEOUT:           504,
      AUTH_ERROR:        500,
      BAD_JSON:          502,
      BATCH_TOO_LARGE:   400,
      THROTTLE_TIMEOUT:  503, // ✅ Phase 5: map throttle timeout to 503
    };

    return res
      .status(statusMap[code] || 500)
      .json({ error: code === "AUTH_ERROR" ? "Server configuration error." : msg, code });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /metrics
// ════════════════════════════════════════════════════════════════
app.get("/metrics", (req, res) => {
  const total   = metrics.totalRequests;
  const hitRate = total > 0 ? ((metrics.cacheHits / total) * 100).toFixed(1) : "0.0";

  res.json({
    totalRequests:     total,
    apiCalls:          metrics.apiCalls,
    cacheHits:         metrics.cacheHits,
    cacheHitRate:      `${hitRate}%`,
    activeUsers:       metrics.activeUsers.size,
    queueSize:         getDepth(),
    questionCacheSize: questionCache.size,
    pdfCacheSize:      pdfCache.size,
  });
});

// ════════════════════════════════════════════════════════════════
// GET /api/health
// ════════════════════════════════════════════════════════════════
app.get("/api/health", (req, res) => {
  res.json({
    status:   "ok",
    uptime:   Math.floor(process.uptime()) + "s",
    queue:    { depth: getDepth(), processing: isProcessing(), estimatedWaitSec: estimateWaitSec() },
    keys:     getStatus(),
    throttle: getThrottleStatus(), // ✅ Phase 5: live token bucket visibility
    cache:    {
      questions: { size: questionCache.size, max: MAX_CACHE_SIZE },
      pdf:       { size: pdfCache.size,      max: MAX_PDF_CACHE_SIZE },
    },
    metrics: {
      totalRequests: metrics.totalRequests,
      apiCalls:      metrics.apiCalls,
      cacheHits:     metrics.cacheHits,
      activeUsers:   metrics.activeUsers.size,
    },
    memory: process.memoryUsage().heapUsed,
    env:    process.env.NODE_ENV || "development",
  });
});

// ════════════════════════════════════════════════════════════════
// GET /api/queue
// ════════════════════════════════════════════════════════════════
app.get("/api/queue", (req, res) => {
  res.json({
    depth:            getDepth(),
    processing:       isProcessing(),
    estimatedWaitSec: estimateWaitSec(),
  });
});

// ── 404 ─────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// ── Global error handler ─────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error("[server] Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error." });
});

// ── Start ────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
console.log(`\n🚀 Examify backend running on port ${PORT}`);
  console.log(`   Health:  http://localhost:${PORT}/api/health`);
  console.log(`   Queue:   http://localhost:${PORT}/api/queue`);
  console.log(`   Metrics: http://localhost:${PORT}/metrics`);
  console.log(`   Jobs:    POST http://localhost:${PORT}/api/jobs\n`);
});

module.exports = app;