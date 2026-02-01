from flask import Blueprint, request, jsonify
from models.user import User
from controllers.user_controller import UserController
from middleware.auth_middleware import token_required, admin_required

user_routes = Blueprint('users', __name__, url_prefix='/api/users')

# Public routes
@user_routes.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    return UserController.register()

@user_routes.route('/login', methods=['POST'])
def login():
    """Login user"""
    # Delegate entirely to the controller — it handles validation,
    # password check, and token generation via user.generate_token()
    # which uses raw PyJWT (the same system auth_middleware expects).
    return UserController.login()

# Protected routes (require authentication)
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

# Admin routes
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

@user_routes.route('/<user_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_user(user_id):
    """Delete user by ID (Admin only)"""
    return UserController.delete_user(user_id)