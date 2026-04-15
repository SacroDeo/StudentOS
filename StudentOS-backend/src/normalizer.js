// ── _toStringPoint — coerces any value to a clean string ─────────
// Called on every element before it enters the points array.
// This is the single place that guarantees points[] is always string[].
function _toStringPoint(p) {
  if (typeof p === "string")               return _clean(p);
  if (p === null || p === undefined)       return "";
  if (typeof p === "object" && !Array.isArray(p)) {
    // Model sometimes returns {heading: "...", body: "..."} objects
    return Object.values(p)
      .map(v => (typeof v === "string" ? _clean(v) : ""))
      .filter(Boolean)
      .join(" — ");
  }
  // number, boolean, nested array — stringify as last resort
  return String(p).trim();
}

function normalizeResponse(raw, marks = "5M", fallbackQuestion = "") {
  if (Array.isArray(raw)) {
    return raw.map(item => _normalizeSingle(item, marks, fallbackQuestion)).filter(Boolean);
  }
  const single = _normalizeSingle(raw, marks, fallbackQuestion);
  return single ? [single] : [];
}

function _normalizeSingle(raw, marks, fallbackQuestion) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const m = marks.replace("M", "");
  const [minPts, maxPts] =
    m === "3" ? [4, 5] :
    m === "4" ? [6, 7] :
    [8, 9];

  let points = raw.points;

  if (!raw.points && !raw.introduction && !raw.conclusion) {
    return {
      question:     fallbackQuestion,
      introduction: "",
      table:        null,
      points:       ["Could not generate answer. Please try again."],
      conclusion:   "",
      mnemonic:     "",
      quick_answer: "",
      error:        true,
    };
  }

  if (Array.isArray(points)) {
    // ✅ FIX: every element coerced to string via _toStringPoint
    // before length filter — eliminates the pts[0]?.includes crash
    // because no object/null/number can survive into the array.
    points = points
      .map(_toStringPoint)
      .filter(p => p.length > 5);
  } else if (typeof points === "string") {
    points = points
      .split(/\n|\d+\.\s|[-•]\s/)
      .map(_clean)
      .filter(s => s.length > 20);
  } else {
    points = [];
  }

  if (points.length < minPts) {
    const extra = [raw.introduction, raw.conclusion, raw.quick_answer]
      .filter(Boolean).join(" ")
      .split(".")
      .map(_clean)
      .filter(s => s.length > 30);
    points = [...points, ...extra].slice(0, maxPts);
  }

  points = points.slice(0, maxPts);
  if (!points.length) {
    points = ["Could not generate answer. Please try again."];
  }

  let table = null;
  if (Array.isArray(raw.table) && raw.table.length >= 2) {
    table = raw.table
      .map(row => Array.isArray(row) ? row.map(c => String(c).trim()) : [])
      .filter(row => row.length > 0);

    if (!table.every(row => row.length === table[0].length)) {
      table = null;
    }
  }

  // ✅ FIX: points[0] is guaranteed string here — no conditional needed
  const firstPoint = points[0];

  return {
    question:     _clean(raw.question)     || fallbackQuestion,
    introduction: _clean(raw.introduction) || "",
    table,
    points,
    conclusion:   _clean(raw.conclusion)   || "",
    mnemonic:     _clean(raw.mnemonic)     || "",
    quick_answer: _clean(raw.quick_answer) || "",
    error:        firstPoint.includes("Could not generate"),
  };
}

function _clean(val) {
  if (typeof val !== "string") return "";
  return val.replace(/\*\*/g, "").trim();
}

module.exports = { normalizeResponse };