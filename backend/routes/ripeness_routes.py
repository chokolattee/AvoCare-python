from flask import Blueprint, request, jsonify
import tensorflow as tf
import numpy as np
from PIL import Image
import io
import os
import base64
import cv2

ripeness_routes = Blueprint('ripeness', __name__, url_prefix='/api/ripeness')

# Class names matching your classes.csv (overripe, ripe, underripe)
CLASS_NAMES = ['overripe', 'ripe', 'underripe']

# Updated model path
base_dir = r'C:\Users\mrypln\Videos\AvoCare'
MODEL_PATH = os.path.join(base_dir, 'backend', 'train_model', 'model_ripenessv1', 'best_model.h5')
# Load model
model = None
try:
    if os.path.exists(MODEL_PATH):
        model = tf.keras.models.load_model(MODEL_PATH)
        print(f"✅ Ripeness model loaded successfully from {MODEL_PATH}")
        print(f"📊 Model expects {len(CLASS_NAMES)} classes: {CLASS_NAMES}")
    else:
        print(f"⚠️  Ripeness model not found at {MODEL_PATH}")
        print("📱 Using mock predictions for testing")
except Exception as e:
    print(f"⚠️  Error loading ripeness model: {e}")
    print("📱 Using mock predictions for testing")

def detect_multiple_avocados(image_bytes):
    """Detect multiple avocados in image using color-based segmentation"""
    try:
        image = Image.open(io.BytesIO(image_bytes))
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        img_width, img_height = image.size
        img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        hsv = cv2.cvtColor(img_cv, cv2.COLOR_BGR2HSV)
        
        # Color ranges for avocado detection
        lower_ranges = [
            np.array([35, 40, 40]),   # Bright green
            np.array([30, 30, 30]),   # Medium green
            np.array([20, 15, 15]),   # Dark green
            np.array([15, 10, 10]),   # Very dark
            np.array([0, 0, 10]),     # Black-brown
        ]
        
        upper_ranges = [
            np.array([85, 255, 200]),
            np.array([75, 200, 150]),
            np.array([70, 200, 120]),
            np.array([45, 180, 100]),
            np.array([35, 120, 80]),
        ]
        
        # Create combined mask
        mask = np.zeros(hsv.shape[:2], dtype=np.uint8)
        for lower, upper in zip(lower_ranges, upper_ranges):
            mask = cv2.bitwise_or(mask, cv2.inRange(hsv, lower, upper))
        
        # Morphological operations
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=1)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
        mask = cv2.GaussianBlur(mask, (3, 3), 0)
        _, mask = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)
        
        # Find contours
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        print(f"   📊 Found {len(contours)} contours")
        
        min_area = (img_width * img_height) * 0.005
        max_area = (img_width * img_height) * 0.75
        
        detections = []
        detection_id = 1
        
        for contour in contours:
            area = cv2.contourArea(contour)
            
            if min_area < area < max_area:
                perimeter = cv2.arcLength(contour, True)
                if perimeter > 0:
                    circularity = 4 * np.pi * area / (perimeter * perimeter)
                    
                    if circularity > 0.25:
                        x, y, w, h = cv2.boundingRect(contour)
                        aspect_ratio = float(w) / h if h > 0 else 0
                        
                        if 0.5 < aspect_ratio < 2.0:
                            region_hsv = hsv[y:y+h, x:x+w]
                            avg_h = np.mean(region_hsv[:, :, 0])
                            avg_s = np.mean(region_hsv[:, :, 1])
                            avg_v = np.mean(region_hsv[:, :, 2])
                            
                            if avg_h >= 35 and avg_v > 100:
                                color_desc = "Bright Green"
                            elif avg_h >= 30 and avg_v > 80:
                                color_desc = "Medium Green"
                            elif avg_h >= 25 and avg_v > 50:
                                color_desc = "Dark Green"
                            elif avg_h >= 20 and avg_v > 25:
                                color_desc = "Brown-Green"
                            else:
                                color_desc = "Very Dark/Black"
                            
                            detections.append({
                                'id': detection_id,
                                'bbox': [x, y, w, h],
                                'bbox_normalized': [
                                    x / img_width,
                                    y / img_height,
                                    w / img_width,
                                    h / img_height
                                ],
                                'color': color_desc,
                                'color_metrics': {
                                    'avg_hue': float(avg_h),
                                    'avg_saturation': float(avg_s),
                                    'avg_value': float(avg_v)
                                },
                                'area': float(area),
                                'circularity': float(circularity),
                                'aspect_ratio': float(aspect_ratio)
                            })
                            
                            detection_id += 1
        
        detections.sort(key=lambda x: x['area'], reverse=True)
        
        if len(detections) == 0:
            detections = [{
                'id': 1,
                'bbox': [int(img_width * 0.2), int(img_height * 0.2), 
                        int(img_width * 0.6), int(img_height * 0.6)],
                'bbox_normalized': [0.2, 0.2, 0.6, 0.6],
                'color': "Unknown",
                'color_metrics': None,
                'area': float(img_width * img_height * 0.36),
                'circularity': 0.0,
                'aspect_ratio': 1.0
            }]
        
        print(f"   🥑 Final: Detected {len(detections)} avocado(s)")
        return detections, (img_width, img_height)
        
    except Exception as e:
        print(f"⚠️  Detection error: {e}")
        import traceback
        traceback.print_exc()
        return [{
            'id': 1,
            'bbox': [int(image.width * 0.2), int(image.height * 0.2), 
                    int(image.width * 0.6), int(image.height * 0.6)],
            'bbox_normalized': [0.2, 0.2, 0.6, 0.6],
            'color': "Unknown",
            'color_metrics': None,
            'area': float(image.width * image.height * 0.36),
            'circularity': 0.0,
            'aspect_ratio': 1.0
        }], (image.width, image.height)

def classify_region(image_bytes, bbox, img_size):
    """Classify a specific region with FIXED probability distribution"""
    try:
        image = Image.open(io.BytesIO(image_bytes))
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        x, y, w, h = bbox
        region = image.crop((x, y, x + w, y + h))
        region = region.resize((224, 224))
        
        img_array = np.array(region, dtype=np.float32)
        img_array = tf.keras.applications.mobilenet_v2.preprocess_input(img_array)
        img_array = np.expand_dims(img_array, axis=0)
        
        if model:
            predictions = model.predict(img_array, verbose=0)
            class_predictions = predictions[0]
            
            print(f"   🔍 Raw model output: {class_predictions}")
            
            # Apply softmax for proper probability distribution
            exp_preds = np.exp(class_predictions - np.max(class_predictions))
            softmax_probs = exp_preds / np.sum(exp_preds)
            
            class_idx = np.argmax(softmax_probs)
            confidence = float(softmax_probs[class_idx])
            predicted_class = CLASS_NAMES[class_idx]
            
            all_probs = {
                CLASS_NAMES[i]: float(softmax_probs[i])
                for i in range(len(CLASS_NAMES))
            }
            
            print(f"   ✅ Predicted: {predicted_class} with confidence {confidence:.2%}")
            print(f"   📊 All probabilities: {all_probs}")
            
        else:
            import random
            predicted_class = random.choice(CLASS_NAMES)
            confidence = random.uniform(0.85, 0.95)
            
            base_probs = [random.random() for _ in CLASS_NAMES]
            total = sum(base_probs)
            probabilities = [p/total for p in base_probs]
            
            all_probs = {
                CLASS_NAMES[i]: probabilities[i]
                for i in range(len(CLASS_NAMES))
            }
        
        return {
            'class': predicted_class,
            'confidence': confidence,
            'all_probabilities': all_probs
        }
        
    except Exception as e:
        print(f"⚠️  Classification error: {e}")
        import traceback
        traceback.print_exc()
        return {
            'class': 'ripe',
            'confidence': 0.5,
            'all_probabilities': {cls: 0.33 for cls in CLASS_NAMES}
        }

def determine_texture(ripeness_class):
    """FIXED: Determine texture based on ripeness class"""
    texture_map = {
        "underripe": "Very Firm",
        "ripe": "Slightly Soft",
        "overripe": "Very Soft"  # FIX: Was returning "Very Firm"
    }
    result = texture_map.get(ripeness_class, "Unknown")
    print(f"   🔧 Texture for {ripeness_class}: {result}")
    return result

def determine_days_to_ripe(ripeness_class):
    """FIXED: Determine days to ripeness based on class"""
    days_map = {
        "underripe": "4-7 days",
        "ripe": "Ready now",
        "overripe": "Past ripe"  # FIX: Was returning "4-7 days"
    }
    result = days_map.get(ripeness_class, "Unknown")
    print(f"   🔧 Days to ripe for {ripeness_class}: {result}")
    return result

def get_recommendation(ripeness_class):
    """Get recommendation based on ripeness class"""
    rec_map = {
        "underripe": "Leave at room temperature to ripen. Place in a paper bag with a banana to speed up ripening.",
        "ripe": "Perfect for eating! Enjoy within 1-2 days or refrigerate to extend freshness.",
        "overripe": "Best for guacamole, smoothies, or baking. Still nutritious despite soft texture."
    }
    return rec_map.get(ripeness_class, "Monitor the fruit's condition")

@ripeness_routes.route('/predict', methods=['POST'])
def predict():
    """Endpoint for multi-fruit ripeness prediction"""
    try:
        print(f"\n📥 /api/ripeness/predict endpoint called")
        
        image_bytes = None
        
        if 'image' in request.files:
            image_file = request.files['image']
            if image_file.filename == '':
                return jsonify({"success": False, "error": "Empty filename"}), 400
            
            image_bytes = image_file.read()
            print(f"✅ Image received: {len(image_bytes)} bytes")
            
        elif 'image' in request.form:
            image_data = request.form['image']
            if image_data.startswith('data:') and ',' in image_data:
                image_data = image_data.split(',', 1)[1]
            image_data = image_data.strip().replace('\n', '').replace('\r', '').replace(' ', '')
            
            try:
                image_bytes = base64.b64decode(image_data)
                print(f"✅ Decoded image: {len(image_bytes)} bytes")
            except Exception as e:
                return jsonify({"success": False, "error": f"Decode error: {str(e)}"}), 400
        
        elif request.data:
            image_bytes = request.data
            print(f"✅ Image from request.data: {len(image_bytes)} bytes")
        else:
            return jsonify({"success": False, "error": "No image provided"}), 400
        
        if not image_bytes or len(image_bytes) < 100:
            return jsonify({"success": False, "error": "Invalid image data"}), 400
        
        # Detect avocados
        print("🎨 Detecting avocados...")
        detections, img_size = detect_multiple_avocados(image_bytes)
        
        # Classify each detected avocado
        print(f"🔮 Classifying {len(detections)} avocado(s)...")
        classified_detections = []
        
        for detection in detections:
            classification = classify_region(image_bytes, detection['bbox'], img_size)
            
            classified_detection = {
                'id': detection['id'],
                'class': classification['class'],
                'confidence': classification['confidence'],
                'bbox': detection['bbox_normalized'],
                'bbox_absolute': detection['bbox'],
                'color': detection['color'],
                'texture': determine_texture(classification['class']),  # FIXED
                'days_to_ripe': determine_days_to_ripe(classification['class']),  # FIXED
                'recommendation': get_recommendation(classification['class']),
                'all_probabilities': classification['all_probabilities'],
                'color_metrics': detection['color_metrics']
            }
            
            classified_detections.append(classified_detection)
            
            print(f"   🥑 Avocado #{detection['id']}: {classification['class']} "
                  f"({classification['confidence']*100:.1f}%) - {detection['color']}")
        
        classified_detections.sort(key=lambda x: x['id'])
        primary = classified_detections[0]
        
        # Build response
        result = {
            "success": True,
            "count": len(classified_detections),
            "image_size": {"width": img_size[0], "height": img_size[1]},
            "prediction": {
                "type": "FRUIT",
                "ripeness": primary['class'],
                "ripeness_level": CLASS_NAMES.index(primary['class']),
                "color": primary['color'],
                "texture": primary['texture'],
                "confidence": primary['confidence'],
                "days_to_ripe": primary['days_to_ripe'],
                "recommendation": primary['recommendation'],
                "bbox": primary['bbox'],
                "color_metrics": primary['color_metrics']
            },
            "all_probabilities": primary['all_probabilities'],
            "detections": classified_detections
        }
        
        print(f"✅ Classification complete!")
        print(f"   Primary: {primary['class']} ({primary['confidence']*100:.1f}%)")
        print(f"   Texture: {primary['texture']}")
        print(f"   Days: {primary['days_to_ripe']}")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Prediction error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@ripeness_routes.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "Avocado Ripeness Detection - FIXED",
        "model_loaded": model is not None,
        "classes": CLASS_NAMES,
        "fixes_applied": [
            "✅ Softmax normalization for proper probabilities",
            "✅ Fixed texture mapping (overripe → Very Soft)",
            "✅ Fixed days_to_ripe mapping (overripe → Past ripe)",
            "✅ Added debug logging for classification"
        ]
    })

@ripeness_routes.route('/classes', methods=['GET'])
def get_classes():
    """Get available ripeness classes"""
    return jsonify({
        "classes": CLASS_NAMES,
        "count": len(CLASS_NAMES),
        "class_info": {
            "underripe": {
                "level": 0,
                "texture": "Very Firm",
                "days": "4-7 days",
                "description": "Not ready to eat"
            },
            "ripe": {
                "level": 1,
                "texture": "Slightly Soft",
                "days": "Ready now",
                "description": "Perfect to eat"
            },
            "overripe": {
                "level": 2,
                "texture": "Very Soft",
                "days": "Past ripe",
                "description": "Best for cooking/smoothies"
            }
        }
    })