from flask import Flask
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
    
    # Initialize MongoDB
    connect(host=app.config['MONGODB_SETTINGS']['host'])
    
    # Initialize Cloudinary
    cloudinary.config(
        cloud_name=app.config['CLOUDINARY_CLOUD_NAME'],
        api_key=app.config['CLOUDINARY_API_KEY'],
        api_secret=app.config['CLOUDINARY_API_SECRET']
    )
    
    # Enable CORS
    CORS(app)
    
    # Register blueprints
    from routes.user_routes import user_routes
    from routes.leaves_routes import leaves_routes
    from routes.ripeness_routes import ripeness_routes
    from routes.chatbot_routes import chatbot_routes
    
    app.register_blueprint(user_routes)
    app.register_blueprint(leaves_routes)
    app.register_blueprint(ripeness_routes)
    app.register_blueprint(chatbot_routes)
    
    # Health check route
    @app.route('/health', methods=['GET'])
    def health_check():
        return {
            'status': 'healthy', 
            'service': 'AvoCare API',
            'endpoints': {
                'GET /health': 'Overall API health check',
                'GET /api/ripeness/health': 'Ripeness detection service health',
                'GET /api/leaves/health': 'Leaf disease detection service health',
                'GET /api/chatbot/health': 'Chatbot service health'
            }
        }, 200
    
    # Print registered routes on startup
    print("\n📋 Registered Routes:")
    print("=" * 50)
    for rule in app.url_map.iter_rules():
        methods = ','.join(sorted(rule.methods - {'HEAD', 'OPTIONS'}))
        print(f"   {methods:6} {rule.rule}")
    print("=" * 50 + "\n")
    
    return app

if __name__ == '__main__':
    app = create_app()
    
    print(f"🚀 Starting AvoCare API")
    print(f"🌐 Host: 0.0.0.0")
    print(f"🔌 Port: {app.config['PORT']}")
    print(f"🐛 Debug: {app.config['DEBUG']}")
    
    app.run(
        host='0.0.0.0',
        port=app.config['PORT'],
        debug=app.config['DEBUG']
    )