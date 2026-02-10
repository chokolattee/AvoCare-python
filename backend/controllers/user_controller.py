# controllers/user_controller.py
from flask import request, jsonify
from models.user import User
from utils.cloudinary_helper import CloudinaryHelper
from utils.email_service import EmailService
import re
from datetime import datetime
import cloudinary
import cloudinary.uploader

class UserController:
    @staticmethod
    def register():
        """Register a new user with email/password or Google"""
        try:
            print("=" * 50)
            print("REGISTRATION REQUEST RECEIVED")
            print("=" * 50)
            
            # Parse JSON body
            data = request.get_json() if request.is_json else {}
            
            # Get data (support both JSON and form-data)
            email = data.get('email') or request.form.get('email')
            password = data.get('password') or request.form.get('password')
            name = data.get('name') or request.form.get('name', '')
            role = data.get('role') or request.form.get('role', 'user')
            status = data.get('status') or request.form.get('status', 'active')
            
            # Google auth fields
            firebase_uid = data.get('firebase_uid')
            auth_provider = data.get('auth_provider', 'email')
            google_photo = data.get('photo_url', '')
            
            print(f"Email: {email}")
            print(f"Auth Provider: {auth_provider}")
            print(f"Firebase UID: {firebase_uid}")
            
            # Validate required fields
            if not email:
                return jsonify({"success": False, "message": "Email is required."}), 400
            
            # For email auth, password is required
            if auth_provider == 'email' and not password:
                return jsonify({"success": False, "message": "Password is required."}), 400
            
            # Validate email format
            pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(pattern, email):
                return jsonify({"success": False, "message": "Invalid email format."}), 400
            
            # Validate password length (only for email auth)
            if auth_provider == 'email' and len(password) < 6:
                return jsonify({"success": False, "message": "Password must be at least 6 characters."}), 400
            
            # Check if user already exists
            existing_user = User.objects(email=email.lower()).first()
            if existing_user:
                return jsonify({"success": False, "message": "Email is already registered."}), 409
            
            # Handle image
            image_url = google_photo  # Use Google photo if available
            
            # Check for uploaded image file
            if 'image' in request.files:
                file = request.files['image']
                if file and file.filename and CloudinaryHelper.validate_image_file(file.filename):
                    upload_result = CloudinaryHelper.upload_image(
                        file,
                        folder="avocare/users",
                        prefix=f"user_{email.split('@')[0]}"
                    )
                    if upload_result['success']:
                        image_url = upload_result['url']
            
            # Create new user
            user = User(
                name=name or email.split('@')[0],
                email=email.lower(),
                image=image_url,
                role=role,
                status=status,
                firebase_uid=firebase_uid,
                auth_provider=auth_provider,
                email_verified=(auth_provider == 'google')  # Google emails are pre-verified
            )
            
            # Set password (only for email auth)
            if auth_provider == 'email' and password:
                user.set_password(password)
            
            user.save()
            
            print(f"✅ User created successfully! ID: {user.id}")
            
            # Send verification email (only for email auth)
            email_sent = False
            if auth_provider == 'email':
                verification_token = user.generate_verification_token()
                user.save()  # Save the verification token
                email_sent = EmailService.send_verification_email(user.email, user.name, verification_token)
                print(f"📧 Verification email sent: {email_sent}")
            
            message = "Registration successful!"
            if auth_provider == 'email':
                if email_sent:
                    message = "Registration successful! Please check your email to verify your account."
                else:
                    message = "Registration successful! However, we couldn't send the verification email. Please contact support."
            
            print("=" * 50)
            
            return jsonify({
                "success": True,
                "user": user.to_dict(),
                "message": message
            }), 201
            
        except Exception as e:
            print(f"❌ Registration error: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({"success": False, "message": str(e)}), 500
    
    @staticmethod
    def login():
        """Login with email/password or Google"""
        try:
            print("=" * 50)
            print("LOGIN REQUEST RECEIVED")
            print("=" * 50)
            
            data = request.get_json()
            
            if not data:
                return jsonify({'success': False, 'message': 'No data provided'}), 400
            
            email = data.get('email')
            password = data.get('password')
            firebase_uid = data.get('firebase_uid')
            id_token = data.get('id_token')
            
            print(f"Email: {email}")
            print(f"Has Firebase UID: {bool(firebase_uid)}")
            print(f"Has ID Token: {bool(id_token)}")
            
            if not email:
                return jsonify({'success': False, 'message': 'Email is required'}), 400
            
            # Find user
            user = User.objects(email=email.lower()).first()
            
            # Google Sign-In Flow
            if firebase_uid or id_token:
                # If user doesn't exist, create them (auto-register)
                if not user:
                    print("📝 Auto-registering Google user...")
                    user = User(
                        name=data.get('name', email.split('@')[0]),
                        email=email.lower(),
                        image=data.get('photo_url', ''),
                        role='user',
                        status='active',
                        firebase_uid=firebase_uid,
                        auth_provider='google',
                        email_verified=True  # Google emails are pre-verified
                    )
                    user.save()
                    print(f"✅ New Google user created: {user.id}")
                else:
                    # Update existing user with Firebase UID if not set
                    if not user.firebase_uid:
                        user.firebase_uid = firebase_uid
                        user.auth_provider = 'google'
                        user.email_verified = True
                        user.save()
                        print("✅ Updated existing user with Firebase UID")
            
            # Email/Password Flow
            else:
                if not password:
                    return jsonify({'success': False, 'message': 'Password is required'}), 400
                
                if not user:
                    return jsonify({'success': False, 'message': 'No account found with this email'}), 404
                
                # Check password
                if not user.check_password(password):
                    return jsonify({'success': False, 'message': 'Invalid email or password'}), 401
                
                # Check email verification
                if not user.email_verified:
                    return jsonify({
                        'success': False,
                        'message': 'Please verify your email before logging in. Check your inbox for the verification link.',
                        'needs_verification': True
                    }), 403
            
            # Check if user is active
            if user.status != 'active':
                return jsonify({'success': False, 'message': 'Account is not active. Please contact administrator.'}), 403
            
            # Generate token
            token = user.generate_token()
            
            if not token:
                return jsonify({'success': False, 'message': 'Failed to generate authentication token'}), 500
            
            print(f"✅ Login successful for {user.email}")
            print("=" * 50)
            
            return jsonify({
                'success': True,
                'message': 'Login successful',
                'token': token,
                'user': user.to_dict()
            }), 200
            
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'message': f'Login failed: {str(e)}'}), 500
    
    @staticmethod
    def verify_email():
        """Verify user email with token"""
        try:
            token = request.args.get('token')
            
            if not token:
                return jsonify({'success': False, 'message': 'Verification token is required'}), 400
            
            # Find user by verification token
            user = User.objects(verification_token=token).first()
            
            if not user:
                return jsonify({'success': False, 'message': 'Invalid or expired verification token'}), 404
            
            # Check if token has expired
            if user.verification_token_expires and user.verification_token_expires < datetime.utcnow():
                return jsonify({'success': False, 'message': 'Verification token has expired. Please request a new one.'}), 410
            
            # Mark email as verified
            user.email_verified = True
            user.verification_token = None
            user.verification_token_expires = None
            user.save()
            
            print(f"✅ Email verified for {user.email}")
            
            return jsonify({
                'success': True,
                'message': 'Email verified successfully! You can now log in.'
            }), 200
            
        except Exception as e:
            print(f"❌ Email verification error: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'message': str(e)}), 500
    
    @staticmethod
    def resend_verification():
        """Resend verification email"""
        try:
            data = request.get_json()
            email = data.get('email')
            
            if not email:
                return jsonify({'success': False, 'message': 'Email is required'}), 400
            
            user = User.objects(email=email.lower()).first()
            
            if not user:
                return jsonify({'success': False, 'message': 'User not found'}), 404
            
            if user.email_verified:
                return jsonify({'success': False, 'message': 'Email is already verified'}), 400
            
            # Generate new verification token
            verification_token = user.generate_verification_token()
            user.save()
            
            # Send verification email
            email_sent = EmailService.send_verification_email(user.email, user.name, verification_token)
            
            if email_sent:
                return jsonify({
                    'success': True,
                    'message': 'Verification email sent! Please check your inbox.'
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'message': 'Failed to send verification email. Please try again later.'
                }), 500
            
        except Exception as e:
            print(f"❌ Resend verification error: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'message': str(e)}), 500
    
    @staticmethod
    def get_user_profile():
        """Get current user's profile"""
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
        """Update current user's profile"""
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
        """Get all users (Admin only)"""
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
        """Get user by ID (Admin only)"""
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
    def update_user(user_id):
        """Update user status and role (Admin only)"""
        try:
            user = User.objects(id=user_id).first()
            
            if not user:
                return jsonify({
                    'success': False,
                    'message': 'User not found'
                }), 404
            
            data = request.get_json()
            
            # Update role if provided
            if 'role' in data:
                role = data.get('role')
                if role not in ['user', 'admin']:
                    return jsonify({
                        'success': False,
                        'message': 'Invalid role. Must be user or admin'
                    }), 400
                user.role = role
            
            # Update status if provided
            if 'status' in data:
                status = data.get('status')
                if status not in ['active', 'inactive', 'deactivated']:
                    return jsonify({
                        'success': False,
                        'message': 'Invalid status. Must be active, inactive, or deactivated'
                    }), 400
                user.status = status
            
            user.save()
            
            return jsonify({
                'success': True,
                'message': 'User updated successfully',
                'user': user.to_dict()
            }), 200
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Failed to update user: {str(e)}'
            }), 500
    
    @staticmethod
    def delete_user(user_id):
        """Delete user by ID (Admin only)"""
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