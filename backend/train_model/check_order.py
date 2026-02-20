"""
Run this once to find the correct class order for your ripeness model.
Usage:  python check_class_order.py
"""
import numpy as np
import tensorflow as tf
from PIL import Image
import io, sys

MODEL_PATH = 'C:\\Users\\mrypln\\Videos\\AvoCare\\backend\\train_model\\final_model\\best_model.h5'

print("Loading model...")
model = tf.keras.models.load_model(MODEL_PATH)
print(f"Output shape: {model.output_shape}")
num_classes = model.output_shape[-1]
print(f"Number of classes: {num_classes}")

# ── Create synthetic test images to probe each class ──────────
# Feed a pure-color image for each expected ripeness stage
# and see which output neuron fires highest.
# Avocado color hints:
#   underripe = bright green
#   ripe      = dark green / brownish-green
#   overripe  = very dark brown / almost black

test_colors = {
    'bright_green (underripe candidate)' : (80,  160,  60),
    'dark_green   (ripe candidate)'      : (40,   80,  30),
    'dark_brown   (overripe candidate)'  : (30,   20,  15),
    'pure_white   (sanity check)'        : (255, 255, 255),
    'pure_black   (sanity check)'        : (0,     0,   0),
}

IMG_SIZE = (model.input_shape[1], model.input_shape[2])
print(f"\nInput size: {IMG_SIZE}")
print("\n" + "="*60)
print("Probing model with synthetic colour patches:")
print("="*60)

for label, rgb in test_colors.items():
    img = Image.new('RGB', IMG_SIZE, rgb)
    arr = np.array(img, dtype=np.float32) / 255.0
    arr = np.expand_dims(arr, 0)

    preds = model.predict(arr, verbose=0)[0]
    exp   = np.exp(preds - preds.max())
    probs = exp / exp.sum()

    print(f"\n  Input: {label}  RGB={rgb}")
    for i, p in enumerate(probs):
        print(f"    class index {i}: {p*100:.1f}%")

print("\n" + "="*60)
print("INSTRUCTIONS:")
print("  Look at the 'dark_brown' row — that should be OVERRIPE.")
print("  Whichever class index has the highest % for dark_brown")
print("  is your overripe index.")
print()
print("  Then update RIPENESS_CLASS_NAMES in ripeness_routes.py")
print("  so index 0→class0, index 1→class1, index 2→class2")
print("  based on what you see above.")
print("="*60)

# ── Also print raw logits to help diagnose ────────────────────
print("\nRaw logits for dark_brown patch:")
img  = Image.new('RGB', IMG_SIZE, (30, 20, 15))
arr  = np.array(img, dtype=np.float32) / 255.0
arr  = np.expand_dims(arr, 0)
raw  = model.predict(arr, verbose=0)[0]
for i, v in enumerate(raw):
    print(f"  index {i}: {v:.4f}")