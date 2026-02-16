# middleware/auth_middleware.py
from functools import wraps
from flask import request, jsonify, g, current_app
import jwt
from models.user import User


def token_required(f):
    """
    Decorator to protect routes that require authentication
    Expects JWT token in Authorization header: Bearer <token>
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        # Allow OPTIONS requests to pass through for CORS preflight
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
        
        token = None
        
        # Get token from Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                # Expected format: "Bearer <token>"
                token = auth_header.split(' ')[1]
                print(f"🔑 Token received: {token[:20]}...")
            except IndexError:
                print("❌ Invalid Authorization header format")
                return jsonify({
                    'success': False,
                    'message': 'Invalid token format. Expected: Bearer <token>'
                }), 401
        
        if not token:
            print("❌ No token found in request")
            return jsonify({
                'success': False,
                'message': 'Authentication token is missing'
            }), 401
        
        try:
            # Decode token
            data = jwt.decode(
                token,
                current_app.config['SECRET_KEY'],
                algorithms=['HS256']
            )
            
            print(f"🔓 Token decoded successfully for user_id: {data.get('user_id')}")
            
            # Get user from database
            current_user = User.objects(id=data['user_id']).first()
            
            if not current_user:
                print(f"❌ User not found in database: {data['user_id']}")
                return jsonify({
                    'success': False,
                    'message': 'User not found'
                }), 401
            
            print(f"✅ User authenticated: {current_user.email}")
            
            # Store user in Flask's g object for access in route
            request.current_user = current_user
            
        except jwt.ExpiredSignatureError:
            print("❌ Token has expired")
            return jsonify({
                'success': False,
                'message': 'Token has expired. Please login again.'
            }), 401
            
        except jwt.InvalidTokenError as e:
            print(f"❌ Invalid token: {str(e)}")
            return jsonify({
                'success': False,
                'message': 'Invalid token. Please login again.'
            }), 401
            
        except Exception as e:
            print(f"❌ Authentication error: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({
                'success': False,
                'message': f'Authentication error: {str(e)}'
            }), 401
        
        # Call the actual route function
        return f(*args, **kwargs)
    
    return decorated


def optional_token(f):
    """
    Decorator for routes where authentication is optional
    If token is provided and valid, request.current_user will be set
    Otherwise, request.current_user will be None
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        request.current_user = None
        
        # Try to get token
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                pass
        
        if token:
            try:
                # Decode token
                data = jwt.decode(
                    token,
                    current_app.config['SECRET_KEY'],
                    algorithms=['HS256']
                )
                
                # Get user
                current_user = User.objects(id=data['user_id']).first()
                if current_user:
                    request.current_user = current_user
                    print(f"✅ Optional auth - User found: {current_user.email}")
                else:
                    print(f"⚠️  Optional auth - User not found: {data['user_id']}")
                    
            except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
                print("⚠️  Optional auth - Invalid/expired token")
                pass
        
        return f(*args, **kwargs)
    
    return decorated


def admin_required(f):
    """
    Decorator to protect admin-only routes
    Requires authentication AND admin role
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        # Allow OPTIONS requests to pass through for CORS preflight
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
        
        token = None
        
        # Get token from Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]
                print(f"🔑 Admin check - Token received: {token[:20]}...")
            except IndexError:
                print("❌ Invalid Authorization header format")
                return jsonify({
                    'success': False,
                    'message': 'Invalid token format. Expected: Bearer <token>'
                }), 401
        
        if not token:
            print("❌ No token found in request")
            return jsonify({
                'success': False,
                'message': 'Authentication token is missing'
            }), 401
        
        try:
            # Decode token
            data = jwt.decode(
                token,
                current_app.config['SECRET_KEY'],
                algorithms=['HS256']
            )
            
            print(f"🔓 Token decoded successfully for user_id: {data.get('user_id')}")
            
            # Get user from database
            current_user = User.objects(id=data['user_id']).first()
            
            if not current_user:
                print(f"❌ User not found in database: {data['user_id']}")
                return jsonify({
                    'success': False,
                    'message': 'User not found'
                }), 401
            
            # Check if user is admin
            if current_user.role != 'admin':
                print(f"🚫 Access denied - User {current_user.email} is not an admin")
                return jsonify({
                    'success': False,
                    'message': 'Admin access required'
                }), 403
            
            print(f"✅ Admin authenticated: {current_user.email}")
            
            # Store user in Flask's g object
            request.current_user = current_user
            
        except jwt.ExpiredSignatureError:
            print("❌ Token has expired")
            return jsonify({
                'success': False,
                'message': 'Token has expired. Please login again.'
            }), 401
            
        except jwt.InvalidTokenError as e:
            print(f"❌ Invalid token: {str(e)}")
            return jsonify({
                'success': False,
                'message': 'Invalid token. Please login again.'
            }), 401
            
        except Exception as e:
            print(f"❌ Authentication error: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({
                'success': False,
                'message': f'Authentication error: {str(e)}'
            }), 401
        
        # Call the actual route function
        return f(*args, **kwargs)
    
    return decorated