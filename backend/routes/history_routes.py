# routes/history_routes.py
from flask import Blueprint
from controllers.history_controller import HistoryController
from middleware.auth_middleware import token_required

history_routes = Blueprint('history', __name__, url_prefix='/api/history')


# ==========================================
# SAVE ANALYSIS ROUTES
# ==========================================

@history_routes.route('/batch/save', methods=['POST'])
@token_required
def save_batch_analyses():
    """
    Save multiple analyses at once (batch processing)
    
    Body:
    {
        "analyses": [
            {
                "analysis_type": "ripeness",
                "prediction": {...},
                "image_data": "base64...",
                "image_size": {"width": 800, "height": 600},
                ...
            },
            {
                "analysis_type": "leaf",
                "prediction": {...},
                "detections": [...],
                "image_data": "base64...",
                ...
            }
        ]
    }
    
    Returns:
    {
        "success": true,
        "message": "Batch save complete: 2 successful, 0 failed",
        "results": [
            {"success": true, "index": 0, "analysis_id": "..."},
            {"success": true, "index": 1, "analysis_id": "..."}
        ],
        "summary": {
            "total": 2,
            "successful": 2,
            "failed": 0
        }
    }
    """
    return HistoryController.save_batch_analyses()


@history_routes.route('/ripeness/save', methods=['POST'])
@token_required
def save_ripeness_analysis():
    """
    Save a ripeness analysis for the current user
    
    Body:
    {
        "prediction": {
            "ripeness": "ripe",
            "ripeness_level": 1,
            "confidence": 0.92,
            "color": "Dark Green",
            "texture": "Slightly Soft",
            "days_to_ripe": "Ready now",
            "recommendation": "Perfect for eating!",
            "bbox": [0.2, 0.2, 0.6, 0.6],
            "color_metrics": {
                "avg_hue": 45.5,
                "avg_saturation": 120.3,
                "avg_value": 180.2
            }
        },
        "all_probabilities": {
            "underripe": 0.05,
            "ripe": 0.92,
            "overripe": 0.03
        },
        "image_size": {"width": 800, "height": 600},
        "count": 1,
        "notes": "My first scan!"
    }
    """
    return HistoryController.save_ripeness_analysis()


@history_routes.route('/leaves/save', methods=['POST'])
@token_required
def save_leaf_analysis():
    """
    Save a leaf analysis for the current user
    
    Body:
    {
        "prediction": {
            "class": "Healthy",
            "confidence": 0.88,
            "bbox": [0.25, 0.25, 0.5, 0.5],
            "all_probabilities": {
                "Healthy": 0.88,
                "Anthracnose": 0.08,
                "Nutrient Deficient": 0.03,
                "Pest Infested": 0.01
            }
        },
        "detections": [
            {
                "id": 1,
                "class": "Healthy",
                "confidence": 0.88,
                "bbox": [0.25, 0.25, 0.5, 0.5]
            }
        ],
        "recommendation": "Plant is healthy!",
        "image_size": {"width": 800, "height": 600},
        "count": 1,
        "notes": "Looking good!"
    }
    """
    return HistoryController.save_leaf_analysis()


@history_routes.route('/fruitdisease/save', methods=['POST'])
@token_required
def save_fruit_disease_analysis():
    """
    Save a fruit disease analysis for the current user
    
    Body:
    {
        "prediction": {
            "class": "healthy",
            "confidence": 0.95,
            "bbox": [0.2, 0.2, 0.6, 0.6],
            "all_probabilities": {
                "healthy": 0.95,
                "anthracnose": 0.03,
                "stem end rot": 0.01,
                "cercospora spot": 0.01
            }
        },
        "detections": [
            {
                "id": 1,
                "class": "healthy",
                "confidence": 0.95,
                "bbox": [0.2, 0.2, 0.6, 0.6]
            }
        ],
        "recommendation": "Fruit is in excellent condition.",
        "image_size": {"width": 800, "height": 600},
        "count": 1,
        "notes": "Perfect fruit!"
    }
    """
    return HistoryController.save_fruit_disease_analysis()


# ==========================================
# GET ANALYSES ROUTES
# ==========================================

@history_routes.route('/all', methods=['GET'])
@token_required
def get_all_analyses():
    """
    Get all analyses for the current user (combined)
    
    Query Parameters:
    - limit: int (default: 50, max: 100)
    - offset: int (default: 0)
    - type: string (optional filter: 'ripeness', 'leaf', 'fruit_disease')
    
    Example: GET /api/history/all?limit=20&offset=0&type=ripeness
    """
    return HistoryController.get_all_analyses()


@history_routes.route('/ripeness', methods=['GET'])
@token_required
def get_ripeness_analyses():
    """
    Get all ripeness analyses for the current user
    
    Query Parameters:
    - limit: int (default: 50, max: 100)
    - offset: int (default: 0)
    
    Example: GET /api/history/ripeness?limit=20&offset=0
    """
    return HistoryController.get_ripeness_analyses()


@history_routes.route('/leaves', methods=['GET'])
@token_required
def get_leaf_analyses():
    """
    Get all leaf analyses for the current user
    
    Query Parameters:
    - limit: int (default: 50, max: 100)
    - offset: int (default: 0)
    
    Example: GET /api/history/leaves?limit=20&offset=0
    """
    return HistoryController.get_leaf_analyses()


@history_routes.route('/fruitdisease', methods=['GET'])
@token_required
def get_fruit_disease_analyses():
    """
    Get all fruit disease analyses for the current user
    
    Query Parameters:
    - limit: int (default: 50, max: 100)
    - offset: int (default: 0)
    
    Example: GET /api/history/fruitdisease?limit=20&offset=0
    """
    return HistoryController.get_fruit_disease_analyses()


@history_routes.route('/<analysis_id>', methods=['GET'])
@token_required
def get_analysis(analysis_id):
    """
    Get a specific analysis by ID
    
    Example: GET /api/history/507f1f77bcf86cd799439011
    """
    return HistoryController.get_analysis(analysis_id)


# ==========================================
# UPDATE/DELETE ROUTES
# ==========================================

@history_routes.route('/<analysis_id>/notes', methods=['PUT'])
@token_required
def update_analysis_notes(analysis_id):
    """
    Update notes for a specific analysis
    
    Body:
    {
        "notes": "Updated notes here"
    }
    
    Example: PUT /api/history/507f1f77bcf86cd799439011/notes
    """
    return HistoryController.update_analysis_notes(analysis_id)


@history_routes.route('/<analysis_id>', methods=['DELETE'])
@token_required
def delete_analysis(analysis_id):
    """
    Delete a specific analysis
    
    Example: DELETE /api/history/507f1f77bcf86cd799439011
    """
    return HistoryController.delete_analysis(analysis_id)


# ==========================================
# STATISTICS ROUTE
# ==========================================

@history_routes.route('/statistics', methods=['GET'])
@token_required
def get_statistics():
    """
    Get analysis statistics for the current user
    
    Returns:
    - Total analyses count
    - Counts by type
    - Distribution of ripeness levels
    - Distribution of leaf health classes
    - Distribution of disease classes
    - Recent activity (last 7 days)
    
    Example: GET /api/history/statistics
    """
    return HistoryController.get_statistics()