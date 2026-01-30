from flask import Blueprint, request, jsonify
import tensorflow as tf
import numpy as np
from PIL import Image
import io

leaves_routes = Blueprint('leaves', __name__, url_prefix='/api/leaves')

MODEL_PATH = 'models/train/accurate_checkpoints/final_model.h5'
model = None

try:
    model = tf.keras.models.load_model(MODEL_PATH)
    print("✅ Leaves model loaded successfully")
except Exception as e:
    print(f"❌ Error loading leaves model: {e}")

CLASSES = ['healthy', 'anthracnose', 'nutrient deficiency', 'Pest Infested']
IMG_SIZE = (512, 512)

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
        predictions = model.predict(image_array, verbose=0)[0]
        predicted_idx = np.argmax(predictions)
        
        return jsonify({
            'success': True,
            'prediction': {
                'class': CLASSES[predicted_idx],
                'confidence': float(predictions[predicted_idx]),
                'all_probabilities': {
                    CLASSES[i]: float(predictions[i]) 
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