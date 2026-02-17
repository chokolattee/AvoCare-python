from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from mongoengine import connect
import cloudinary
from config import Config
import os


def create_app():
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(Config)
    
    # Verify SECRET_KEY is set
    if not app.config['SECRET_KEY'] or app.config['SECRET_KEY'] == 'your_jwt_secret_key':
        print("\n⚠️  WARNING: JWT_SECRET environment variable not set!")
        print("   Please set JWT_SECRET in your .env file for token generation to work properly.\n")
    
    # Verify GEMINI_API_KEY is set
    if not os.getenv('GEMINI_API_KEY'):
        print("\n⚠️  WARNING: GEMINI_API_KEY environment variable not set!")
        print("   Chatbot functionality will not work without a valid Gemini API key.")
        print("   Get one at: https://makersuite.google.com/app/apikey\n")
    
    # Initialize MongoDB with error handling
    try:
        connect(host=app.config['MONGODB_SETTINGS']['host'])
        print("✅ MongoDB connected successfully")
        
        # Seed default categories
        try:
            from models.category import seed_categories
            seed_categories()
            print("✅ Default categories seeded")
        except Exception as e:
            print(f"⚠️  Category seeding warning: {str(e)}")
    except Exception as e:
        print(f"❌ MongoDB connection failed: {str(e)}")
        print("   Please check your MONGODB_URI in .env file\n")
    
    # Initialize Cloudinary with error handling
    try:
        cloudinary.config(
            cloud_name=app.config['CLOUDINARY_CLOUD_NAME'],
            api_key=app.config['CLOUDINARY_API_KEY'],
            api_secret=app.config['CLOUDINARY_API_SECRET']
        )
        print("✅ Cloudinary configured successfully")
    except Exception as e:
        print(f"⚠️  Cloudinary configuration warning: {str(e)}")
    
    # ============================================================================
    # INITIALIZE PROFANITY FILTER
    # ============================================================================
    try:
        from utils.profanity_filter import initialize_profanity_filter
        initialize_profanity_filter()
        print("✅ Profanity filter initialized successfully")
    except ImportError:
        print("⚠️  WARNING: Profanity filter not found!")
        print("   Install with: pip install better-profanity")
        print("   Forum posts will not be filtered for inappropriate content.\n")
    except Exception as e:
        print(f"⚠️  Profanity filter initialization warning: {str(e)}\n")
    # ============================================================================
    
    # ENHANCED: Enable CORS with proper configuration for production
    CORS(app)
    
    # Register blueprints
    from routes.user_routes import user_routes
    from routes.leaves_routes import leaves_routes
    from routes.ripeness_routes import ripeness_routes
    from routes.chatbot_routes import chatbot_routes
    from routes.forum_routes import forum_routes 
    from routes.fruitdisease_routes import fruitdisease_routes   
    from routes.history_routes import history_routes
    from routes.product_routes import product_bp
    
    app.register_blueprint(user_routes)
    app.register_blueprint(leaves_routes)
    app.register_blueprint(ripeness_routes)
    app.register_blueprint(chatbot_routes)
    app.register_blueprint(forum_routes, url_prefix='/api/forum')
    app.register_blueprint(fruitdisease_routes)
    app.register_blueprint(history_routes)
    app.register_blueprint(product_bp, url_prefix='/api')
    # Health check route
    @app.route('/health', methods=['GET'])
    def health_check():
        # Check if profanity filter is available
        profanity_status = 'disabled'
        try:
            from utils.profanity_filter import contains_profanity
            profanity_status = 'enabled'
        except:
            pass
        
        return jsonify({
            'status': 'healthy', 
            'service': 'AvoCare API',
            'version': '1.0.0',
            'features': {
                'profanity_filter': profanity_status
            },
            'endpoints': {
                'GET /health': 'Overall API health check',
                'GET /api/ripeness/health': 'Ripeness detection service health',
                'GET /api/leaves/health': 'Leaf disease detection service health',
                'GET /api/chatbot/health': 'Chatbot service health'
            }
        }), 200
    
    # Global error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'success': False,
            'message': 'Resource not found',
            'error': 'Not Found'
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': 'Server Error'
        }), 500
    
    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({
            'success': False,
            'message': 'Authentication required',
            'error': 'Unauthorized'
        }), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({
            'success': False,
            'message': 'Access forbidden',
            'error': 'Forbidden'
        }), 403
    
    # Print registered routes on startup
    print("\n📋 Registered Routes:")
    print("=" * 50)
    for rule in app.url_map.iter_rules():
        methods = ','.join(sorted(rule.methods - {'HEAD', 'OPTIONS'}))
        print(f"   {methods:6} {rule.rule}")
    print("=" * 50 + "\n")

    @app.route('/verify-email.html')
    def serve_verification_page():
        """Serve the email verification HTML page"""
        static_dir = os.path.join(os.path.dirname(__file__), 'static')
        return send_from_directory(static_dir, 'verify-email.html')
    
    return app


if __name__ == '__main__':
    app = create_app()
    
    print(f"🚀 Starting AvoCare API")
    print(f"🌐 Host: 0.0.0.0")
    print(f"🔌 Port: {app.config['PORT']}")
    print(f"🛠 Debug: {app.config['DEBUG']}")
    print(f"🔒 CORS: Enabled (all origins)")
    print(f"📦 Environment: {'Development' if app.config['DEBUG'] else 'Production'}")
    print()
    
    app.run(
        host='0.0.0.0',
        port=app.config['PORT'],
        debug=app.config['DEBUG']
    )