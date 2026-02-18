from flask import Blueprint, request, jsonify
import tensorflow as tf
import numpy as np
from PIL import Image
import io
import os
import base64
import cv2

ripeness_routes = Blueprint('ripeness', __name__, url_prefix='/api/ripeness')

CLASS_NAMES = ['overripe', 'ripe', 'underripe']

DETECTOR_MODEL_PATH = 'train_model/final_model/avocado_detector_best copy.keras'
RIPENESS_MODEL_PATH = 'train_model/final_model/ripe_best_model.h5'

DETECTOR_INPUT_SIZE = (224, 224)
DETECTION_THRESHOLD = 0.25   # kept low — dynamic threshold tightens further
NMS_IOU_THRESHOLD   = 0.45

# ── Load models ───────────────────────────────────────────────────────────────
detector_model = None
ripeness_model = None

try:
    if os.path.exists(DETECTOR_MODEL_PATH):
        detector_model = tf.keras.models.load_model(DETECTOR_MODEL_PATH)
        print(f"✅ Detector loaded: {DETECTOR_MODEL_PATH}")
        print(f"   input  : {detector_model.input_shape}")
        print(f"   output : {detector_model.output_shape}")
    else:
        print(f"⚠️  Detector not found at {DETECTOR_MODEL_PATH}")
except Exception as e:
    print(f"⚠️  Detector load error: {e}")

try:
    if os.path.exists(RIPENESS_MODEL_PATH):
        ripeness_model = tf.keras.models.load_model(RIPENESS_MODEL_PATH)
        print(f"✅ Ripeness model loaded: {RIPENESS_MODEL_PATH}")
        print(f"   output : {ripeness_model.output_shape}")
        print(f"   classes: {CLASS_NAMES}")
    else:
        print(f"⚠️  Ripeness model not found at {RIPENESS_MODEL_PATH}")
except Exception as e:
    print(f"⚠️  Ripeness model load error: {e}")


# ═════════════════════════════════════════════════════════════════════════════
# DUMP HELPER (printed to server log every request — invaluable for debugging)
# ═════════════════════════════════════════════════════════════════════════════

def _dump_raw_output(raw_output):
    print("\n" + "=" * 60)
    print("  DETECTOR RAW OUTPUT DUMP")
    print("=" * 60)
    if isinstance(raw_output, (list, tuple)):
        print(f"  type  = list/tuple  len={len(raw_output)}")
        for i, t in enumerate(raw_output):
            arr = np.array(t)
            flat = arr.flatten()
            print(f"  [{i}] shape={arr.shape}  dtype={arr.dtype}")
            print(f"       min={flat.min():.6f}  max={flat.max():.6f}  mean={flat.mean():.6f}")
            print(f"       first 10 values: {flat[:10].tolist()}")
            if arr.ndim == 3 and arr.shape[1] > 0:
                print(f"       row[0][0]: {arr[0, 0].tolist()}")
    else:
        arr = np.array(raw_output)
        flat = arr.flatten()
        print(f"  type  = ndarray  shape={arr.shape}  dtype={arr.dtype}")
        print(f"  min={flat.min():.6f}  max={flat.max():.6f}  mean={flat.mean():.6f}")
        if arr.ndim == 3 and arr.shape[1] > 0:
            for row in arr[0, :5]:
                print(f"  row: {row.tolist()}")
        elif arr.ndim == 2:
            for row in arr[:5]:
                print(f"  row: {row.tolist()}")
        elif arr.size <= 30:
            print(f"  values: {flat.tolist()}")
        else:
            print(f"  first 20: {flat[:20].tolist()}")
    print("=" * 60 + "\n")


# ═════════════════════════════════════════════════════════════════════════════
# FORMAT PARSERS  →  candidates list:
#   [{box:[x1,y1,x2,y2], score:float, norm:bool, tf_yx:bool}, ...]
# All boxes are in corner format [x1,y1,x2,y2].  Pixel-conversion done later.
# ═════════════════════════════════════════════════════════════════════════════

def _is_norm(arr):
    """True when all values ∈ [0, 1]."""
    a = np.array(arr, dtype=float).flatten()
    return bool(a.min() >= 0.0 and a.max() <= 1.0)


def _center_to_corner(cx, cy, w, h):
    return cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2


def _parse_candidates(raw_output):
    """
    Convert ANY detector output to a unified list of candidate dicts.
    Handles:
      A  list of 2 tensors  [boxes(1,N,4), scores(1,N)]
      B  list of 3+ tensors [boxes(1,N,4), scores(1,N), classes...]
      C  single (1,N,5+)    YOLO/SSD style
      D  single (1,N,4)     boxes only
      E  single (1,5)/(5,)  one box + confidence
      F  single (1,4)/(4,)  one box
    """
    out = []

    # ── A / B  two-or-more-tensor ─────────────────────────────────────────────
    if isinstance(raw_output, (list, tuple)) and len(raw_output) >= 2:
        boxes_arr  = np.array(raw_output[0])
        scores_arr = np.array(raw_output[1])
        if boxes_arr.ndim == 3: boxes_arr  = boxes_arr[0]
        if scores_arr.ndim >= 2: scores_arr = scores_arr[0]
        norm = _is_norm(boxes_arr)
        print(f"  Parser A/B: {len(boxes_arr)} boxes  norm={norm}")
        for box, score in zip(boxes_arr, scores_arr):
            out.append({'box': box[:4].tolist(), 'score': float(score),
                        'norm': norm, 'tf_yx': True})
        return out

    arr = np.array(raw_output)

    # ── C  (1, N, 5+) ─────────────────────────────────────────────────────────
    if arr.ndim == 3 and arr.shape[2] >= 5:
        preds = arr[0]   # (N, 5+)
        norm  = _is_norm(preds[:, :4])
        # Decide corner vs center format:
        #   corner: x2>x1 and y2>y1 for most rows
        #   center: x2 (=w) might be < x1 (=cx) when object is near edge
        sample = preds[:min(30, len(preds))]
        corner_votes = int(np.sum(
            (sample[:, 2] > sample[:, 0]) & (sample[:, 3] > sample[:, 1])
        ))
        is_corner = corner_votes >= len(sample) * 0.55
        print(f"  Parser C: {len(preds)} rows  norm={norm}  "
              f"corner_votes={corner_votes}/{len(sample)}  is_corner={is_corner}")
        for pred in preds:
            b = pred[:4].tolist()
            if not is_corner:
                b = list(_center_to_corner(*b))
            out.append({'box': b, 'score': float(pred[4]),
                        'norm': norm, 'tf_yx': False})
        return out

    # ── D  (1, N, 4) — boxes only ────────────────────────────────────────────
    if arr.ndim == 3 and arr.shape[2] == 4:
        preds = arr[0]
        norm  = _is_norm(preds)
        print(f"  Parser D: {len(preds)} boxes (no scores)  norm={norm}")
        for box in preds:
            out.append({'box': box.tolist(), 'score': 1.0,
                        'norm': norm, 'tf_yx': False})
        return out

    flat = arr.flatten()

    # ── E  5 values — one box + score ────────────────────────────────────────
    if flat.size == 5:
        norm = _is_norm(flat[:4])
        print(f"  Parser E: single box+score  norm={norm}")
        out.append({'box': flat[:4].tolist(), 'score': float(flat[4]),
                    'norm': norm, 'tf_yx': False})
        return out

    # ── F  4 values — one box ────────────────────────────────────────────────
    if flat.size == 4:
        norm = _is_norm(flat)
        print(f"  Parser F: single box (no score)  norm={norm}")
        out.append({'box': flat.tolist(), 'score': 1.0,
                    'norm': norm, 'tf_yx': False})
        return out

    print(f"  ⚠️  Unknown output format — shape={arr.shape}")
    return []


# ═════════════════════════════════════════════════════════════════════════════
# STAGE 1 — AVOCADO DETECTOR
# ═════════════════════════════════════════════════════════════════════════════

def detect_avocados_with_model(image_bytes):
    image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    img_w, img_h = image.size
    print(f"\n🔎 Stage 1 — image={img_w}×{img_h}")

    if detector_model is None:
        print("   ⚠️  No detector — full-image fallback")
        return _full_image_fallback(img_w, img_h), (img_w, img_h)

    # ── Infer input size from model ───────────────────────────────────────────
    try:
        _, in_h, in_w, _ = detector_model.input_shape
        input_size = (in_w or 224, in_h or 224)
    except Exception:
        input_size = DETECTOR_INPUT_SIZE

    # ── Run detector ──────────────────────────────────────────────────────────
    resized   = image.resize(input_size)
    img_array = np.array(resized, dtype=np.float32) / 255.0
    img_array = np.expand_dims(img_array, axis=0)
    print(f"   Input: {img_array.shape}  [{img_array.min():.3f},{img_array.max():.3f}]")

    raw_output = detector_model.predict(img_array, verbose=0)
    _dump_raw_output(raw_output)

    # ── Parse ─────────────────────────────────────────────────────────────────
    candidates = _parse_candidates(raw_output)
    print(f"   Parsed {len(candidates)} candidates")

    if not candidates:
        return _full_image_fallback(img_w, img_h), (img_w, img_h)

    all_scores = [c['score'] for c in candidates]
    print(f"   Scores — min={min(all_scores):.4f}  max={max(all_scores):.4f}  "
          f"mean={np.mean(all_scores):.4f}  median={np.median(all_scores):.4f}")

    # Dynamic threshold: use 40% of top score so low-magnitude models still work
    dynamic_thresh = min(DETECTION_THRESHOLD, max(all_scores) * 0.40)
    print(f"   Dynamic threshold = {dynamic_thresh:.4f}")

    # ── Convert to pixel [x,y,w,h] for OpenCV NMS ───────────────────────────
    cv_boxes    = []
    kept_scores = []

    for c in candidates:
        if c['score'] < dynamic_thresh:
            continue

        x1, y1, x2, y2 = c['box']

        # TF OD API returns [y1, x1, y2, x2] — swap to standard x,y
        if c.get('tf_yx', False):
            x1, y1, x2, y2 = y1, x1, y2, x2

        if c['norm']:
            x1 *= img_w; y1 *= img_h; x2 *= img_w; y2 *= img_h

        x = int(x1); y = int(y1)
        w = int(x2 - x1); h = int(y2 - y1)

        if w < 3 or h < 3:
            continue

        cv_boxes.append([x, y, max(1, w), max(1, h)])
        kept_scores.append(float(c['score']))

    print(f"   Kept after threshold+size filter: {len(cv_boxes)}")

    if not cv_boxes:
        print("   ⚠️  No valid boxes — full-image fallback")
        return _full_image_fallback(img_w, img_h), (img_w, img_h)

    # ── NMS ───────────────────────────────────────────────────────────────────
    indices = cv2.dnn.NMSBoxes(cv_boxes, kept_scores, dynamic_thresh, NMS_IOU_THRESHOLD)
    if len(indices) == 0:
        return _full_image_fallback(img_w, img_h), (img_w, img_h)

    indices = indices.flatten()
    print(f"   After NMS: {len(indices)} detection(s)")

    # ── Build result dicts ────────────────────────────────────────────────────
    detections = []
    for det_id, idx in enumerate(indices, start=1):
        x, y, w, h = cv_boxes[idx]
        score       = kept_scores[idx]

        x = max(0, min(x, img_w - 1)); w = max(1, min(w, img_w - x))
        y = max(0, min(y, img_h - 1)); h = max(1, min(h, img_h - y))

        detections.append({
            'id':                   det_id,
            'bbox':                 [x, y, w, h],
            'bbox_normalized':      [round(x/img_w,6), round(y/img_h,6),
                                     round(w/img_w,6), round(h/img_h,6)],
            'detection_confidence': round(score, 6),
            'is_fallback':          False,
        })
        print(f"   📍 #{det_id} px=[{x},{y},{w},{h}]  "
              f"n=[{x/img_w:.3f},{y/img_h:.3f},{w/img_w:.3f},{h/img_h:.3f}]  "
              f"conf={score:.4f}")

    # Sort largest-area first
    detections.sort(key=lambda d: d['bbox'][2] * d['bbox'][3], reverse=True)
    for i, d in enumerate(detections, 1):
        d['id'] = i

    print(f"   ✅ {len(detections)} avocado(s) detected\n")
    return detections, (img_w, img_h)


def _full_image_fallback(img_w, img_h):
    return [{
        'id': 1, 'bbox': [0, 0, img_w, img_h],
        'bbox_normalized': [0.0, 0.0, 1.0, 1.0],
        'detection_confidence': 0.0, 'is_fallback': True,
    }]


# ═════════════════════════════════════════════════════════════════════════════
# STAGE 2 — RIPENESS CLASSIFIER
# ═════════════════════════════════════════════════════════════════════════════

def classify_region(image_bytes, bbox):
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        img_w, img_h = image.size
        x, y, w, h = bbox
        x = max(0, min(x, img_w-1)); w = max(1, min(w, img_w-x))
        y = max(0, min(y, img_h-1)); h = max(1, min(h, img_h-y))

        region    = image.crop((x, y, x+w, y+h)).resize((224, 224))
        img_array = np.expand_dims(
            np.array(region, dtype=np.float32) / 255.0, axis=0
        )

        if ripeness_model:
            raw = ripeness_model.predict(img_array, verbose=0)[0]
            print(f"   🔍 Ripeness raw: {raw}")
            if raw.max() > 1.0 or raw.min() < 0.0:
                e = np.exp(raw - raw.max())
                probs = e / e.sum()
            else:
                probs = raw / raw.sum()
            idx        = int(np.argmax(probs))
            confidence = float(probs[idx])
            cls        = CLASS_NAMES[idx]
            all_probs  = {CLASS_NAMES[i]: float(probs[i]) for i in range(len(CLASS_NAMES))}
            print(f"   ✅ {cls} ({confidence:.2%})  all={all_probs}")
        else:
            import random
            cls = random.choice(CLASS_NAMES)
            confidence = random.uniform(0.7, 0.95)
            base = [random.random() for _ in CLASS_NAMES]
            total = sum(base)
            all_probs = {CLASS_NAMES[i]: base[i]/total for i in range(len(CLASS_NAMES))}

        return {'class': cls, 'confidence': confidence, 'all_probabilities': all_probs}
    except Exception as e:
        import traceback; traceback.print_exc()
        return {'class': 'ripe', 'confidence': 0.5,
                'all_probabilities': {c: 1/len(CLASS_NAMES) for c in CLASS_NAMES}}


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def determine_texture(cls):
    return {'underripe':'Very Firm','ripe':'Slightly Soft','overripe':'Very Soft'}.get(cls,'Unknown')

def determine_days_to_ripe(cls):
    return {'underripe':'4-7 days','ripe':'Ready now','overripe':'Past ripe'}.get(cls,'Unknown')

def get_recommendation(cls):
    return {
        'underripe':'Leave at room temperature. Place in a paper bag with a banana to speed ripening.',
        'ripe':     'Perfect for eating! Enjoy within 1-2 days or refrigerate to extend freshness.',
        'overripe': 'Best for guacamole, smoothies, or baking. Still nutritious despite soft texture.',
    }.get(cls,"Monitor the fruit's condition")


# ═════════════════════════════════════════════════════════════════════════════
# ROUTES
# ═════════════════════════════════════════════════════════════════════════════

def _parse_image():
    if 'image' in request.files:
        f = request.files['image']
        if not f.filename: raise ValueError("Empty filename")
        return f.read()
    if 'image' in request.form:
        d = request.form['image']
        if d.startswith('data:') and ',' in d: d = d.split(',',1)[1]
        return base64.b64decode(d.strip().replace('\n','').replace('\r','').replace(' ',''))
    if request.data:
        return request.data
    raise ValueError("No image provided")


@ripeness_routes.route('/predict', methods=['POST'])
def predict():
    try:
        print(f"\n{'#'*60}\n  📥  /api/ripeness/predict\n{'#'*60}")
        try:
            image_bytes = _parse_image()
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 400

        if len(image_bytes) < 100:
            return jsonify({"success": False, "error": "Image too small"}), 400

        print(f"✅ {len(image_bytes):,} bytes received")

        # ═════════════════════════════════════════════════════════════════════
        # STAGE 1: DETECT ALL AVOCADOS IN IMAGE
        # Returns bounding boxes for each detected avocado
        # ═════════════════════════════════════════════════════════════════════
        detections, img_size = detect_avocados_with_model(image_bytes)

        # ═════════════════════════════════════════════════════════════════════
        # STAGE 2: CLASSIFY RIPENESS FOR EACH DETECTED AVOCADO
        # Apply ripeness model to each bounding box region
        # ═════════════════════════════════════════════════════════════════════
        print(f"🍃 Stage 2 — classifying {len(detections)} region(s)")
        classified = []
        for det in detections:
            clf = classify_region(image_bytes, det['bbox'])
            classified.append({
                'id':                   det['id'],
                'class':                clf['class'],
                'confidence':           clf['confidence'],
                'detection_confidence': det['detection_confidence'],
                'bbox':                 det['bbox_normalized'],
                'bbox_absolute':        det['bbox'],
                'texture':              determine_texture(clf['class']),
                'days_to_ripe':         determine_days_to_ripe(clf['class']),
                'recommendation':       get_recommendation(clf['class']),
                'all_probabilities':    clf['all_probabilities'],
                'is_fallback':          det.get('is_fallback', False),
            })
            fb = '  ⚠️ FALLBACK' if det.get('is_fallback') else ''
            print(f"   🥑 #{det['id']} → {clf['class']} ({clf['confidence']*100:.1f}%)"
                  f"  det={det['detection_confidence']:.3f}{fb}")

        classified.sort(key=lambda x: x['id'])
        primary = classified[0]

        return jsonify({
            "success":    True,
            "count":      len(classified),
            "image_size": {"width": img_size[0], "height": img_size[1]},
            "prediction": {
                "type":           "FRUIT",
                "ripeness":       primary['class'],
                "ripeness_level": CLASS_NAMES.index(primary['class']),
                "texture":        primary['texture'],
                "confidence":     primary['confidence'],
                "days_to_ripe":   primary['days_to_ripe'],
                "recommendation": primary['recommendation'],
                "bbox":           primary['bbox'],
                "is_fallback":    primary['is_fallback'],
            },
            "all_probabilities": primary['all_probabilities'],
            "detections":        classified,
        })

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@ripeness_routes.route('/diagnose', methods=['POST'])
def diagnose():
    """
    POST /api/ripeness/diagnose
    Upload an image and get a full JSON dump of the raw detector output.
    Use this to find the exact format your model returns so we can tune parsing.
    """
    try:
        try:
            image_bytes = _parse_image()
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 400

        if detector_model is None:
            return jsonify({"success": False,
                            "error": "Detector not loaded",
                            "path": DETECTOR_MODEL_PATH}), 503

        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        img_w, img_h = image.size

        try:
            _, in_h, in_w, _ = detector_model.input_shape
            input_size = (in_w or 224, in_h or 224)
        except Exception:
            input_size = DETECTOR_INPUT_SIZE

        resized   = image.resize(input_size)
        img_array = np.expand_dims(np.array(resized, dtype=np.float32)/255.0, axis=0)
        raw       = detector_model.predict(img_array, verbose=0)

        def _desc(t):
            a = np.array(t); flat = a.flatten()
            d = {'shape': list(a.shape), 'dtype': str(a.dtype),
                 'min': float(flat.min()), 'max': float(flat.max()),
                 'mean': float(flat.mean()), 'first_20': flat[:20].tolist()}
            if a.ndim == 3 and a.shape[1] > 0:
                d['rows_sample'] = a[0, :5].tolist()
            elif a.ndim == 2:
                d['rows_sample'] = a[:5].tolist()
            return d

        if isinstance(raw, (list, tuple)):
            raw_info = {'type':'list', 'len':len(raw), 'tensors':[_desc(t) for t in raw]}
        else:
            raw_info = {'type':'ndarray', 'tensor':_desc(raw)}

        candidates  = _parse_candidates(raw)
        all_scores  = [c['score'] for c in candidates]

        return jsonify({
            "success":       True,
            "image_size":    {"width": img_w, "height": img_h},
            "input_size":    {"width": input_size[0], "height": input_size[1]},
            "model_input":   str(detector_model.input_shape),
            "model_output":  str(detector_model.output_shape),
            "raw_output":    raw_info,
            "n_candidates":  len(candidates),
            "score_stats":   {
                "min":         float(min(all_scores)) if all_scores else None,
                "max":         float(max(all_scores)) if all_scores else None,
                "mean":        float(np.mean(all_scores)) if all_scores else None,
                "median":      float(np.median(all_scores)) if all_scores else None,
                "above_0.50":  sum(1 for s in all_scores if s >= 0.50),
                "above_0.25":  sum(1 for s in all_scores if s >= 0.25),
                "above_0.10":  sum(1 for s in all_scores if s >= 0.10),
                "above_0.05":  sum(1 for s in all_scores if s >= 0.05),
            },
            "tip": ("POST an image here then check score_stats to find the right "
                    "DETECTION_THRESHOLD value in ripeness_routes.py"),
        })

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@ripeness_routes.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status":              "healthy",
        "detector_loaded":     detector_model is not None,
        "ripeness_loaded":     ripeness_model is not None,
        "detector_output":     str(detector_model.output_shape) if detector_model else None,
        "ripeness_output":     str(ripeness_model.output_shape) if ripeness_model else None,
        "classes":             CLASS_NAMES,
        "detection_threshold": DETECTION_THRESHOLD,
        "pipeline": [
            "Stage 1 – avocado_detector_best.keras → per-avocado bounding boxes (NMS)",
            "Stage 2 – ripe_best_model.h5           → ripeness class per crop",
        ],
    })


@ripeness_routes.route('/classes', methods=['GET'])
def get_classes():
    return jsonify({
        "classes": CLASS_NAMES, "count": len(CLASS_NAMES),
        "class_info": {
            "underripe": {"level":0,"texture":"Very Firm","days":"4-7 days","description":"Not ready to eat"},
            "ripe":      {"level":1,"texture":"Slightly Soft","days":"Ready now","description":"Perfect to eat"},
            "overripe":  {"level":2,"texture":"Very Soft","days":"Past ripe","description":"Best for cooking"},
        },
    })