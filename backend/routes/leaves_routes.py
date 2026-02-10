from flask import Blueprint, request, jsonify
import tensorflow as tf
import numpy as np
from PIL import Image
import io
import os
import json

leaves_routes = Blueprint('leaves', __name__, url_prefix='/api/leaves')

# Try to load the trained model from train directory
MODEL_PATHS = [
    'models/train/accurate_checkpoints/best_model.h5',
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

CLASSES = ['healthy', 'anthracnose', 'nutrient deficiency', 'Pest Infested']
IMG_SIZE = (224, 224)

@leaves_routes.route('/predict', methods=['POST'])
def predict():
    """Predict leaf disease/health"""
    if model is None:
        return jsonify({'success': False, 'error': 'Model not loaded'}), 500
    
    try:
        if 'image' not in request.files:
            return jsonify({'success': False, 'error': 'No image provided'}), 400
        
        # Read and preprocess image
        image_file = request.files['image']
        image = Image.open(io.BytesIO(image_file.read())).convert('RGB')
        image = image.resize(IMG_SIZE)
        image_array = np.array(image) / 255.0
        image_array = np.expand_dims(image_array, axis=0)
        
        # Predict
        predictions = model.predict(image_array, verbose=0)
        
        # Handle multi-output models (classification + bbox)
        if isinstance(predictions, list) and len(predictions) == 2:
            # Object detection model with [class_output, bbox_output]
            class_predictions = predictions[0][0]
            bbox_predictions = predictions[1][0]  # [xmin, ymin, xmax, ymax]
            predicted_idx = np.argmax(class_predictions)
            
            return jsonify({
                'success': True,
                'prediction': {
                    'class': CLASSES[predicted_idx],
                    'confidence': float(class_predictions[predicted_idx]),
                    'bbox': [float(x) for x in bbox_predictions],  # Actual bbox from model
                    'all_probabilities': {
                        CLASSES[i]: float(class_predictions[i]) 
                        for i in range(len(CLASSES))
                    }
                }
            })
        else:
            # Classification-only model
            class_predictions = predictions[0]
            predicted_idx = np.argmax(class_predictions)
            
            return jsonify({
                'success': True,
                'prediction': {
                    'class': CLASSES[predicted_idx],
                    'confidence': float(class_predictions[predicted_idx]),
                    'all_probabilities': {
                        CLASSES[i]: float(class_predictions[i]) 
                        for i in range(len(CLASSES))
                    }
                }
            })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@leaves_routes.route('/health', methods=['GET'])
def health():
    """Health check for leaves service"""
    return jsonify({
        'status': 'ok',
        'model_loaded': model is not None,
        'classes': CLASSES
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