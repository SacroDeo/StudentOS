from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
try:
    import fitz
except ImportError:
    import pymupdf as fitz
import io
import json
import os

app = Flask(__name__)
CORS(app, origins="*")


def resolve_font(font_family: str, bold: bool, italic: bool) -> str:
    ff = (font_family or "").lower()
    if any(k in ff for k in ("mono", "courier", "space mono")):
        if bold and italic: return "cobi"
        if bold:            return "cob"
        if italic:          return "coi"
        return "co"
    if any(k in ff for k in ("serif", "georgia", "playfair", "merriweather",
                              "baskerville", "crimson", "times", "ibm plex",
                              "source serif", "libre")):
        if bold and italic: return "tibi"
        if bold:            return "tibo"
        if italic:          return "tiit"
        return "ti"
    if bold and italic: return "helbi"
    if bold:            return "hebo"
    if italic:          return "heit"
    return "helv"


def hex_to_rgb(hex_color: str):
    h = (hex_color or "#000000").lstrip("#")
    if len(h) != 6:
        return (0.0, 0.0, 0.0)
    return (int(h[0:2], 16) / 255.0,
            int(h[2:4], 16) / 255.0,
            int(h[4:6], 16) / 255.0)


def packed_int_to_hex(color_int: int) -> str:
    r = (color_int >> 16) & 0xFF
    g = (color_int >>  8) & 0xFF
    b =  color_int        & 0xFF
    return f"#{r:02x}{g:02x}{b:02x}"


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "pymupdf": fitz.version}), 200


@app.route("/extract", methods=["POST"])
def extract():
    try:
        if "pdf" not in request.files:
            return jsonify({"error": "No PDF uploaded"}), 400

        pdf_bytes = request.files["pdf"].read()
        doc       = fitz.open(stream=pdf_bytes, filetype="pdf")
        pages_out = []

        for page_idx in range(doc.page_count):
            page = doc[page_idx]
            pw   = page.rect.width
            ph   = page.rect.height

            raw    = page.get_text("rawdict", flags=fitz.TEXT_PRESERVE_WHITESPACE)
            blocks = raw.get("blocks", [])
            spans_out = []

            for block in blocks:
                if block.get("type") != 0:
                    continue
                for line in block.get("lines", []):
                    line_spans = line.get("spans", [])
                    if not line_spans:
                        continue

                    first     = line_spans[0]
                    font_size = first.get("size", 12)
                    font_name = first.get("font", "")
                    flags     = first.get("flags", 0)
                    color_int = first.get("color", 0)

                    merged_text = "".join(sp.get("text", "") for sp in line_spans)
                    if not merged_text.strip():
                        continue

                    all_bboxes = [sp["bbox"] for sp in line_spans if sp.get("text", "").strip()]
                    if not all_bboxes:
                        continue

                    x0 = min(b[0] for b in all_bboxes)
                    y0 = min(b[1] for b in all_bboxes)
                    x1 = max(b[2] for b in all_bboxes)
                    y1 = max(b[3] for b in all_bboxes)

                    fn_lower  = font_name.lower()
                    is_bold   = ("bold"    in fn_lower) or bool(flags & (1 << 4))
                    is_italic = ("italic"  in fn_lower or "oblique" in fn_lower) or bool(flags & (1 << 1))

                    spans_out.append({
                        "id":         f"p{page_idx+1}s{len(spans_out)}",
                        "text":       merged_text,
                        "x0":         round(x0, 3),
                        "y0":         round(y0, 3),
                        "x1":         round(x1, 3),
                        "y1":         round(y1, 3),
                        "fontSize":   round(font_size, 3),
                        "fontName":   font_name,
                        "bold":       is_bold,
                        "italic":     is_italic,
                        "color":      packed_int_to_hex(color_int),
                        "pageWidth":  pw,
                        "pageHeight": ph,
                    })

            pages_out.append({
                "pageNum":    page_idx + 1,
                "pageWidth":  pw,
                "pageHeight": ph,
                "blocks":     spans_out,
            })

        doc.close()
        return jsonify({"pages": pages_out})

    except Exception as e:
        print(f"[error] /extract: {e}")
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/edit-pdf", methods=["POST"])
def edit_pdf():
    try:
        if "pdf" not in request.files:
            return jsonify({"error": "No PDF uploaded"}), 400

        pdf_bytes  = request.files["pdf"].read()
        edits_json = request.form.get("edits", "{}")
        edits      = json.loads(edits_json)

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        for page_num_str, page_edits in edits.items():
            page_idx = int(page_num_str) - 1
            if page_idx < 0 or page_idx >= doc.page_count:
                continue

            page = doc[page_idx]

            extracted = [e for e in page_edits if not e.get("isNew", False)]
            new_items = [e for e in page_edits if     e.get("isNew", False)]

            # Pass 1: redact changed/deleted blocks
            for edit in extracted:
                orig    = (edit.get("originalText") or "").strip()
                new     = (edit.get("newText")      or "").strip()
                deleted = edit.get("deleted", False)
                if not deleted and new == orig:
                    continue

                x0 = float(edit["x0"])
                y0 = float(edit["y0"])
                x1 = float(edit["x1"])
                y1 = float(edit["y1"])
                fs = float(edit.get("fontSize", 12))

                pad  = fs * 0.3
                rect = fitz.Rect(x0 - 1, y0 - pad, x1 + 1, y1 + pad)
                page.add_redact_annot(rect, fill=(1, 1, 1))

            page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)

            # Pass 2: re-draw changed blocks
            for edit in extracted:
                orig    = (edit.get("originalText") or "").strip()
                new     = (edit.get("newText")      or "").strip()
                deleted = edit.get("deleted", False)
                if deleted or not new or new == orig:
                    continue

                x0   = float(edit["x0"])
                y0   = float(edit["y0"])
                fs   = float(edit.get("fontSize", 12))
                clr  = hex_to_rgb(edit.get("color", "#000000"))
                font = resolve_font(edit.get("fontFamily",""), bool(edit.get("bold")), bool(edit.get("italic")))
                _draw_text(page, x0, y0, fs, new, font, clr)

            # Pass 3: new items
            for item in new_items:
                new  = (item.get("newText") or item.get("text") or "").strip()
                if not new:
                    continue
                x0   = float(item["x0"])
                y0   = float(item["y0"])
                fs   = float(item.get("fontSize", 12))
                clr  = hex_to_rgb(item.get("color", "#000000"))
                font = resolve_font(item.get("fontFamily",""), bool(item.get("bold")), bool(item.get("italic")))
                _draw_text(page, x0, y0, fs, new, font, clr)

        buf = io.BytesIO()
        doc.save(buf, garbage=4, deflate=True, clean=True)
        doc.close()
        buf.seek(0)

        return send_file(buf, mimetype="application/pdf",
                         as_attachment=False, download_name="edited.pdf")

    except Exception as e:
        print(f"[error] /edit-pdf: {e}")
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500


def _draw_text(page, x0, y0, font_size, text, font_name, color):
    baseline = y0 + font_size * 0.85
    line_h   = font_size * 1.2

    for i, line in enumerate(text.split("\n")):
        line = line.rstrip()
        if not line:
            continue
        pt = fitz.Point(x0, baseline + i * line_h)
        try:
            page.insert_text(pt, line, fontname=font_name, fontsize=font_size, color=color)
        except Exception as e:
            print(f"[warn] insert_text: {e} — falling back to helv")
            try:
                page.insert_text(pt, line, fontname="helv", fontsize=font_size, color=color)
            except Exception as e2:
                print(f"[error] helv fallback failed: {e2}")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)