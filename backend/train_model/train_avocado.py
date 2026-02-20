"""
Avocado Detector — YOLOv8 trained on an existing YOLO-format dataset
=====================================================================
No conversion needed. Just point DATASET_YAML at your dataset.yaml and run.

Install:  pip install ultralytics
"""

import cv2
import matplotlib.pyplot as plt
from pathlib import Path

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION  ← only these three lines usually need changing
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).parent
DATASET_YAML = SCRIPT_DIR.parent / "datasets" / "avocado-detect" / "data.yaml"  # ← your yaml
MODEL_DIR    = SCRIPT_DIR / "models_avocado-detect"
RESULTS_DIR  = SCRIPT_DIR / "results_avocado-detect"

YOLO_BASE_MODEL = "yolov8n.pt"   # yolov8s.pt / yolov8m.pt for better accuracy
YOLO_EPOCHS     = 50
YOLO_IMG_SIZE   = 640
YOLO_BATCH      = 16
YOLO_PATIENCE   = 10             # early-stop if val doesn't improve for N epochs

CONF_THRESHOLD  = 0.4            # minimum detection confidence at inference
IOU_THRESHOLD   = 0.45           # NMS IoU threshold

for d in (MODEL_DIR, RESULTS_DIR):
    d.mkdir(parents=True, exist_ok=True)


# ─────────────────────────────────────────────────────────────────────────────
# TRAIN
# ─────────────────────────────────────────────────────────────────────────────

def train():
    from ultralytics import YOLO

    print("="*60)
    print("Training YOLOv8 Avocado Detector")
    print(f"  dataset : {DATASET_YAML}")
    print(f"  base    : {YOLO_BASE_MODEL}")
    print(f"  epochs  : {YOLO_EPOCHS}")
    print("="*60)

    model = YOLO(YOLO_BASE_MODEL)
    model.train(
        data     = str(DATASET_YAML),
        epochs   = YOLO_EPOCHS,
        imgsz    = YOLO_IMG_SIZE,
        batch    = YOLO_BATCH,
        project  = str(MODEL_DIR),
        name     = "yolo_avocado",
        patience = YOLO_PATIENCE,
        verbose  = True,
    )

    best = MODEL_DIR / "yolo_avocado" / "weights" / "best.pt"
    print(f"\n  Best weights → {best}")
    return best


# ─────────────────────────────────────────────────────────────────────────────
# EVALUATE
# ─────────────────────────────────────────────────────────────────────────────

def evaluate(weights_path):
    from ultralytics import YOLO

    print("\n" + "="*60)
    print("Evaluating on test split")
    print("="*60)

    model   = YOLO(str(weights_path))
    metrics = model.val(
        data    = str(DATASET_YAML),
        split   = "test",
        imgsz   = YOLO_IMG_SIZE,
        conf    = CONF_THRESHOLD,
        iou     = IOU_THRESHOLD,
        verbose = True,
    )

    print(f"\n  mAP50:     {metrics.box.map50:.4f}")
    print(f"  mAP50-95:  {metrics.box.map:.4f}")
    print(f"  Precision: {metrics.box.mp:.4f}")
    print(f"  Recall:    {metrics.box.mr:.4f}")
    return metrics


# ─────────────────────────────────────────────────────────────────────────────
# DETECTOR — use this after training
# ─────────────────────────────────────────────────────────────────────────────

class AvocadoDetector:
    """
    Detect every avocado in an image.

    After training:
        detector = load_detector()
        annotated, dets = detector.predict("photo.jpg", save_path="out.jpg")

    Each detection:
        {'bbox': [x1, y1, x2, y2], 'confidence': 0.87}

    Feed crops into your ripeness model:
        crops, dets = detector.get_crops("photo.jpg")
        for crop in crops:
            ripeness = your_ripeness_model(crop)
    """

    BOX_COLOR  = (0, 200, 80)    # green
    TEXT_COLOR = (255, 255, 255) # white

    def __init__(self, weights_path, conf=CONF_THRESHOLD, iou=IOU_THRESHOLD):
        from ultralytics import YOLO
        self.model = YOLO(str(weights_path))
        self.conf  = conf
        self.iou   = iou

    # ── single image ──────────────────────────────────────────────────────────
    def predict(self, image_path, save_path=None):
        """
        Returns:
            annotated  – BGR numpy array with boxes drawn
            detections – [{'bbox': [x1,y1,x2,y2], 'confidence': float}, ...]
        """
        img = cv2.imread(str(image_path))
        if img is None:
            raise FileNotFoundError(f"Cannot read: {image_path}")

        results    = self.model(img, conf=self.conf, iou=self.iou, verbose=False)[0]
        detections = []

        if results.boxes is not None:
            for box, conf in zip(
                results.boxes.xyxy.cpu().numpy(),
                results.boxes.conf.cpu().numpy(),
            ):
                x1, y1, x2, y2 = map(int, box[:4])
                detections.append({"bbox": [x1, y1, x2, y2], "confidence": float(conf)})

        annotated = self._draw(img.copy(), detections)
        if save_path:
            cv2.imwrite(str(save_path), annotated)

        return annotated, detections

    # ── crops for ripeness model ───────────────────────────────────────────────
    def get_crops(self, image_path):
        """
        Returns one BGR crop per detected avocado.
        Pass each crop directly into your ripeness classifier.
        """
        img = cv2.imread(str(image_path))
        if img is None:
            raise FileNotFoundError(f"Cannot read: {image_path}")

        _, detections = self.predict(image_path)
        crops = [img[y1:y2, x1:x2] for x1, y1, x2, y2 in
                 (d["bbox"] for d in detections)]
        return crops, detections

    # ── whole folder ──────────────────────────────────────────────────────────
    def predict_folder(self, folder, output_dir=None):
        """Run predict() on every image in a folder."""
        folder = Path(folder)
        if output_dir:
            Path(output_dir).mkdir(parents=True, exist_ok=True)

        results = {}
        for ext in ("*.jpg", "*.jpeg", "*.png", "*.bmp", "*.webp"):
            for img_path in sorted(folder.glob(ext)):
                out = Path(output_dir) / img_path.name if output_dir else None
                _, dets = self.predict(img_path, save_path=out)
                results[img_path.name] = dets
                print(f"  {img_path.name}: {len(dets)} avocado(s)")
                for i, d in enumerate(dets, 1):
                    print(f"    #{i}  conf {d['confidence']:.1%}  bbox {d['bbox']}")
        return results

    # ── notebook preview ──────────────────────────────────────────────────────
    def show(self, image_path, figsize=(10, 8)):
        annotated, dets = self.predict(image_path)
        plt.figure(figsize=figsize)
        plt.imshow(cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB))
        plt.title(f"{len(dets)} avocado(s) — {Path(image_path).name}")
        plt.axis("off"); plt.tight_layout(); plt.show()
        return dets

    # ── draw boxes ────────────────────────────────────────────────────────────
    def _draw(self, img, detections):
        font, scale, thick = cv2.FONT_HERSHEY_SIMPLEX, 0.65, 2

        for i, det in enumerate(detections, 1):
            x1, y1, x2, y2 = det["bbox"]
            cv2.rectangle(img, (x1, y1), (x2, y2), self.BOX_COLOR, 3)

            label = f"#{i} avocado {det['confidence']:.0%}"
            (tw, th), _ = cv2.getTextSize(label, font, scale, thick)
            cv2.rectangle(img, (x1, y1 - th - 10), (x1 + tw + 6, y1), self.BOX_COLOR, -1)
            cv2.putText(img, label, (x1 + 3, y1 - 5), font, scale,
                        self.TEXT_COLOR, thick, cv2.LINE_AA)

        summary = f"Avocados found: {len(detections)}"
        cv2.putText(img, summary, (10, 34), font, 1.0, (0,0,0),         3, cv2.LINE_AA)
        cv2.putText(img, summary, (10, 34), font, 1.0, self.BOX_COLOR,  2, cv2.LINE_AA)
        return img


# ─────────────────────────────────────────────────────────────────────────────
# CONVENIENCE LOADER
# ─────────────────────────────────────────────────────────────────────────────

def load_detector(model_dir=None, conf=CONF_THRESHOLD, iou=IOU_THRESHOLD):
    """Load the trained detector in one line after training is done."""
    weights = Path(model_dir or MODEL_DIR) / "yolo_avocado" / "weights" / "best.pt"
    if not weights.exists():
        raise FileNotFoundError(f"Weights not found: {weights}\nRun main() to train first.")
    return AvocadoDetector(weights, conf=conf, iou=iou)


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def main():
    print("="*60)
    print("AVOCADO DETECTOR")
    print("="*60)

    weights = train()
    evaluate(weights)

    # Demo on a few test images
    import yaml
    with open(DATASET_YAML) as f:
        cfg = yaml.safe_load(f)

    base      = Path(cfg.get("path", DATASET_YAML.parent))
    test_dir  = base / cfg.get("test", "test/images")
    demo_out  = RESULTS_DIR / "demo"
    demo_out.mkdir(exist_ok=True)

    detector  = AvocadoDetector(weights)
    test_imgs = list(test_dir.glob("*.jpg"))[:5] + list(test_dir.glob("*.png"))[:5]

    print("\n" + "="*60)
    print("Demo predictions")
    print("="*60)
    for img_path in test_imgs[:5]:
        _, dets = detector.predict(img_path, save_path=demo_out / f"result_{img_path.name}")
        print(f"  {img_path.name}: {len(dets)} avocado(s)")

    print(f"\n  Weights → {weights}")
    print(f"  Demo    → {demo_out}")


if __name__ == "__main__":
    main()