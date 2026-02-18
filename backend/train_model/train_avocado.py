import os
import sys
import json
import math
import numpy as np
import tensorflow as tf
from tensorflow import keras
from keras.applications import MobileNetV2
from keras.layers import Conv2D, Reshape, Activation, BatchNormalization
from keras.models import Model
from keras.optimizers import Adam
from keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import cv2
from pathlib import Path
from collections import defaultdict, Counter

# ── Resolve directories ───────────────────────────────────────────────────────
THIS_FILE       = Path(__file__).resolve()
TRAIN_MODEL_DIR = THIS_FILE.parent              # backend/train_model/
BACKEND_ROOT    = TRAIN_MODEL_DIR.parent        # backend/

DATASET_ROOT  = BACKEND_ROOT / "datasets" / "avocado"

MODEL_DIR     = TRAIN_MODEL_DIR / "model_avocado"
RESULT_DIR    = TRAIN_MODEL_DIR / "result_avocado"
FINAL_DIR     = TRAIN_MODEL_DIR / "final_model"

for d in (MODEL_DIR, RESULT_DIR, FINAL_DIR):
    d.mkdir(parents=True, exist_ok=True)

print("=" * 60)
print("  AVOCADO DETECTOR — PATHS")
print("=" * 60)
print(f"  Backend root  : {BACKEND_ROOT}")
print(f"  Dataset root  : {DATASET_ROOT}")
print(f"  Models     →  : {MODEL_DIR}")
print(f"  Results    →  : {RESULT_DIR}")
print(f"  Production →  : {FINAL_DIR}")


# =============================================================================
# CONFIGURATION
# =============================================================================

class Config:
    # ── Input resolution (must be divisible by 32 for MobileNetV2) ────────────
    IMG_H         = 320
    IMG_W         = 320
    CHANNELS      = 3

    # ── Detection grid (320 / 32 = 10 × 10) ──────────────────────────────────
    GRID_H        = 10
    GRID_W        = 10
    NUM_ANCHORS   = 3

    # Anchor (w, h) in grid-cell units.
    ANCHORS       = [(0.5, 0.7), (0.9, 1.2), (1.4, 1.8)]

    # ── Single class ──────────────────────────────────────────────────────────
    NUM_CLASSES   = 1
    BOX_ATTRS     = 4 + 1 + NUM_CLASSES    # tx,ty,tw,th,objectness,class_conf = 6

    # ── Training hyper-parameters ─────────────────────────────────────────────
    BATCH_SIZE    = 16
    EPOCHS        = 60
    LR            = 1e-4

    # ── YOLO loss weights ─────────────────────────────────────────────────────
    LAMBDA_COORD  = 5.0
    LAMBDA_NOOBJ  = 0.5

    # ── Inference thresholds ─────────────────────────────────────────────────
    CONF_THRESH   = 0.40
    NMS_THRESH    = 0.45

    # ── Dataset ───────────────────────────────────────────────────────────────
    AVOCADO_NAME  = "avocado"   # COCO category name (case-insensitive)

    # ── Output file names ─────────────────────────────────────────────────────
    BEST_MODEL    = "avocado_detector_best.keras"
    FINAL_MODEL   = "avocado_detector_final.keras"


cfg = Config()


# =============================================================================
# UTILITIES
# =============================================================================

def iou(b1, b2):
    """IoU of two [x1,y1,x2,y2] boxes."""
    ix1 = max(b1[0], b2[0]);  iy1 = max(b1[1], b2[1])
    ix2 = min(b1[2], b2[2]);  iy2 = min(b1[3], b2[3])
    inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
    a1 = (b1[2]-b1[0]) * (b1[3]-b1[1])
    a2 = (b2[2]-b2[0]) * (b2[3]-b2[1])
    return inter / (a1 + a2 - inter + 1e-6)


def cx_cy_wh_to_xyxy(cx, cy, w, h):
    return cx - w/2, cy - h/2, cx + w/2, cy + h/2


def non_max_suppression(boxes, scores, iou_thresh):
    """Return indices of kept boxes after NMS."""
    if not boxes:
        return []
    boxes  = np.array(boxes,  dtype=np.float32)
    scores = np.array(scores, dtype=np.float32)
    order  = scores.argsort()[::-1]
    kept   = []
    while len(order):
        i = order[0];  kept.append(i)
        rest  = order[1:]
        if not len(rest):
            break
        ious  = np.array([iou(boxes[i], boxes[j]) for j in rest])
        order = rest[ious < iou_thresh]
    return kept


# =============================================================================
# COCO DATA LOADER
# =============================================================================

class COCODataLoader:
    """
    Load a COCO-format split (_annotations.coco.json) and expose samples as:
        [{"image_path": str, "boxes": [[x1,y1,x2,y2], ...], "image_id": int}, ...]
    Boxes are normalised to [0, 1].
    """

    def __init__(self, data_dir: Path, split: str = "train",
                 category_mapping: dict | None = None):
        self.split    = split
        self.data_dir = Path(data_dir) / split

        images_sub = self.data_dir / "images"
        self.images_dir = images_sub if images_sub.exists() else self.data_dir

        self.annotation_file = self.data_dir / "_annotations.coco.json"
        if not self.annotation_file.exists():
            raise FileNotFoundError(
                f"Annotation file not found: {self.annotation_file}"
            )

        with open(self.annotation_file) as f:
            self._raw = json.load(f)

        if category_mapping is None:
            self._build_category_mapping()
        else:
            self.category_id_mapping = category_mapping["id_mapping"]
            self.cat_id              = category_mapping["avocado_cat_id"]

        self.samples = self._parse()
        self._print_summary()

    def _build_category_mapping(self):
        cats = self._raw["categories"]
        self.cat_id = None
        for cat in cats:
            if cat["name"].lower() == cfg.AVOCADO_NAME.lower():
                self.cat_id = cat["id"]
                break
        if self.cat_id is None:
            if len(cats) == 1:
                self.cat_id = cats[0]["id"]
                print(f"  [COCO] Single category '{cats[0]['name']}' → used as avocado")
            else:
                raise ValueError(
                    f"Category '{cfg.AVOCADO_NAME}' not found.\n"
                    f"Available: {[c['name'] for c in cats]}\n"
                    f"Set cfg.AVOCADO_NAME to match your dataset."
                )
        self.category_id_mapping = {cat["id"]: 0 for cat in cats}

    def get_category_mapping(self) -> dict:
        return {
            "id_mapping":      self.category_id_mapping,
            "avocado_cat_id":  self.cat_id,
        }

    def _parse(self) -> list:
        id2img = {img["id"]: img for img in self._raw["images"]}
        ann_map: dict = defaultdict(list)
        for ann in self._raw["annotations"]:
            if ann["category_id"] != self.cat_id:
                continue
            if ann.get("iscrowd", 0):
                continue
            ann_map[ann["image_id"]].append(ann)

        samples, skipped = [], 0
        for img_id, anns in ann_map.items():
            meta   = id2img[img_id]
            iw, ih = meta["width"], meta["height"]

            img_path = self.images_dir / meta["file_name"]
            if not img_path.exists():
                img_path = self.images_dir / Path(meta["file_name"]).name
            if not img_path.exists():
                skipped += 1
                continue

            boxes = []
            for ann in anns:
                bx, by, bw, bh = ann["bbox"]
                if bw <= 0 or bh <= 0:
                    continue
                x1 = max(0., min(1., bx / iw))
                y1 = max(0., min(1., by / ih))
                x2 = max(0., min(1., (bx + bw) / iw))
                y2 = max(0., min(1., (by + bh) / ih))
                if x2 > x1 and y2 > y1:
                    boxes.append([x1, y1, x2, y2])

            if boxes:
                samples.append({
                    "image_path": str(img_path),
                    "boxes":      boxes,
                    "image_id":   img_id,
                })

        if skipped:
            print(f"  [COCO/{self.split}] WARNING: {skipped} image(s) missing on disk — skipped")
        return samples

    def _print_summary(self):
        n_boxes = sum(len(s["boxes"]) for s in self.samples)
        counts  = Counter(len(s["boxes"]) for s in self.samples)
        print(f"  [COCO/{self.split}]  images={len(self.samples)}"
              f"  total_boxes={n_boxes}"
              f"  avg_per_img={n_boxes/max(len(self.samples),1):.2f}")
        print(f"               boxes/image distribution: "
              + "  ".join(f"{k}box→{v}img" for k, v in sorted(counts.items())))


# =============================================================================
# ANCHOR K-MEANS (optional; run once and paste results into cfg.ANCHORS)
# =============================================================================

def compute_anchors(samples: list, n: int = 3, iters: int = 300) -> list:
    wh = np.array(
        [[(x2-x1)*cfg.GRID_W, (y2-y1)*cfg.GRID_H]
         for s in samples for x1, y1, x2, y2 in s["boxes"]],
        dtype=np.float32
    )
    if len(wh) < n:
        print("  ⚠️  Too few boxes for anchor k-means — using default anchors")
        return cfg.ANCHORS

    clusters = wh[np.random.choice(len(wh), n, replace=False)].copy()
    for _ in range(iters):
        dists  = np.stack([
            1 - np.array([iou([0,0,w,h],[0,0,cw,ch]) for cw,ch in clusters])
            for w, h in wh
        ])
        assign = dists.argmin(axis=1)
        new_c  = np.array([
            wh[assign==k].mean(0) if (assign==k).any() else clusters[k]
            for k in range(n)
        ])
        if np.allclose(new_c, clusters, atol=1e-4):
            break
        clusters = new_c

    anchors = sorted([tuple(np.round(c, 3)) for c in clusters])
    print(f"  Computed anchors (grid-cell units): {anchors}")
    return anchors


# =============================================================================
# LABEL ENCODER — normalised boxes → YOLO grid tensor
# =============================================================================

class LabelEncoder:
    def encode(self, boxes: list) -> np.ndarray:
        t = np.zeros(
            (cfg.GRID_H, cfg.GRID_W, cfg.NUM_ANCHORS, cfg.BOX_ATTRS),
            dtype=np.float32
        )
        for x1, y1, x2, y2 in boxes:
            cx = (x1+x2)/2;  cy = (y1+y2)/2
            bw = x2 - x1;    bh = y2 - y1

            gi = min(int(cx * cfg.GRID_W), cfg.GRID_W - 1)
            gj = min(int(cy * cfg.GRID_H), cfg.GRID_H - 1)

            best_iou, best_a = -1, 0
            for a, (aw, ah) in enumerate(cfg.ANCHORS):
                v = iou([0,0, bw, bh], [0,0, aw/cfg.GRID_W, ah/cfg.GRID_H])
                if v > best_iou:
                    best_iou, best_a = v, a

            aw, ah = cfg.ANCHORS[best_a]
            t[gj, gi, best_a, 0] = cx * cfg.GRID_W - gi
            t[gj, gi, best_a, 1] = cy * cfg.GRID_H - gj
            t[gj, gi, best_a, 2] = math.log(max(bw * cfg.GRID_W  / aw, 1e-6))
            t[gj, gi, best_a, 3] = math.log(max(bh * cfg.GRID_H / ah, 1e-6))
            t[gj, gi, best_a, 4] = 1.0
            t[gj, gi, best_a, 5] = 1.0
        return t


# =============================================================================
# DATA GENERATOR
# =============================================================================

class AvocadoGenerator(tf.keras.utils.Sequence):
    def __init__(self, samples: list, batch_size: int, augment: bool = False):
        self.samples    = samples
        self.batch_size = batch_size
        self.augment    = augment
        self.encoder    = LabelEncoder()
        self.indexes    = np.arange(len(samples))

    def __len__(self) -> int:
        return math.ceil(len(self.samples) / self.batch_size)

    def on_epoch_end(self):
        np.random.shuffle(self.indexes)

    def _load_image(self, path: str) -> np.ndarray:
        img = cv2.imread(str(path))
        if img is None:
            raise ValueError(f"Could not load image: {path}")
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = cv2.resize(img, (cfg.IMG_W, cfg.IMG_H))
        return img.astype(np.float32) / 255.0

    def _augment(self, img: np.ndarray, boxes: list):
        # Horizontal flip
        if np.random.rand() < 0.5:
            img   = img[:, ::-1, :]
            boxes = [[1-x2, y1, 1-x1, y2] for x1, y1, x2, y2 in boxes]

        # Vertical flip
        if np.random.rand() < 0.3:
            img   = img[::-1, :, :]
            boxes = [[x1, 1-y2, x2, 1-y1] for x1, y1, x2, y2 in boxes]

        # Brightness jitter
        if np.random.rand() < 0.5:
            img = np.clip(img + np.random.uniform(-0.15, 0.15), 0., 1.)

        # HSV saturation jitter
        if np.random.rand() < 0.4:
            hsv = cv2.cvtColor(
                (img * 255).astype(np.uint8), cv2.COLOR_RGB2HSV
            ).astype(np.float32)
            hsv[..., 1] = np.clip(hsv[..., 1] * np.random.uniform(0.7, 1.3), 0, 255)
            img = cv2.cvtColor(
                hsv.astype(np.uint8), cv2.COLOR_HSV2RGB
            ).astype(np.float32) / 255.0

        # Zoom (crop + resize)
        if np.random.rand() < 0.3:
            scale = np.random.uniform(0.75, 1.0)
            h, w  = img.shape[:2]
            new_h = int(h * scale);  new_w = int(w * scale)
            oy    = np.random.randint(0, h - new_h + 1)
            ox    = np.random.randint(0, w - new_w + 1)
            img   = cv2.resize(img[oy:oy+new_h, ox:ox+new_w], (w, h))
            new_boxes = []
            for x1, y1, x2, y2 in boxes:
                nx1 = (x1 * w - ox) / new_w;  nx2 = (x2 * w - ox) / new_w
                ny1 = (y1 * h - oy) / new_h;  ny2 = (y2 * h - oy) / new_h
                nx1 = max(0., min(1., nx1));   nx2 = max(0., min(1., nx2))
                ny1 = max(0., min(1., ny1));   ny2 = max(0., min(1., ny2))
                if nx2 > nx1 and ny2 > ny1:
                    new_boxes.append([nx1, ny1, nx2, ny2])
            if new_boxes:
                boxes = new_boxes

        return img, boxes

    def __getitem__(self, idx: int):
        idxs = self.indexes[idx * self.batch_size : (idx+1) * self.batch_size]
        imgs, labels = [], []
        for i in idxs:
            s     = self.samples[i]
            img   = self._load_image(s["image_path"])
            boxes = [list(b) for b in s["boxes"]]
            if self.augment:
                img, boxes = self._augment(img, boxes)
            imgs.append(img)
            labels.append(self.encoder.encode(boxes))
        return np.array(imgs, np.float32), np.array(labels, np.float32)


# =============================================================================
# MODEL — MobileNetV2 + YOLO Detection Head
# =============================================================================

def build_model() -> Model:
    backbone = MobileNetV2(
        input_shape=(cfg.IMG_H, cfg.IMG_W, cfg.CHANNELS),
        include_top=False,
        weights="imagenet"
    )
    for layer in backbone.layers[:-30]:
        layer.trainable = False
    for layer in backbone.layers[-30:]:
        layer.trainable = True

    x = backbone.output                     # (None, 10, 10, 1280)

    x = Conv2D(512, 1, padding="same", use_bias=False)(x)
    x = BatchNormalization()(x)
    x = Activation("relu")(x)

    x = Conv2D(256, 3, padding="same", use_bias=False)(x)
    x = BatchNormalization()(x)
    x = Activation("relu")(x)

    out_filters = cfg.NUM_ANCHORS * cfg.BOX_ATTRS    # 3 × 6 = 18
    x = Conv2D(out_filters, 1, padding="same", activation=None)(x)
    x = Reshape((cfg.GRID_H, cfg.GRID_W, cfg.NUM_ANCHORS, cfg.BOX_ATTRS))(x)

    return Model(inputs=backbone.input, outputs=x, name="AvocadoDetector")


# =============================================================================
# CUSTOM YOLO LOSS
# =============================================================================

class YOLOLoss(tf.keras.losses.Loss):
    def call(self, y_true, y_pred):
        obj   = y_true[..., 4:5]
        noobj = 1.0 - obj

        coord_loss = tf.reduce_sum(
            obj * tf.square(y_true[..., :4] - y_pred[..., :4])
        )
        obj_conf   = tf.sigmoid(y_pred[..., 4:5])
        obj_loss   = tf.reduce_sum(
            obj   * tf.square(1.0 - obj_conf)
          + noobj * cfg.LAMBDA_NOOBJ * tf.square(obj_conf)
        )
        cls_pred   = tf.sigmoid(y_pred[..., 5:])
        cls_loss   = tf.reduce_sum(
            obj * tf.square(y_true[..., 5:] - cls_pred)
        )

        total = cfg.LAMBDA_COORD * coord_loss + obj_loss + cls_loss
        return total / (tf.cast(tf.shape(y_true)[0], tf.float32) + 1e-6)


# =============================================================================
# DECODER — raw grid tensor → detection boxes
# =============================================================================

def decode_predictions(grid: np.ndarray,
                        conf_thresh: float | None = None) -> list:
    if conf_thresh is None:
        conf_thresh = cfg.CONF_THRESH

    dets = []
    for gj in range(cfg.GRID_H):
        for gi in range(cfg.GRID_W):
            for ai, (aw, ah) in enumerate(cfg.ANCHORS):
                p        = grid[gj, gi, ai]
                obj_conf = 1 / (1 + np.exp(-p[4]))
                cls_conf = 1 / (1 + np.exp(-p[5]))
                score    = obj_conf * cls_conf
                if score < conf_thresh:
                    continue
                cx = (gi + 1/(1+np.exp(-p[0]))) / cfg.GRID_W
                cy = (gj + 1/(1+np.exp(-p[1]))) / cfg.GRID_H
                bw = aw / cfg.GRID_W  * np.exp(p[2])
                bh = ah / cfg.GRID_H  * np.exp(p[3])
                x1, y1, x2, y2 = cx_cy_wh_to_xyxy(cx, cy, bw, bh)
                dets.append({
                    "box":   [max(0.,min(1.,x1)), max(0.,min(1.,y1)),
                              max(0.,min(1.,x2)), max(0.,min(1.,y2))],
                    "score": float(score)
                })

    if dets:
        kept = non_max_suppression(
            [d["box"] for d in dets],
            [d["score"] for d in dets],
            cfg.NMS_THRESH
        )
        dets = [dets[i] for i in kept]
    return dets


# =============================================================================
# DETECT  (single image)
# =============================================================================

def detect_avocados(model: Model, image_path: str,
                     ripeness_model=None) -> list:
    RIPENESS = ["Unripe", "Nearly Ripe", "Ripe", "Overripe"]

    img_bgr = cv2.imread(str(image_path))
    if img_bgr is None:
        return []
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    h, w    = img_rgb.shape[:2]

    inp  = cv2.resize(img_rgb, (cfg.IMG_W, cfg.IMG_H)).astype(np.float32) / 255.0
    grid = model.predict(np.expand_dims(inp, 0), verbose=0)[0]
    dets = decode_predictions(grid)

    results = []
    for d in dets:
        x1n, y1n, x2n, y2n = d["box"]
        px1, py1 = int(x1n*w), int(y1n*h)
        px2, py2 = int(x2n*w), int(y2n*h)

        ripeness = None
        if ripeness_model is not None:
            crop = img_rgb[max(0,py1):min(h,py2), max(0,px1):min(w,px2)]
            if crop.size > 0:
                crop_in  = cv2.resize(crop, (224, 224)).astype(np.float32) / 255.0
                prob     = ripeness_model.predict(np.expand_dims(crop_in, 0), verbose=0)
                ripeness = RIPENESS[int(np.argmax(prob[0]))]

        results.append({"box": [px1, py1, px2, py2],
                         "score": d["score"],
                         "ripeness": ripeness})
    return results


# =============================================================================
# PLOTS & VISUALISATION
# =============================================================================

def plot_dataset_distribution(samples: list, split_name: str):
    """Histogram of avocados-per-image — matches fruit_disease bar chart style."""
    counts = [len(s["boxes"]) for s in samples]
    c      = Counter(counts)
    xs     = sorted(c.keys())
    ys     = [c[x] for x in xs]

    plt.figure(figsize=(12, 6))
    bars = plt.bar([str(x) for x in xs], ys, color="steelblue", alpha=0.8)
    plt.xlabel("Avocados per image", fontsize=12, fontweight="bold")
    plt.ylabel("Number of images",   fontsize=12, fontweight="bold")
    plt.title(
        f"Dataset Distribution — {split_name}  "
        f"({len(samples)} images, {sum(counts)} boxes total)",
        fontsize=16, fontweight="bold", pad=20
    )
    plt.grid(axis="y", alpha=0.3)
    for bar, v in zip(bars, ys):
        plt.text(bar.get_x() + bar.get_width()/2, v,
                 str(v), ha="center", va="bottom", fontsize=10)
    plt.tight_layout()
    out = RESULT_DIR / f"{split_name}_distribution.png"
    plt.savefig(str(out), dpi=300, bbox_inches="tight")
    plt.close()
    print(f"  Class distribution saved to {out}")


def plot_training_history(history):
    """Dual loss + learning rate plot — mirrors fruit_disease style."""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    ax1.plot(history.history["loss"],     label="Train Loss", linewidth=2)
    ax1.plot(history.history["val_loss"], label="Val Loss",   linewidth=2)
    ax1.set_title("Training & Validation Loss", fontsize=14, fontweight="bold")
    ax1.set_xlabel("Epoch", fontsize=12)
    ax1.set_ylabel("Loss",  fontsize=12)
    ax1.legend(loc="upper right")
    ax1.grid(True, alpha=0.3)

    if "lr" in history.history:
        ax2.plot(history.history["lr"], linewidth=2, color="#9C27B0")
        ax2.set_title("Learning Rate Schedule", fontsize=14, fontweight="bold")
        ax2.set_xlabel("Epoch", fontsize=12)
        ax2.set_ylabel("LR",    fontsize=12)
        ax2.set_yscale("log")
        ax2.grid(True, alpha=0.3)
    else:
        ax2.axis("off")

    plt.tight_layout()
    out = RESULT_DIR / "training_history.png"
    plt.savefig(str(out), dpi=300, bbox_inches="tight")
    plt.close()
    print(f"  Training history saved to {out}")


def plot_pr_curve(precision: np.ndarray, recall: np.ndarray,
                  ap: float, split_name: str):
    plt.figure(figsize=(7, 5))
    plt.plot(recall, precision, lw=2, color="#4CAF50")
    plt.fill_between(recall, precision, alpha=0.15, color="#4CAF50")
    plt.xlabel("Recall",    fontsize=12)
    plt.ylabel("Precision", fontsize=12)
    plt.title(f"PR Curve — {split_name}  (AP={ap:.3f})",
              fontsize=13, fontweight="bold")
    plt.xlim(0, 1); plt.ylim(0, 1.05)
    plt.grid(alpha=0.3)
    plt.tight_layout()
    out = RESULT_DIR / f"pr_curve_{split_name}.png"
    plt.savefig(str(out), dpi=300, bbox_inches="tight")
    plt.close()
    print(f"  PR curve saved to {out}")


def visualise_detections(image_path: str, results: list,
                          gt_boxes: list | None = None,
                          filename: str = "detection.jpg"):
    COLORS = {
        None:          (0,   220,  0),
        "Unripe":      (34,  139, 34),
        "Nearly Ripe": (255, 165,  0),
        "Ripe":        (0,   200,  0),
        "Overripe":    (139,  69, 19),
    }
    img = cv2.cvtColor(cv2.imread(str(image_path)), cv2.COLOR_BGR2RGB)
    fig, ax = plt.subplots(1, figsize=(12, 8))
    ax.imshow(img)

    if gt_boxes:
        ih, iw = img.shape[:2]
        for x1n, y1n, x2n, y2n in gt_boxes:
            ax.add_patch(patches.Rectangle(
                (x1n*iw, y1n*ih), (x2n-x1n)*iw, (y2n-y1n)*ih,
                linewidth=1.5, edgecolor="blue", facecolor="none",
                linestyle="--", alpha=0.7
            ))

    for det in results:
        x1, y1, x2, y2 = det["box"]
        ripeness = det.get("ripeness")
        cf = [c/255.0 for c in COLORS.get(ripeness, COLORS[None])]
        ax.add_patch(patches.Rectangle(
            (x1, y1), x2-x1, y2-y1,
            linewidth=2.5, edgecolor=cf, facecolor="none"
        ))
        label = f"Avocado {det['score']:.2f}"
        if ripeness:
            label += f"\n{ripeness}"
        ax.text(x1, y1 - 6, label, fontsize=9, color="white",
                bbox=dict(facecolor=cf, alpha=0.75, pad=2))

    ax.axis("off")
    ax.set_title(f"{len(results)} avocado(s) detected", fontsize=14,
                 fontweight="bold")
    fig.tight_layout()
    out = RESULT_DIR / filename
    fig.savefig(str(out), dpi=300, bbox_inches="tight")
    plt.close(fig)
    print(f"  Detection image saved to {out}")
    return str(out)


# =============================================================================
# EVALUATION — mAP@0.5
# =============================================================================

def evaluate_map(model: Model, samples: list,
                  split_name: str = "val",
                  iou_threshold: float = 0.5) -> float:
    print(f"\n  Evaluating mAP@0.5 on {split_name} ({len(samples)} images) ...")
    all_tp, all_fp, all_sc = [], [], []
    total_gt = 0

    for s in samples:
        gt_boxes   = s["boxes"]
        total_gt  += len(gt_boxes)
        results    = detect_avocados(model, s["image_path"])

        img = cv2.imread(s["image_path"])
        if img is None:
            continue
        ih, iw = img.shape[:2]

        pred_norm = [
            [b[0]/iw, b[1]/ih, b[2]/iw, b[3]/ih]
            for b in [r["box"] for r in results]
        ]
        pred_sc = [r["score"] for r in results]

        matched = set()
        for pb, sc in sorted(zip(pred_norm, pred_sc), key=lambda x: -x[1]):
            best_iou, best_j = 0, -1
            for j, gb in enumerate(gt_boxes):
                if j in matched:
                    continue
                v = iou(pb, gb)
                if v > best_iou:
                    best_iou, best_j = v, j
            all_sc.append(sc)
            if best_iou >= iou_threshold and best_j >= 0:
                all_tp.append(1); all_fp.append(0); matched.add(best_j)
            else:
                all_tp.append(0); all_fp.append(1)

    if not all_sc:
        print("  No predictions — mAP = 0.0")
        return 0.0

    order     = np.argsort(-np.array(all_sc))
    cum_tp    = np.cumsum(np.array(all_tp)[order])
    cum_fp    = np.cumsum(np.array(all_fp)[order])
    precision = cum_tp / (cum_tp + cum_fp + 1e-6)
    recall    = cum_tp / (total_gt + 1e-6)
    ap        = float(np.trapz(precision, recall))

    print(f"  mAP@0.5 [{split_name}] = {ap:.4f}  ({ap*100:.1f}%)")
    plot_pr_curve(precision, recall, ap, split_name)
    return ap


# =============================================================================
# TEST MOSAIC PREVIEW — matches fruit_disease visualize_predictions style
# =============================================================================

def visualize_predictions(model: Model, samples: list, n_preview: int = 12):
    """
    Runs detection on the first n_preview test images and saves a mosaic.
    Green boxes = predictions, blue dashed = ground truth.
    Matches fruit_disease visualize_predictions() layout (3×4 grid).
    """
    if not samples:
        print("  No test samples — skipping mosaic")
        return

    n      = min(n_preview, len(samples))
    n_cols = 4
    n_rows = math.ceil(n / n_cols)
    fig, axes = plt.subplots(n_rows, n_cols, figsize=(16, 4 * n_rows))
    axes = np.array(axes).flatten()

    for idx, s in enumerate(samples[:n]):
        results = detect_avocados(model, s["image_path"])
        img     = cv2.cvtColor(cv2.imread(s["image_path"]), cv2.COLOR_BGR2RGB)
        ih, iw  = img.shape[:2]

        axes[idx].imshow(img)

        for det in results:
            x1, y1, x2, y2 = det["box"]
            axes[idx].add_patch(patches.Rectangle(
                (x1, y1), x2-x1, y2-y1,
                linewidth=2, edgecolor=(0, 0.85, 0.1), facecolor="none"
            ))
            axes[idx].text(x1, y1-4, f"{det['score']:.2f}", fontsize=8,
                           color="white",
                           bbox=dict(facecolor="green", alpha=0.6, pad=1))

        for x1n, y1n, x2n, y2n in s["boxes"]:
            axes[idx].add_patch(patches.Rectangle(
                (x1n*iw, y1n*ih), (x2n-x1n)*iw, (y2n-y1n)*ih,
                linewidth=1.5, edgecolor="blue", facecolor="none",
                linestyle="--", alpha=0.6
            ))

        pred_count = len(results)
        gt_count   = len(s["boxes"])
        color = "green" if pred_count == gt_count else "red"
        axes[idx].set_title(
            f"pred={pred_count} / gt={gt_count}\n{Path(s['image_path']).name}",
            fontsize=8, color=color, fontweight="bold"
        )
        axes[idx].axis("off")

    for ax in axes[n:]:
        ax.axis("off")

    fig.suptitle(
        "Sample Predictions — Avocado Detection\n"
        "(green = predictions, blue dashes = ground truth)",
        fontsize=13, fontweight="bold"
    )
    fig.tight_layout()
    out = RESULT_DIR / "sample_predictions.png"
    fig.savefig(str(out), dpi=300, bbox_inches="tight")
    plt.close(fig)
    print(f"  Sample predictions saved to {out}")


# =============================================================================
# DATASET INSPECTOR
# =============================================================================

def inspect_dataset(json_path: Path, split: str = ""):
    with open(json_path) as f:
        d = json.load(f)

    images  = d.get("images",      [])
    anns    = d.get("annotations", [])
    cats    = d.get("categories",  [])
    widths  = [a["bbox"][2] for a in anns]
    heights = [a["bbox"][3] for a in anns]
    counts  = Counter(a["image_id"] for a in anns)

    label = f" {split}" if split else ""
    print(f"\n  ── {json_path.name}{label} ───────────────────────────")
    print(f"  Images      : {len(images)}")
    print(f"  Annotations : {len(anns)}")
    print(f"  Categories  : {[(c['id'], c['name']) for c in cats]}")
    if widths:
        print(f"  Box W  min/mean/max : "
              f"{min(widths):.0f} / {np.mean(widths):.0f} / {max(widths):.0f}")
        print(f"  Box H  min/mean/max : "
              f"{min(heights):.0f} / {np.mean(heights):.0f} / {max(heights):.0f}")
    if counts:
        print(f"  Avocados/image  max : {max(counts.values())}")
        print(f"  Avocados/image  avg : {np.mean(list(counts.values())):.2f}")
    print()


# =============================================================================
# SAVE MODEL INFO — mirrors fruit_disease save_model_info()
# =============================================================================

def save_model_info(model: Model, history, train_samples: list,
                    valid_samples: list, ap_valid: float, ap_test: float):
    n_train_boxes = sum(len(s["boxes"]) for s in train_samples)
    n_valid_boxes = sum(len(s["boxes"]) for s in valid_samples)

    info = {
        "model_architecture":  "MobileNetV2 + YOLO Detection Head",
        "dataset":             "Avocado Detection (COCO format)",
        "task":                "single-class object detection",
        "input_size":          [cfg.IMG_H, cfg.IMG_W],
        "grid_size":           [cfg.GRID_H, cfg.GRID_W],
        "anchors":             cfg.ANCHORS,
        "num_anchors":         cfg.NUM_ANCHORS,
        "conf_thresh":         cfg.CONF_THRESH,
        "nms_thresh":          cfg.NMS_THRESH,
        "total_params":        int(model.count_params()),
        "batch_size":          cfg.BATCH_SIZE,
        "epochs_config":       cfg.EPOCHS,
        "epochs_trained":      len(history.history["loss"]),
        "learning_rate_init":  cfg.LR,
        "lambda_coord":        cfg.LAMBDA_COORD,
        "lambda_noobj":        cfg.LAMBDA_NOOBJ,
        "train_images":        len(train_samples),
        "train_boxes":         n_train_boxes,
        "valid_images":        len(valid_samples),
        "valid_boxes":         n_valid_boxes,
        "final_train_loss":    float(history.history["loss"][-1]),
        "final_val_loss":      float(history.history["val_loss"][-1]),
        "best_val_loss":       float(min(history.history["val_loss"])),
        "mAP_valid":           round(ap_valid, 4),
        "mAP_test":            round(ap_test,  4),
        "best_model_file":     cfg.BEST_MODEL,
        "final_model_file":    cfg.FINAL_MODEL,
        "production_path":     str(FINAL_DIR / cfg.BEST_MODEL),
    }

    out = RESULT_DIR / "model_info.json"
    with open(out, "w") as f:
        json.dump(info, f, indent=4)

    print("\n" + "=" * 60)
    print("  MODEL INFORMATION")
    print("=" * 60)
    for k, v in info.items():
        print(f"  {k:<28}: {v}")
    print("=" * 60)
    print(f"  Model info saved to {out}")


# =============================================================================
# MAIN PIPELINE — numbered steps matching fruit_disease main()
# =============================================================================

def main():
    print("\n" + "=" * 60)
    print("  AVOCADO DETECTOR — TRAINING PIPELINE")
    print("=" * 60)

    # ── [1/8] Inspect datasets ────────────────────────────────────────────────
    print("\n[1/8] Inspecting datasets...")
    for split in ("train", "valid", "test"):
        json_path = DATASET_ROOT / split / "_annotations.coco.json"
        if json_path.exists():
            inspect_dataset(json_path, split)
        else:
            print(f"  ⚠️  {json_path} not found")

    # ── [2/8] Load COCO datasets (shared category mapping) ───────────────────
    print("[2/8] Loading datasets...")
    train_loader = COCODataLoader(DATASET_ROOT, "train")
    cat_mapping  = train_loader.get_category_mapping()
    valid_loader = COCODataLoader(DATASET_ROOT, "valid", cat_mapping)
    test_loader  = COCODataLoader(DATASET_ROOT, "test",  cat_mapping)

    train_samples = train_loader.samples
    valid_samples = valid_loader.samples
    test_samples  = test_loader.samples

    if not train_samples:
        raise RuntimeError("No training samples found. Check dataset path.")
    if not valid_samples:
        raise RuntimeError("No validation samples found. Check dataset path.")

    print(f"\n  Train : {len(train_samples)} images")
    print(f"  Valid : {len(valid_samples)} images")
    print(f"  Test  : {len(test_samples)} images")

    # ── [3/8] Plot dataset distributions ─────────────────────────────────────
    print("\n[3/8] Plotting dataset distributions...")
    plot_dataset_distribution(train_samples, "train")
    plot_dataset_distribution(valid_samples, "valid")
    if test_samples:
        plot_dataset_distribution(test_samples, "test")

    # ── [4/8] Build model ─────────────────────────────────────────────────────
    print("\n[4/8] Building model...")
    model = build_model()
    model.summary(line_length=90)
    print(f"\n  Total parameters: {model.count_params():,}")

    # ── [5/8] Compile & set up callbacks ─────────────────────────────────────
    print("\n[5/8] Compiling...")
    model.compile(optimizer=Adam(learning_rate=cfg.LR), loss=YOLOLoss())

    best_path  = str(MODEL_DIR / cfg.BEST_MODEL)
    final_path = str(MODEL_DIR / cfg.FINAL_MODEL)

    callbacks = [
        ModelCheckpoint(
            filepath=best_path,
            monitor="val_loss",
            save_best_only=True,
            verbose=1,
        ),
        EarlyStopping(
            monitor="val_loss",
            patience=10,           # stop if no improvement for 10 epochs
            restore_best_weights=True,
            verbose=1,
        ),
        ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,            # halve LR on plateau (matches fruit_disease)
            patience=5,
            min_lr=1e-7,
            verbose=1,
        ),
    ]

    train_gen = AvocadoGenerator(train_samples, cfg.BATCH_SIZE, augment=True)
    valid_gen = AvocadoGenerator(valid_samples, cfg.BATCH_SIZE, augment=False)
    print(f"  Train batches : {len(train_gen)}")
    print(f"  Valid batches : {len(valid_gen)}")

    # ── [6/8] Train ───────────────────────────────────────────────────────────
    print("\n[6/8] Training...")
    history = model.fit(
        train_gen,
        validation_data=valid_gen,
        epochs=cfg.EPOCHS,
        callbacks=callbacks,
        verbose=1,
    )

    model.save(final_path)
    print(f"\n  Best model  → {best_path}")
    print(f"  Final model → {final_path}")

    import shutil
    prod_path = FINAL_DIR / cfg.BEST_MODEL
    shutil.copy2(best_path, str(prod_path))
    print(f"  Production  → {prod_path}")

    plot_training_history(history)

    # ── [7/8] Evaluate mAP ───────────────────────────────────────────────────
    print("\n[7/8] Evaluating mAP@0.5...")
    best_model = keras.models.load_model(
        best_path, custom_objects={"YOLOLoss": YOLOLoss}
    )

    ap_valid = evaluate_map(best_model, valid_samples, split_name="valid")
    ap_test  = 0.0
    if test_samples:
        ap_test = evaluate_map(best_model, test_samples, split_name="test")

    # ── [8/8] Visualise & save info ───────────────────────────────────────────
    print("\n[8/8] Visualising & saving model info...")

    # Sample predictions mosaic (matches fruit_disease visualize_predictions)
    visualize_predictions(best_model, test_samples or valid_samples, n_preview=12)

    # Single sample detection with GT overlay
    ref_samples = test_samples if test_samples else valid_samples
    if ref_samples:
        sample  = ref_samples[0]
        results = detect_avocados(best_model, sample["image_path"])
        visualise_detections(
            sample["image_path"], results,
            gt_boxes=sample["boxes"],
            filename="sample_detection.jpg"
        )

    save_model_info(model, history, train_samples, valid_samples,
                    ap_valid, ap_test)

    print("\n" + "=" * 60)
    print("  TRAINING COMPLETED SUCCESSFULLY!")
    print("=" * 60)
    print(f"  Models   → {MODEL_DIR}")
    print(f"  Results  → {RESULT_DIR}")
    print(f"  Prod     → {FINAL_DIR}")
    print("=" * 60)


# =============================================================================
# ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    main()