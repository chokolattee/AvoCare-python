# models/user.py
from mongoengine import Document, StringField, DateTimeField, BooleanField
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import os
import secrets

class User(Document):
    """User model for authentication and profile management"""
    
    name = StringField(required=True, max_length=100)
    email = StringField(required=True, unique=True, max_length=100)
    password = StringField()  # Not required for Google auth
    image = StringField(default='')
    role = StringField(default='user', choices=['user', 'admin'])
    status = StringField(default='active', choices=['active', 'inactive', 'deactivated'])
    
    # Firebase/Google Auth fields
    firebase_uid = StringField(unique=True, sparse=True)
    auth_provider = StringField(default='email', choices=['email', 'google'])
    email_verified = BooleanField(default=False)
    verification_token = StringField()
    verification_token_expires = DateTimeField()
    
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'users',
        'indexes': ['email', 'firebase_uid', 'verification_token']
    }
    
    def set_password(self, password):
        """Hash and set the user's password"""
        self.password = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if provided password matches the hashed password"""
        if not self.password:
            return False
        return check_password_hash(self.password, password)
    
    def generate_verification_token(self):
        """Generate email verification token that expires in 24 hours"""
        self.verification_token = secrets.token_urlsafe(32)
        self.verification_token_expires = datetime.utcnow() + timedelta(hours=24)
        return self.verification_token
    
    def generate_token(self):
        """Generate JWT token for user authentication"""
        try:
            secret = os.getenv('JWT_SECRET', 'default-secret-key-change-this')
            expires_time = os.getenv('JWT_EXPIRES_TIME', '7d')
            
            # Parse expiration time
            if expires_time.endswith('d'):
                delta = timedelta(days=int(expires_time[:-1]))
            elif expires_time.endswith('h'):
                delta = timedelta(hours=int(expires_time[:-1]))
            elif expires_time.endswith('m'):
                delta = timedelta(minutes=int(expires_time[:-1]))
            else:
                delta = timedelta(days=7)
            
            payload = {
                'user_id': str(self.id),
                'email': self.email,
                'role': self.role,
                'exp': datetime.utcnow() + delta,
                'iat': datetime.utcnow()
            }
            
            token = jwt.encode(payload, secret, algorithm='HS256')
            
            if isinstance(token, bytes):
                token = token.decode('utf-8')
            
            return token
            
        except Exception as e:
            print(f"❌ Token generation error: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
    
    @staticmethod
    def verify_token(token):
        """Verify JWT token and return user"""
        try:
            secret = os.getenv('JWT_SECRET', 'default-secret-key-change-this')
            payload = jwt.decode(token, secret, algorithms=['HS256'])
            user_id = payload.get('user_id')
            user = User.objects(id=user_id).first()
            return user
        except jwt.ExpiredSignatureError:
            print("❌ Token has expired")
            return None
        except jwt.InvalidTokenError as e:
            print(f"❌ Invalid token: {str(e)}")
            return None
        except Exception as e:
            print(f"❌ Token verification error: {str(e)}")
            return None
    
    def to_dict(self):
        """Convert user object to dictionary (excluding password)"""
        return {
            'id': str(self.id),
            'name': self.name,
            'email': self.email,
            'image': self.image,
            'role': self.role,
            'status': self.status,
            'auth_provider': self.auth_provider,
            'email_verified': self.email_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def save(self, *args, **kwargs):
        """Override save to update the updated_at timestamp"""
        self.updated_at = datetime.utcnow()
        return super(User, self).save(*args, **kwargs)