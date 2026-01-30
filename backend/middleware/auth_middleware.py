from functools import wraps
from flask import request, jsonify
from models.user import User

def token_required(f):
    """
    Decorator to protect routes that require authentication
    Extracts token from Authorization header and adds current_user to request
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                # Expected format: "Bearer <token>"
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({
                    'success': False,
                    'message': 'Invalid token format. Use: Bearer <token>'
                }), 401
        
        if not token:
            return jsonify({
                'success': False,
                'message': 'Authentication token is missing'
            }), 401
        
        try:
            # Verify token and get user
            current_user = User.verify_token(token)
            
            if not current_user:
                return jsonify({
                    'success': False,
                    'message': 'Invalid or expired token'
                }), 401
            
            # Check if user is active
            if current_user.status != 'active':
                return jsonify({
                    'success': False,
                    'message': 'User account is not active'
                }), 403
            
            # Add current_user to request
            request.current_user = current_user
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Token verification failed: {str(e)}'
            }), 401
        
        return f(*args, **kwargs)
    
    return decorated


def admin_required(f):
    """
    Decorator to protect routes that require admin role
    Must be used after @token_required
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        # Check if current_user exists (should be set by token_required)
        if not hasattr(request, 'current_user'):
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401
        
        # Check if user is admin
        if request.current_user.role != 'admin':
            return jsonify({
                'success': False,
                'message': 'Admin access required'
            }), 403
        
        return f(*args, **kwargs)
    
    return decorated