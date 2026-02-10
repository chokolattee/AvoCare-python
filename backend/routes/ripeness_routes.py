from flask import Blueprint, request, jsonify
import tensorflow as tf
import numpy as np
from PIL import Image
import io
import os
import base64
import random

ripeness_routes = Blueprint('ripeness', __name__, url_prefix='/api/ripeness')

# Class names matching your classes.csv (overripe, ripe, underripe)
CLASS_NAMES = ['overripe', 'ripe', 'underripe']

# Load model
MODEL_PATH = 'models/train/best_model.h5'

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

def preprocess_image(image_bytes):
    """Preprocess image for model prediction (MobileNetV2 preprocessing)"""
    image = Image.open(io.BytesIO(image_bytes))
    
    # Convert to RGB if needed
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Resize to model input size (224x224 for MobileNetV2)
    image = image.resize((224, 224))
    
    # Convert to array
    img_array = np.array(image, dtype=np.float32)
    
    # MobileNetV2 preprocessing (normalizes to [-1, 1])
    img_array = tf.keras.applications.mobilenet_v2.preprocess_input(img_array)
    
    # Add batch dimension
    img_array = np.expand_dims(img_array, axis=0)
    
    return img_array

def get_mock_prediction():
    """Generate realistic mock prediction based on 3 ripeness classes"""
    # Randomly select one class as the "prediction"
    predicted_class = random.choice(CLASS_NAMES)
    
    # Generate realistic probabilities that sum to 1
    base_probs = [random.random() for _ in CLASS_NAMES]
    total = sum(base_probs)
    probabilities = [p/total for p in base_probs]
    
    # Determine properties based on ripeness
    if predicted_class == "underripe":
        color = "Dark Green"
        texture = "Very Firm"
        days_to_ripe = "4-7 days"
        recommendation = "Leave at room temperature to ripen"
        confidence = random.uniform(0.85, 0.95)
    elif predicted_class == "ripe":
        color = "Green-Brown"
        texture = "Slightly Soft"
        days_to_ripe = "Ready now"
        recommendation = "Eat within 1-2 days or refrigerate"
        confidence = random.uniform(0.88, 0.98)
    else:  # overripe
        color = "Dark Brown/Black"
        texture = "Very Soft"
        days_to_ripe = "Past ripe"
        recommendation = "Best for guacamole or smoothies"
        confidence = random.uniform(0.82, 0.92)
    
    return {
        "success": True,
        "prediction": {
            "type": "FRUIT",
            "ripeness": predicted_class,
            "ripeness_level": CLASS_NAMES.index(predicted_class),
            "color": color,
            "texture": texture,
            "confidence": round(confidence, 2),
            "days_to_ripe": days_to_ripe,
            "recommendation": recommendation
        },
        "all_probabilities": {
            CLASS_NAMES[i]: round(probabilities[i], 3)
            for i in range(len(CLASS_NAMES))
        }
    }

@ripeness_routes.route('/predict', methods=['POST'])
def predict():
    """Endpoint for fruit ripeness prediction"""
    try:
        # Debug: Log request details
        print(f"\n📥 /api/ripeness/predict endpoint called")
        print(f"   Content-Type: {request.content_type}")
        print(f"   Files received: {list(request.files.keys())}")
        print(f"   Form data received: {list(request.form.keys())}")
        
        image_bytes = None
        
        # Check if image is provided in files
        if 'image' in request.files:
            image_file = request.files['image']
            
            # Check if file is empty
            if image_file.filename == '':
                return jsonify({
                    "success": False,
                    "error": "Image filename is empty"
                }), 400
            
            print(f"✅ Image received from files: {image_file.filename}")
            image_bytes = image_file.read()
            print(f"   Image size: {len(image_bytes)} bytes")
            
        elif 'image' in request.form:
            print(f"📝 Image received from form data")
            image_data = request.form['image']
            
            print(f"   Form data length: {len(image_data)} chars")
            print(f"   First 50 chars: {image_data[:50]}")
            
            # Check if it's a data URL
            if image_data.startswith('data:'):
                print(f"   Detected data URL format")
                # Remove data URL prefix (data:image/jpeg;base64,...)
                if ',' in image_data:
                    image_data = image_data.split(',', 1)[1]
            
            # Remove any whitespace/newlines
            image_data = image_data.strip().replace('\n', '').replace('\r', '').replace(' ', '')
            
            print(f"   Cleaned data length: {len(image_data)} chars")
            
            try:
                image_bytes = base64.b64decode(image_data)
                print(f"   ✅ Decoded image size: {len(image_bytes)} bytes")
            except Exception as e:
                print(f"❌ Base64 decode error: {e}")
                return jsonify({
                    "success": False,
                    "error": f"Failed to decode base64 image: {str(e)}"
                }), 400
        
        # Try to get raw data if nothing else worked
        elif request.data:
            print(f"📝 Image received from request.data")
            image_bytes = request.data
            print(f"   Image size: {len(image_bytes)} bytes")
            
        else:
            print(f"❌ No 'image' found in request")
            return jsonify({
                "success": False,
                "error": "No image provided in request. Make sure to send image in 'files' or 'form-data'"
            }), 400
        
        # Validate we have image data
        if not image_bytes or len(image_bytes) < 100:
            print(f"❌ Image data too small or empty: {len(image_bytes) if image_bytes else 0} bytes")
            return jsonify({
                "success": False,
                "error": f"Invalid image data. Size: {len(image_bytes) if image_bytes else 0} bytes"
            }), 400
        
        if model:
            # Preprocess and predict
            processed_image = preprocess_image(image_bytes)
            predictions = model.predict(processed_image, verbose=0)
            
            # Handle multi-output models (classification + bbox)
            if isinstance(predictions, list) and len(predictions) == 2:
                # Object detection model with [class_output, bbox_output]
                class_predictions = predictions[0][0]
                bbox_predictions = predictions[1][0]  # [xmin, ymin, xmax, ymax]
                class_idx = np.argmax(class_predictions)
                confidence = float(class_predictions[class_idx])
                predicted_class = CLASS_NAMES[class_idx]
                bbox = [float(x) for x in bbox_predictions]
            else:
                # Classification-only model
                class_predictions = predictions[0]
                class_idx = np.argmax(class_predictions)
                confidence = float(class_predictions[class_idx])
                predicted_class = CLASS_NAMES[class_idx]
                bbox = None
            
            # Determine properties based on predicted class
            if predicted_class == "underripe":
                color = "Dark Green"
                texture = "Very Firm"
                days_to_ripe = "4-7 days"
                recommendation = "Leave at room temperature to ripen"
            elif predicted_class == "ripe":
                color = "Green-Brown"
                texture = "Slightly Soft"
                days_to_ripe = "Ready now"
                recommendation = "Eat within 1-2 days or refrigerate"
            else:  # overripe
                color = "Dark Brown/Black"
                texture = "Very Soft"
                days_to_ripe = "Past ripe"
                recommendation = "Best for guacamole or smoothies"
            
            result = {
                "success": True,
                "prediction": {
                    "type": "FRUIT",
                    "ripeness": predicted_class,
                    "ripeness_level": int(class_idx),  # Convert to Python int
                    "color": color,
                    "texture": texture,
                    "confidence": float(confidence),  # Convert to Python float
                    "days_to_ripe": days_to_ripe,
                    "recommendation": recommendation,
                    **({
                        "bbox": bbox  # Include bbox if model supports object detection
                    } if bbox is not None else {})
                },
                "all_probabilities": {
                    CLASS_NAMES[i]: float(class_predictions[i])  # Use class_predictions variable
                    for i in range(len(CLASS_NAMES))
                }
            }
        else:
            # Use mock prediction
            result = get_mock_prediction()
        
        print(f"📊 Prediction result: {result['prediction']['ripeness']} ({result['prediction']['confidence']*100}%)")
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Prediction error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@ripeness_routes.route('/debug-upload', methods=['POST'])
def debug_upload():
    """Debug endpoint to see what's being received"""
    print("\n🔍 DEBUG UPLOAD RECEIVED:")
    print(f"Request method: {request.method}")
    print(f"Content-Type: {request.content_type}")
    print(f"Headers: {dict(request.headers)}")
    print(f"Files: {list(request.files.keys())}")
    print(f"Form: {dict(request.form)}")
    
    if 'image' in request.files:
        file = request.files['image']
        file.seek(0, 2)  # Seek to end to get file size
        file_length = file.tell()
        file.seek(0)  # Reset to beginning
        
        print(f"✅ File received: {file.filename}")
        print(f"   File size: {file_length} bytes")
        print(f"   Content type: {file.content_type}")
        return jsonify({
            "success": True, 
            "message": "File received",
            "filename": file.filename,
            "size": file_length,
            "content_type": file.content_type
        })
    else:
        print("❌ No 'image' file in request.files")
        print("   Available files:", list(request.files.keys()))
        return jsonify({
            "success": False, 
            "error": "No image in request.files",
            "available_files": list(request.files.keys())
        }), 400

@ripeness_routes.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for ripeness service"""
    return jsonify({
        "status": "healthy",
        "service": "Fruit Ripeness Detection",
        "model_loaded": model is not None,
        "classes": CLASS_NAMES,
        "model_path": MODEL_PATH,
        "endpoints": {
            "POST /api/ripeness/predict": "Upload image for ripeness detection",
            "POST /api/ripeness/debug-upload": "Debug image upload",
            "GET /api/ripeness/health": "Service health check",
            "GET /api/ripeness/classes": "Get available classes"
        }
    })

@ripeness_routes.route('/classes', methods=['GET'])
def get_classes():
    """Get available ripeness classes"""
    return jsonify({
        "classes": CLASS_NAMES,
        "count": len(CLASS_NAMES),
        "class_info": {
            "underripe": {
                "level": CLASS_NAMES.index("underripe") if "underripe" in CLASS_NAMES else 0,
                "description": "Not ready to eat, needs 4-7 days",
                "color": "Dark Green",
                "texture": "Very Firm"
            },
            "ripe": {
                "level": CLASS_NAMES.index("ripe") if "ripe" in CLASS_NAMES else 1,
                "description": "Perfect to eat now",
                "color": "Green-Brown",
                "texture": "Slightly Soft"
            },
            "overripe": {
                "level": CLASS_NAMES.index("overripe") if "overripe" in CLASS_NAMES else 2,
                "description": "Past ripe, best for cooking/smoothies",
                "color": "Dark Brown/Black",
                "texture": "Very Soft"
            }
        }
    })