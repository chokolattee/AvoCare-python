from flask import request, jsonify, current_app
from models.user import User
from werkzeug.utils import secure_filename
from utils.cloudinary_helper import CloudinaryHelper
import os
from datetime import datetime
import re
import cloudinary
import cloudinary.uploader
import cloudinary.api

class UserController:
    @staticmethod
    def register():
        """
        Register a new user
        Expects: multipart/form-data with name, email, password, role, image
        """
        try:
            # Log incoming request
            print("=" * 50)
            print("REGISTRATION REQUEST RECEIVED")
            print("=" * 50)
            
            # Get form data
            name = request.form.get('name')
            email = request.form.get('email')
            password = request.form.get('password')
            role = request.form.get('role', 'user')
            status = request.form.get('status', 'active')
            
            print(f"Name: {name}")
            print(f"Email: {email}")
            print(f"Role: {role}")
            print(f"Status: {status}")
            
            # Validate required fields
            if not name or not email or not password:
                return jsonify({
                    'success': False,
                    'message': 'Name, email, and password are required'
                }), 400
            
            # Validate email format
            pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(pattern, email):
                return jsonify({
                    'success': False,
                    'message': 'Invalid email format'
                }), 400
            
            # Validate password length
            if len(password) < 6:
                return jsonify({
                    'success': False,
                    'message': 'Password must be at least 6 characters long'
                }), 400
            
            # Check if user already exists
            existing_user = User.objects(email=email).first()
            if existing_user:
                return jsonify({
                    'success': False,
                    'message': 'Email is already registered'
                }), 409
            
            # Handle image upload to Cloudinary
            image_url = ''
            print(f"\nChecking for image upload...")
            print(f"Files in request: {list(request.files.keys())}")
            print(f"Request content type: {request.content_type}")
            print(f"Request method: {request.method}")
            print(f"Request form keys: {list(request.form.keys())}")
            print(f"Request data length: {len(request.data) if request.data else 0}")
            
            # Debug: print all request attributes
            print(f"\nDEBUG - Request details:")
            print(f"  - Files dict: {dict(request.files)}")
            print(f"  - Form dict: {dict(request.form)}")
            
            # Try to access files
            try:
                files_list = list(request.files)
                print(f"  - Files list: {files_list}")
                if files_list:
                    for file_key in files_list:
                        f = request.files.get(file_key)
                        print(f"    - {file_key}: {f.filename if f else 'None'}")
            except Exception as e:
                print(f"  - Error listing files: {e}")
            
            # Handle image upload if present
            if 'image' in request.files:
                file = request.files['image']
                print(f"\nImage file found: {file.filename}")
                
                if file and file.filename:
                    # Validate image file
                    if CloudinaryHelper.validate_image_file(file.filename):
                        # Upload to Cloudinary under avocare/users folder
                        print("Uploading image to Cloudinary...")
                        upload_result = CloudinaryHelper.upload_image(
                            file,
                            folder="avocare/users",
                            prefix=f"user_{email.split('@')[0]}"
                        )
                        if upload_result['success']:
                            image_url = upload_result['url']
                            print(f"✅ Image uploaded successfully: {image_url}")
                        else:
                            print(f"⚠️ Image upload failed: {upload_result.get('error')}")
                            # Continue without image
                    else:
                        print(f"❌ Invalid file extension for: {file.filename}")
                        # Continue without image
            else:
                print("No image file in request - continuing without image")
            
            # Create new user
            print(f"\nCreating user in database...")
            user = User(
                name=name,
                email=email.lower(),
                image=image_url,
                role=role,
                status=status
            )
            user.set_password(password)
            user.save()
            
            print(f"✅ User created successfully!")
            print(f"User ID: {user.id}")
            print(f"User Image: {user.image}")
            print("=" * 50)
            
            # Remove password from response
            user_data = user.to_dict()
            
            return jsonify({
                'success': True,
                'message': 'User registered successfully',
                'user': user_data
            }), 201
            
        except Exception as e:
            print(f"❌ Registration error: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({
                'success': False,
                'message': f'Registration failed: {str(e)}'
            }), 500
    
    @staticmethod
    def login():
        """
        Login user
        Expects: JSON with email and password
        """
        try:
            print("=" * 50)
            print("LOGIN REQUEST RECEIVED")
            print("=" * 50)
            
            data = request.get_json()
            
            if not data:
                return jsonify({
                    'success': False,
                    'message': 'No data provided'
                }), 400
            
            email = data.get('email')
            password = data.get('password')
            
            print(f"Email: {email}")
            
            # Validate required fields
            if not email or not password:
                return jsonify({
                    'success': False,
                    'message': 'Email and password are required'
                }), 400
            
            # Find user by email
            user = User.objects(email=email.lower()).first()
            
            if not user:
                print(f"❌ User not found: {email}")
                return jsonify({
                    'success': False,
                    'message': 'No account found with this email'
                }), 404
            
            print(f"User found: {user.name}")
            
            # Check if user is active
            if user.status != 'active':
                return jsonify({
                    'success': False,
                    'message': 'Account is not active. Please contact administrator.'
                }), 403
            
            # Check password
            if not user.check_password(password):
                print(f"❌ Invalid password")
                return jsonify({
                    'success': False,
                    'message': 'Invalid email or password'
                }), 401
            
            print(f"✅ Password verified")
            
            # Generate token
            print("Generating token...")
            token = user.generate_token()
            
            if not token:
                print(f"❌ Token generation failed")
                return jsonify({
                    'success': False,
                    'message': 'Failed to generate authentication token'
                }), 500
            
            print(f"✅ Token generated successfully")
            print(f"Token (first 20 chars): {token[:20]}...")
            print("=" * 50)
            
            # Remove password from response
            user_data = user.to_dict()
            
            return jsonify({
                'success': True,
                'message': 'Login successful',
                'token': token,
                'user': user_data
            }), 200
            
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({
                'success': False,
                'message': f'Login failed: {str(e)}'
            }), 500
    
    @staticmethod
    def get_user_profile():
        """
        Get current user's profile
        Requires authentication
        """
        try:
            user = request.current_user
            user_data = user.to_dict()
            
            return jsonify({
                'success': True,
                'user': user_data
            }), 200
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Failed to get user profile: {str(e)}'
            }), 500
    
    @staticmethod
    def update_user_profile():
        """
        Update current user's profile
        Requires authentication
        """
        try:
            user = request.current_user
            
            # Get form data
            name = request.form.get('name')
            email = request.form.get('email')
            current_password = request.form.get('current_password')
            new_password = request.form.get('new_password')
            
            # Update fields if provided
            if name:
                user.name = name
            
            if email and email != user.email:
                # Validate email format
                pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                if not re.match(pattern, email):
                    return jsonify({
                        'success': False,
                        'message': 'Invalid email format'
                    }), 400
                
                # Check if email is already taken
                existing_user = User.objects(email=email.lower()).first()
                if existing_user and str(existing_user.id) != str(user.id):
                    return jsonify({
                        'success': False,
                        'message': 'Email is already in use'
                    }), 409
                
                user.email = email.lower()
            
            # Update password if provided
            if new_password:
                if not current_password:
                    return jsonify({
                        'success': False,
                        'message': 'Current password is required to set new password'
                    }), 400
                
                # Verify current password
                if not user.check_password(current_password):
                    return jsonify({
                        'success': False,
                        'message': 'Current password is incorrect'
                    }), 401
                
                if len(new_password) < 6:
                    return jsonify({
                        'success': False,
                        'message': 'New password must be at least 6 characters long'
                    }), 400
                
                user.set_password(new_password)
            
            # Handle image upload to Cloudinary
            if 'image' in request.files:
                file = request.files['image']
                
                if file and file.filename:
                    # Check file extension
                    allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
                    if '.' not in file.filename or \
                       file.filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
                        return jsonify({
                            'success': False,
                            'message': 'Invalid image file. Allowed types: png, jpg, jpeg, gif, webp'
                        }), 400
                    
                    # Upload to Cloudinary
                    try:
                        upload_result = cloudinary.uploader.upload(
                            file,
                            folder="avocare/users",
                            public_id=f"user_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{user.email.split('@')[0]}"
                        )
                        image_url = upload_result.get('secure_url', '')
                        user.image = image_url
                    except Exception as upload_error:
                        return jsonify({
                            'success': False,
                            'message': f'Failed to upload image: {str(upload_error)}'
                        }), 500
            
            user.save()
            
            # Remove password from response
            user_data = user.to_dict()
            
            return jsonify({
                'success': True,
                'message': 'Profile updated successfully',
                'user': user_data
            }), 200
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Failed to update profile: {str(e)}'
            }), 500
    
    @staticmethod
    def get_all_users():
        """
        Get all users (Admin only)
        Requires admin authentication
        """
        try:
            users = User.objects()
            users_list = []
            for user in users:
                user_data = user.to_dict()
                users_list.append(user_data)
            
            return jsonify({
                'success': True,
                'count': len(users_list),
                'users': users_list
            }), 200
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Failed to get users: {str(e)}'
            }), 500
    
    @staticmethod
    def get_user_by_id(user_id):
        """
        Get user by ID (Admin only)
        """
        try:
            user = User.objects(id=user_id).first()
            
            if not user:
                return jsonify({
                    'success': False,
                    'message': 'User not found'
                }), 404
            
            user_data = user.to_dict()
            
            return jsonify({
                'success': True,
                'user': user_data
            }), 200
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Failed to get user: {str(e)}'
            }), 500
    
    @staticmethod
    def delete_user(user_id):
        """
        Delete user by ID (Admin only)
        """
        try:
            user = User.objects(id=user_id).first()
            
            if not user:
                return jsonify({
                    'success': False,
                    'message': 'User not found'
                }), 404
            
            user.delete()
            
            return jsonify({
                'success': True,
                'message': 'User deleted successfully'
            }), 200
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Failed to delete user: {str(e)}'
            }), 500