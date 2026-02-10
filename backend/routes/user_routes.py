# routes/user_routes.py
from flask import Blueprint, request, jsonify, redirect, send_from_directory
from models.user import User
from controllers.user_controller import UserController
from middleware.auth_middleware import token_required, admin_required
from datetime import datetime
import os

user_routes = Blueprint('users', __name__, url_prefix='/api/users')

# ==========================================
# PUBLIC ROUTES (No Authentication Required)
# ==========================================

@user_routes.route('/register', methods=['POST'])
def register():
    """
    Register a new user
    Supports both email/password and Google authentication
    Sends verification email for email/password signups
    """
    return UserController.register()

@user_routes.route('/login', methods=['POST'])
def login():
    """
    Login user
    Supports both email/password and Google authentication
    Checks email verification for email/password logins
    """
    return UserController.login()

@user_routes.route('/verify-email', methods=['GET'])
def verify_email():
    """
    Verify user email with token
    
    This endpoint handles BOTH web browser and mobile app requests:
    - Web browser: Redirects to HTML page with success/error
    - Mobile app: Returns JSON response
    
    Detection: Checks Accept header or 'format' query parameter
    """
    try:
        token = request.args.get('token')
        format_param = request.args.get('format')  # Optional: ?format=json
        
        # Detect if request is from mobile app
        accept_header = request.headers.get('Accept', '')
        is_mobile_request = (
            'application/json' in accept_header or 
            format_param == 'json' or
            request.headers.get('X-Requested-With') == 'XMLHttpRequest'
        )
        
        print(f"📱 Is mobile request: {is_mobile_request}")
        print(f"📋 Accept header: {accept_header}")
        
        if not token:
            if is_mobile_request:
                return jsonify({
                    'success': False,
                    'error': 'no_token',
                    'message': 'No verification token provided'
                }), 400
            return redirect('/verify-email.html?error=no_token')
        
        # Find user with this verification token
        user = User.objects(verification_token=token).first()
        
        if not user:
            if is_mobile_request:
                return jsonify({
                    'success': False,
                    'error': 'invalid_token',
                    'message': 'Invalid verification token'
                }), 404
            return redirect('/verify-email.html?error=invalid_token')
        
        # Check if token has expired
        if user.verification_token_expires < datetime.utcnow():
            if is_mobile_request:
                return jsonify({
                    'success': False,
                    'error': 'expired',
                    'message': 'Verification link has expired',
                    'email': user.email
                }), 400
            return redirect(f'/verify-email.html?error=expired&email={user.email}')
        
        # Check if already verified
        if user.email_verified:
            print(f"ℹ️ Email already verified for: {user.email}")
            if is_mobile_request:
                return jsonify({
                    'success': True,
                    'message': 'Email already verified',
                    'already_verified': True,
                    'email': user.email
                }), 200
            return redirect('/verify-email.html?success=true&already_verified=true')
        
        # Update user - mark email as verified
        user.email_verified = True
        user.verification_token = None
        user.verification_token_expires = None
        user.save()
        
        print(f"✅ Email verified successfully for: {user.email}")
        
        # Return appropriate response
        if is_mobile_request:
            return jsonify({
                'success': True,
                'message': 'Email verified successfully',
                'email': user.email,
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'name': user.name,
                    'email_verified': user.email_verified
                }
            }), 200
        
        return redirect(f'/verify-email.html?success=true&token={token}')
        
    except Exception as e:
        print(f"❌ Email verification error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        if is_mobile_request:
            return jsonify({
                'success': False,
                'error': 'server_error',
                'message': 'Server error occurred during verification'
            }), 500
        
        return redirect('/verify-email.html?error=server_error')

@user_routes.route('/verify-email-mobile', methods=['POST'])
def verify_email_mobile():
    """
    Alternative endpoint specifically for mobile apps
    Always returns JSON, never redirects
    
    Body: { "token": "verification_token_here" }
    """
    try:
        data = request.get_json()
        token = data.get('token')
        
        print(f"📱 Mobile verification request for token: {token[:20]}..." if token else "No token")
        
        if not token:
            return jsonify({
                'success': False,
                'error': 'no_token',
                'message': 'No verification token provided'
            }), 400
        
        # Find user with this verification token
        user = User.objects(verification_token=token).first()
        
        if not user:
            return jsonify({
                'success': False,
                'error': 'invalid_token',
                'message': 'Invalid verification token'
            }), 404
        
        # Check if token has expired
        if user.verification_token_expires < datetime.utcnow():
            return jsonify({
                'success': False,
                'error': 'expired',
                'message': 'Verification link has expired',
                'email': user.email
            }), 400
        
        # Check if already verified
        if user.email_verified:
            print(f"ℹ️ Email already verified for: {user.email}")
            return jsonify({
                'success': True,
                'message': 'Email already verified',
                'already_verified': True,
                'email': user.email,
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'name': user.name,
                    'email_verified': user.email_verified
                }
            }), 200
        
        # Update user - mark email as verified
        user.email_verified = True
        user.verification_token = None
        user.verification_token_expires = None
        user.save()
        
        print(f"✅ Email verified successfully for: {user.email}")
        
        return jsonify({
            'success': True,
            'message': 'Email verified successfully',
            'email': user.email,
            'user': {
                'id': str(user.id),
                'email': user.email,
                'name': user.name,
                'email_verified': user.email_verified
            }
        }), 200
        
    except Exception as e:
        print(f"❌ Mobile verification error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'server_error',
            'message': 'Server error occurred during verification'
        }), 500

@user_routes.route('/resend-verification', methods=['POST'])
def resend_verification():
    """
    Resend verification email
    Body: { "email": "user@example.com" }
    """
    return UserController.resend_verification()

# ==========================================
# PROTECTED ROUTES (Require Authentication)
# ==========================================

@user_routes.route('/profile', methods=['GET'])
@token_required
def get_profile():
    """Get current user's profile"""
    return UserController.get_user_profile()

@user_routes.route('/profile', methods=['PUT'])
@token_required
def update_profile():
    """Update current user's profile"""
    return UserController.update_user_profile()

# ==========================================
# ADMIN ROUTES (Require Admin Role)
# ==========================================

@user_routes.route('/', methods=['GET'])
@token_required
@admin_required
def get_all_users():
    """Get all users (Admin only)"""
    return UserController.get_all_users()

@user_routes.route('/<user_id>', methods=['GET'])
@token_required
@admin_required
def get_user(user_id):
    """Get user by ID (Admin only)"""
    return UserController.get_user_by_id(user_id)

@user_routes.route('/<user_id>', methods=['PUT'])
@token_required
@admin_required
def update_user(user_id):
    """Update user status and role (Admin only)"""
    return UserController.update_user(user_id)

@user_routes.route('/<user_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_user(user_id):
    """Delete user by ID (Admin only)"""
    return UserController.delete_user(user_id)