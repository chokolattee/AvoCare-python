import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # MongoDB Configuration
    MONGODB_SETTINGS = {
        'host': os.getenv('DB_URI'),
        'connect': False
    }
    
    SECRET_KEY = os.getenv('JWT_SECRET', 'your_jwt_secret_key')
    # flask_jwt_extended specifically looks for THIS key.  Without it,
    # JWTManager raises "JWT_SECRET_KEY is not set" at runtime.
    JWT_SECRET_KEY = os.getenv('JWT_SECRET', 'your_jwt_secret_key')
    JWT_EXPIRES_TIME = os.getenv('JWT_EXPIRES_TIME', '7d')
    
    # Cloudinary Configuration
    CLOUDINARY_CLOUD_NAME = os.getenv('CLOUDINARY_CLOUD_NAME')
    CLOUDINARY_API_KEY = os.getenv('CLOUDINARY_API_KEY')
    CLOUDINARY_API_SECRET = os.getenv('CLOUDINARY_API_SECRET')
    
    # Server Configuration
    PORT = int(os.getenv('PORT', 8081))
    DEBUG = os.getenv('NODE_ENV', 'development') == 'development'
    
    # File Upload Configuration
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size