from flask import Blueprint, request, jsonify
import tensorflow as tf
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import io
import os
import json
import cv2

leaves_routes = Blueprint('leaves', __name__, url_prefix='/api/leaves')

# Try to load the trained model from train directory
MODEL_PATHS = [
    'train_model/final_model/leaves_best_model.keras'
]
model = None

for MODEL_PATH in MODEL_PATHS:
    try:
        model = tf.keras.models.load_model(MODEL_PATH)
        print(f"✅ Leaves model loaded successfully from {MODEL_PATH}")
        break
    except Exception as e:
        print(f"⚠️  Could not load model from {MODEL_PATH}: {e}")
        continue

if model is None:
    print("❌ Error: No leaves model could be loaded!")

# Load model info to get correct class names
MODEL_INFO_PATH = 'train_model/results/model_info.json'
try:
    with open(MODEL_INFO_PATH, 'r') as f:
        model_info = json.load(f)
        # Handle both dict and list formats
        if isinstance(model_info['categories'], dict):
            CLASSES = [model_info['categories'][str(i)] for i in range(len(model_info['categories']))]
        else:
            CLASSES = model_info['categories']
        print(f"✅ Loaded {len(CLASSES)} classes: {CLASSES}")
except Exception as e:
    print(f"⚠️  Could not load model info: {e}")
    CLASSES = ['Anthracnose', 'Healthy', 'Nutrient Deficient', 'Pest Infested']

IMG_SIZE = (224, 224)

def detect_leaves_in_image(image):
    """
    Detect leaf regions using color-based segmentation and contour detection
    Returns list of bounding boxes in format [x, y, width, height]
    """
    # Convert PIL to OpenCV
    img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    original_h, original_w = img_cv.shape[:2]
    
    # Convert to HSV for better green detection
    hsv = cv2.cvtColor(img_cv, cv2.COLOR_BGR2HSV)
    
    # Define range for green colors (leaves)
    # Lower green range
    lower_green1 = np.array([25, 40, 40])
    upper_green1 = np.array([90, 255, 255])
    
    # Create mask for green regions
    mask = cv2.inRange(hsv, lower_green1, upper_green1)
    
    # Morphological operations to clean up mask
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    
    # Find contours
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Filter and sort contours by area
    min_area = (original_w * original_h) * 0.02  # At least 2% of image
    max_area = (original_w * original_h) * 0.8   # At most 80% of image
    
    valid_boxes = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if min_area < area < max_area:
            x, y, w, h = cv2.boundingRect(contour)
            # Filter out very elongated boxes
            aspect_ratio = w / h if h > 0 else 0
            if 0.3 < aspect_ratio < 3.5:
                valid_boxes.append([x, y, w, h])
    
    # Sort by area (largest first) and take top 5
    valid_boxes.sort(key=lambda box: box[2] * box[3], reverse=True)
    valid_boxes = valid_boxes[:5]  # Maximum 5 leaves
    
    # If no leaves detected, use full image
    if not valid_boxes:
        margin = int(min(original_w, original_h) * 0.05)
        valid_boxes = [[margin, margin, original_w - 2*margin, original_h - 2*margin]]
    
    return valid_boxes


def classify_leaf_region(image, bbox):
    """
    Classify a specific region of the image
    bbox: [x, y, width, height] in absolute pixels
    """
    # Crop the region
    x, y, w, h = bbox
    cropped = image.crop((x, y, x + w, y + h))
    
    # Resize to model input size
    cropped_resized = cropped.resize(IMG_SIZE)
    img_array = np.array(cropped_resized) / 255.0
    img_array = np.expand_dims(img_array, axis=0)
    
    # Predict
    predictions = model.predict(img_array, verbose=0)[0]
    predicted_idx = np.argmax(predictions)
    confidence = float(predictions[predicted_idx])
    
    return {
        'class': CLASSES[predicted_idx],
        'confidence': confidence,
        'class_id': int(predicted_idx),
        'all_probabilities': {CLASSES[i]: float(predictions[i]) for i in range(len(CLASSES))}
    }


@leaves_routes.route('/predict', methods=['POST'])
def predict():
    """Detect and classify multiple leaves in image with bounding boxes"""
    if model is None:
        return jsonify({'success': False, 'error': 'Model not loaded'}), 500
    
    try:
        if 'image' not in request.files:
            return jsonify({'success': False, 'error': 'No image provided'}), 400
        
        # Read image
        image_file = request.files['image']
        image = Image.open(io.BytesIO(image_file.read())).convert('RGB')
        original_w, original_h = image.size
        
        # Detect leaf regions
        leaf_boxes = detect_leaves_in_image(image)
        
        # Classify each detected leaf
        detections = []
        for i, bbox in enumerate(leaf_boxes):
            x, y, w, h = bbox
            
            # Classify this region
            classification = classify_leaf_region(image, bbox)
            
            # Convert to normalized coordinates (0-1)
            normalized_bbox = [
                x / original_w,
                y / original_h,
                w / original_w,
                h / original_h
            ]
            
            detections.append({
                'id': i + 1,
                'class': classification['class'],
                'confidence': classification['confidence'],
                'bbox': normalized_bbox,  # [x, y, width, height] normalized
                'bbox_absolute': bbox,     # [x, y, width, height] in pixels
                'all_probabilities': classification['all_probabilities']
            })
        
        # Sort by confidence
        detections.sort(key=lambda d: d['confidence'], reverse=True)
        
        # Get primary detection (highest confidence)
        primary = detections[0] if detections else None
        
        return jsonify({
            'success': True,
            'prediction': {
                'class': primary['class'] if primary else 'Unknown',
                'confidence': primary['confidence'] if primary else 0.0,
                'bbox': primary['bbox'] if primary else [0.25, 0.25, 0.5, 0.5],
                'all_probabilities': primary['all_probabilities'] if primary else {}
            },
            'detections': detections,  # All detected leaves
            'count': len(detections),
            'image_size': {'width': original_w, 'height': original_h}
        })
    
    except Exception as e:
        import traceback
        print(f"Error in predict: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': str(e)}), 500


@leaves_routes.route('/health', methods=['GET'])
def health():
    """Health check for leaves service"""
    return jsonify({
        'status': 'ok',
        'model_loaded': model is not None,
        'classes': CLASSES,
        'num_classes': len(CLASSES)
    })


@leaves_routes.route('/save-analysis', methods=['POST'])
def save_analysis():
    """Save analysis result sent from frontend"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        # Save to file (append mode)
        save_dir = 'data/analysis_results'
        os.makedirs(save_dir, exist_ok=True)
        save_path = os.path.join(save_dir, 'leaves_analysis.jsonl')
        
        with open(save_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps(data) + '\n')
        
        return jsonify({'success': True, 'message': 'Analysis saved'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500