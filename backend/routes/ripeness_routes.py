from flask import Blueprint, request, jsonify
import tensorflow as tf
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import io
import os
import base64
import cv2

ripeness_routes = Blueprint('ripeness', __name__, url_prefix='/api/ripeness')

# ─────────────────────────────────────────────
# Class names
# ─────────────────────────────────────────────
RIPENESS_CLASS_NAMES = ['overripe', 'ripe', 'underripe']

# ─────────────────────────────────────────────
# Model paths
# ─────────────────────────────────────────────
DETECTOR_MODEL_PATHS = [
    'train_model/final_model/avocado_detector_best.pt',
]

RIPENESS_MODEL_PATHS = [
    'train_model/final_model/best_model.h5',
]

# ─────────────────────────────────────────────
# Load models
# ─────────────────────────────────────────────
detector_model = None  # ultralytics YOLO object
ripeness_model = None

for path in DETECTOR_MODEL_PATHS:
    if not os.path.exists(path):
        print(f"⚠️  Detector file not found: {path}")
        continue
    try:
        from ultralytics import YOLO as UltralyticsYOLO
        detector_model = UltralyticsYOLO(path)
        print(f"✅ Avocado detector loaded  → {path}")
        break
    except Exception as e:
        print(f"⚠️  Could not load detector from {path}: {e}")
        continue

if detector_model is None:
    print("❌ Avocado detector not loaded — will fall back to colour-based detection")

for path in RIPENESS_MODEL_PATHS:
    if not os.path.exists(path):
        print(f"⚠️  Ripeness model file not found: {path}")
        continue
    try:
        ripeness_model = tf.keras.models.load_model(path)
        print(f"✅ Ripeness classifier loaded → {path}")
        print(f"   Input  shape : {ripeness_model.input_shape}")
        print(f"   Output shape : {ripeness_model.output_shape}")
        print(f"   Classes      : {RIPENESS_CLASS_NAMES}")
        break
    except Exception as e:
        print(f"⚠️  Could not load ripeness model from {path}: {e}")
        continue

if ripeness_model is None:
    print("❌ Ripeness model not loaded — predictions will use mock values")


# ══════════════════════════════════════════════════════════════
# STAGE 1 — Avocado Detection (ultralytics YOLO)
# ══════════════════════════════════════════════════════════════

def _fallback_color_detection(image_bytes, img_w, img_h):
    """
    Colour-based avocado segmentation used when the detector model is absent
    or returns no detections.
    """
    pil    = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    img_cv = cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
    hsv    = cv2.cvtColor(img_cv, cv2.COLOR_BGR2HSV)

    lower_ranges = [
        np.array([35, 40, 40]),
        np.array([30, 30, 30]),
        np.array([20, 15, 15]),
        np.array([15, 10, 10]),
        np.array([0,  0,  10]),
    ]
    upper_ranges = [
        np.array([85, 255, 200]),
        np.array([75, 200, 150]),
        np.array([70, 200, 120]),
        np.array([45, 180, 100]),
        np.array([35, 120,  80]),
    ]

    mask = np.zeros(hsv.shape[:2], dtype=np.uint8)
    for lo, hi in zip(lower_ranges, upper_ranges):
        mask = cv2.bitwise_or(mask, cv2.inRange(hsv, lo, hi))

    k    = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k, iterations=1)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN,  k, iterations=1)
    _, mask = cv2.threshold(cv2.GaussianBlur(mask, (3,3), 0), 127, 255, cv2.THRESH_BINARY)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    min_a = img_w * img_h * 0.005
    max_a = img_w * img_h * 0.75
    boxes = []
    for c in contours:
        area = cv2.contourArea(c)
        if not (min_a < area < max_a):
            continue
        peri = cv2.arcLength(c, True)
        circ = 4 * np.pi * area / (peri * peri) if peri else 0
        if circ < 0.20:
            continue
        x, y, w, h = cv2.boundingRect(c)
        ar = float(w) / h if h else 0
        if not (0.4 < ar < 2.2):
            continue
        boxes.append([x, y, x+w, y+h])

    return boxes


def detect_avocados(image_bytes):
    """
    Stage 1: detect avocado bounding boxes using ultralytics YOLO.
    Falls back to colour-based detection if YOLO is unavailable or finds nothing.
    """
    pil          = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    img_w, img_h = pil.size
    print(f"\n🔍 Stage-1 detection  | image {img_w}×{img_h}")

    raw_boxes, raw_scores = [], []

    # ── Ultralytics YOLO detector ──────────────────────────────
    if detector_model is not None:
        try:
            img_cv  = cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
            results = detector_model(img_cv, conf=0.35, iou=0.45, verbose=False)[0]

            if results.boxes is not None:
                for box, conf in zip(
                    results.boxes.xyxy.cpu().numpy(),
                    results.boxes.conf.cpu().numpy(),
                ):
                    x1, y1, x2, y2 = map(int, box[:4])
                    raw_boxes.append([
                        max(0, x1), max(0, y1),
                        min(img_w, x2), min(img_h, y2)
                    ])
                    raw_scores.append(float(conf))

            print(f"   YOLO detector → {len(raw_boxes)} box(es)")
        except Exception as e:
            print(f"   ⚠️  YOLO detector error: {e}")
            import traceback; traceback.print_exc()

    # ── Colour fallback ────────────────────────────────────────
    if not raw_boxes:
        print("   ↩️  Falling back to colour-based detection")
        raw_boxes  = _fallback_color_detection(image_bytes, img_w, img_h)
        raw_scores = [0.80] * len(raw_boxes)
        print(f"   Colour detector → {len(raw_boxes)} box(es)")

    # ── Last resort: whole image ───────────────────────────────
    if not raw_boxes:
        pad_x = int(img_w * 0.15);  pad_y = int(img_h * 0.15)
        raw_boxes  = [[pad_x, pad_y, img_w - pad_x, img_h - pad_y]]
        raw_scores = [0.50]
        print("   ⚠️  No avocados detected — using whole-image fallback")

    # Sort largest → smallest
    paired = sorted(zip(raw_boxes, raw_scores),
                    key=lambda p: (p[0][2]-p[0][0]) * (p[0][3]-p[0][1]),
                    reverse=True)

    detections = []
    for idx, (box, score) in enumerate(paired, start=1):
        x1, y1, x2, y2 = box
        detections.append({
            'id'                  : idx,
            'bbox_abs'            : [x1, y1, x2, y2],
            'bbox_norm'           : [x1/img_w, y1/img_h,
                                     (x2-x1)/img_w, (y2-y1)/img_h],
            'detection_confidence': float(score),
        })
        print(f"   🥑 #{idx}  box=[{x1},{y1},{x2},{y2}]  conf={score:.2f}")

    return detections, (img_w, img_h)


# ══════════════════════════════════════════════════════════════
# STAGE 2 — Ripeness Classification
# ══════════════════════════════════════════════════════════════

def _get_ripeness_input_size():
    if ripeness_model is None:
        return (224, 224)
    shape = ripeness_model.input_shape
    if isinstance(shape, list):
        img_shape = shape[0]
    else:
        img_shape = shape
    h = img_shape[1] if img_shape[1] else 224
    w = img_shape[2] if img_shape[2] else 224
    return (h, w)


def _ripeness_is_multi_input():
    if ripeness_model is None:
        return False
    return isinstance(ripeness_model.input_shape, list)


def classify_ripeness(image_bytes, bbox_abs, img_size):
    """Stage 2: classify ripeness of one cropped avocado region."""
    try:
        pil          = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        img_w, img_h = pil.size

        x1, y1, x2, y2 = bbox_abs
        pad_x = int((x2 - x1) * 0.05)
        pad_y = int((y2 - y1) * 0.05)
        x1c = max(0, x1 - pad_x);     y1c = max(0, y1 - pad_y)
        x2c = min(img_w, x2 + pad_x); y2c = min(img_h, y2 + pad_y)

        crop  = pil.crop((x1c, y1c, x2c, y2c))
        rh, rw = _get_ripeness_input_size()
        crop  = crop.resize((rw, rh))

        arr = np.array(crop, dtype=np.float32)
        arr = tf.keras.applications.mobilenet_v2.preprocess_input(arr)
        arr = np.expand_dims(arr, 0)

        if ripeness_model is not None:
            if _ripeness_is_multi_input():
                cx_n = ((x1 + x2) / 2) / img_w
                cy_n = ((y1 + y2) / 2) / img_h
                w_n  = (x2 - x1) / img_w
                h_n  = (y2 - y1) / img_h
                ar   = w_n / (h_n + 1e-6)
                meta = np.array([[cx_n, cy_n, w_n, h_n, ar]], dtype=np.float32)
                preds = ripeness_model.predict([arr, meta], verbose=0)[0]
            else:
                preds = ripeness_model.predict(arr, verbose=0)[0]

            exp   = np.exp(preds - preds.max())
            probs = exp / exp.sum()

            idx       = int(np.argmax(probs))
            cls       = RIPENESS_CLASS_NAMES[idx]
            conf      = float(probs[idx])
            all_probs = {RIPENESS_CLASS_NAMES[i]: float(probs[i])
                         for i in range(len(RIPENESS_CLASS_NAMES))}
        else:
            import random
            cls  = random.choice(RIPENESS_CLASS_NAMES)
            conf = random.uniform(0.80, 0.95)
            base = [random.random() for _ in RIPENESS_CLASS_NAMES]
            s    = sum(base)
            all_probs = {RIPENESS_CLASS_NAMES[i]: base[i]/s
                         for i in range(len(RIPENESS_CLASS_NAMES))}

        print(f"      ✅ {cls}  ({conf*100:.1f}%)")
        return {'class': cls, 'confidence': conf, 'all_probabilities': all_probs}

    except Exception as e:
        print(f"      ⚠️  classify_ripeness error: {e}")
        import traceback; traceback.print_exc()
        return {
            'class': 'ripe',
            'confidence': 0.50,
            'all_probabilities': {c: 1/3 for c in RIPENESS_CLASS_NAMES}
        }


# ══════════════════════════════════════════════════════════════
# Helpers — metadata
# ══════════════════════════════════════════════════════════════

def _texture(cls):
    return {'underripe': 'Very Firm', 'ripe': 'Slightly Soft', 'overripe': 'Very Soft'}.get(cls, 'Unknown')

def _days(cls):
    return {'underripe': '4-7 days', 'ripe': 'Ready now', 'overripe': 'Past ripe'}.get(cls, 'Unknown')

def _recommendation(cls):
    return {
        'underripe': 'Leave at room temperature to ripen. Place in a paper bag with a banana to speed up ripening.',
        'ripe'     : 'Perfect for eating! Enjoy within 1-2 days or refrigerate to extend freshness.',
        'overripe' : 'Best for guacamole, smoothies, or baking. Still nutritious despite soft texture.',
    }.get(cls, "Monitor the fruit's condition.")

def _ripeness_level(cls):
    return {'underripe': 0, 'ripe': 1, 'overripe': 2}.get(cls, 0)


# ══════════════════════════════════════════════════════════════
# Annotated image
# ══════════════════════════════════════════════════════════════

RIPENESS_COLOURS = {
    'underripe': (156, 204, 101),
    'ripe'     : (251, 140,   0),
    'overripe' : (229,  57,  53),
}

def _draw_annotated_image(image_bytes, classified):
    try:
        pil  = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        draw = ImageDraw.Draw(pil)

        for det in classified:
            x1, y1, x2, y2 = det['bbox_abs']
            cls             = det['class']
            conf            = det['ripeness_confidence']
            colour          = RIPENESS_COLOURS.get(cls, (150, 150, 150))
            lw              = max(3, int(min(pil.width, pil.height) * 0.006))

            for i in range(lw):
                draw.rectangle([x1+i, y1+i, x2-i, y2-i], outline=colour)

            label = f"#{det['id']} {cls.upper()}  {conf*100:.0f}%"
            try:
                font = ImageFont.truetype("arial.ttf", size=max(14, lw*4))
            except Exception:
                font = ImageFont.load_default()

            bbox_txt = draw.textbbox((x1, y1), label, font=font)
            tw = bbox_txt[2] - bbox_txt[0]
            th = bbox_txt[3] - bbox_txt[1]
            lx = x1;  ly = max(0, y1 - th - 6)
            draw.rectangle([lx, ly, lx+tw+8, ly+th+6], fill=colour)
            draw.text((lx+4, ly+3), label, fill=(255, 255, 255), font=font)

        buf = io.BytesIO()
        pil.save(buf, format='JPEG', quality=92)
        return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()
    except Exception as e:
        print(f"⚠️  Annotated image error: {e}")
        return None


# ══════════════════════════════════════════════════════════════
# Route: /api/ripeness/predict
# ══════════════════════════════════════════════════════════════

@ripeness_routes.route('/predict', methods=['POST'])
def predict():
    print(f"\n{'='*60}")
    print("📥  /api/ripeness/predict  (two-stage pipeline)")

    image_bytes = None

    if 'image' in request.files:
        f = request.files['image']
        if f.filename == '':
            return jsonify({"success": False, "error": "Empty filename"}), 400
        image_bytes = f.read()
        print(f"✅ Received multipart image: {len(image_bytes):,} bytes")

    elif 'image' in request.form:
        data = request.form['image']
        if data.startswith('data:') and ',' in data:
            data = data.split(',', 1)[1]
        data = data.strip().replace('\n','').replace('\r','').replace(' ','')
        try:
            image_bytes = base64.b64decode(data)
            print(f"✅ Decoded base64 image: {len(image_bytes):,} bytes")
        except Exception as e:
            return jsonify({"success": False, "error": f"Base64 decode error: {e}"}), 400

    elif request.data and len(request.data) > 100:
        image_bytes = request.data
        print(f"✅ Raw body image: {len(image_bytes):,} bytes")

    else:
        return jsonify({"success": False, "error": "No image provided"}), 400

    if len(image_bytes) < 100:
        return jsonify({"success": False, "error": "Image data too small"}), 400

    try:
        detections, img_size = detect_avocados(image_bytes)
        img_w, img_h = img_size
        print(f"\n🔮  Stage-2 ripeness classification for {len(detections)} avocado(s)…")

        classified = []
        for det in detections:
            print(f"\n   Classifying avocado #{det['id']}…")
            result = classify_ripeness(image_bytes, det['bbox_abs'], img_size)

            classified.append({
                'id'                   : det['id'],
                'bbox_abs'             : det['bbox_abs'],
                'bbox'                 : det['bbox_norm'],
                'bbox_absolute'        : det['bbox_abs'],
                'detection_confidence' : det['detection_confidence'],
                'class'                : result['class'],
                'ripeness'             : result['class'],
                'ripeness_level'       : _ripeness_level(result['class']),
                'ripeness_confidence'  : result['confidence'],
                'confidence'           : result['confidence'],
                'all_probabilities'    : result['all_probabilities'],
                'texture'              : _texture(result['class']),
                'days_to_ripe'         : _days(result['class']),
                'recommendation'       : _recommendation(result['class']),
            })

        # Sort by area (largest first)
        classified.sort(key=lambda x: (
            (x['bbox_abs'][2]-x['bbox_abs'][0]) * (x['bbox_abs'][3]-x['bbox_abs'][1])
        ), reverse=True)

        primary           = classified[0]
        annotated_b64     = _draw_annotated_image(image_bytes, classified)

        response = {
            "success"    : True,
            "count"      : len(classified),
            "image_size" : {"width": img_w, "height": img_h},
            "prediction" : {
                "type"          : "FRUIT",
                "ripeness"      : primary['class'],
                "ripeness_level": primary['ripeness_level'],
                "color"         : "Detected",
                "texture"       : primary['texture'],
                "confidence"    : primary['confidence'],
                "days_to_ripe"  : primary['days_to_ripe'],
                "recommendation": primary['recommendation'],
                "bbox"          : primary['bbox'],
                "bbox_absolute" : primary['bbox_abs'],
            },
            "all_probabilities": primary['all_probabilities'],
            "detections"       : classified,
            "annotated_image"  : annotated_b64,
        }

        print(f"\n✅  Pipeline complete! Total: {len(classified)} avocado(s)")
        for c in classified:
            print(f"   #{c['id']}  {c['class']:10s}  conf={c['confidence']*100:.1f}%")

        return jsonify(response)

    except Exception as e:
        print(f"❌ Prediction pipeline error: {e}")
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


# ══════════════════════════════════════════════════════════════
# Routes: health / classes
# ══════════════════════════════════════════════════════════════

@ripeness_routes.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status"           : "healthy",
        "service"          : "AvoCare Two-Stage Ripeness Detection",
        "detector_loaded"  : detector_model is not None,
        "classifier_loaded": ripeness_model is not None,
        "model_loaded"     : ripeness_model is not None,
        "classes"          : RIPENESS_CLASS_NAMES,
        "pipeline"         : [
            "Stage 1 — avocado_detector_best.pt   (YOLOv8 — detect all avocados)",
            "Stage 2 — ripeness_best_model.keras  (classify each crop)",
        ],
    })


@ripeness_routes.route('/classes', methods=['GET'])
def get_classes():
    return jsonify({
        "classes"   : RIPENESS_CLASS_NAMES,
        "count"     : len(RIPENESS_CLASS_NAMES),
        "class_info": {
            "underripe": {"level": 0, "texture": "Very Firm",     "days": "4-7 days",  "description": "Not ready to eat"},
            "ripe"     : {"level": 1, "texture": "Slightly Soft", "days": "Ready now", "description": "Perfect to eat"},
            "overripe" : {"level": 2, "texture": "Very Soft",     "days": "Past ripe", "description": "Best for cooking/smoothies"},
        }
    })