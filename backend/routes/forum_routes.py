from flask import Blueprint, request, jsonify
from datetime import datetime
import cloudinary
from cloudinary import uploader as cloudinary_uploader
from models.post import Post, Comment
from models.user import User
from middleware.auth_middleware import token_required
from utils.profanity_filter import censor_profanity, contains_profanity

forum_routes = Blueprint('forum_routes', __name__)

# CRITICAL: Handle both '/' and '' to support /api/forum and /api/forum/
# This prevents Flask redirects that break CORS

# --- 1. Get All Posts (public) ---
@forum_routes.route('', methods=['GET', 'OPTIONS'], strict_slashes=False)
@forum_routes.route('/', methods=['GET', 'OPTIONS'], strict_slashes=False)
def get_posts():
    """Get all forum posts. Handles both /api/forum and /api/forum/"""
    
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
    
    posts = Post.objects().order_by('-created_at')
    output = []
    
    for post in posts:
        output.append({
            'id': str(post.id),
            'title': post.title,
            'content': post.content,
            'username': post.author_name,
            'user_id': str(post.author.id) if post.author else None,
            'category': post.category,
            'imageUrl': post.image_url if post.image_url else None,
            'likes': post.like_count,
            'comments_count': len(post.comments),
            'created_at': post.created_at.isoformat() + 'Z' if post.created_at else None,
            'updated_at': (post.updated_at.isoformat() + 'Z' if hasattr(post, 'updated_at') and post.updated_at else (post.created_at.isoformat() + 'Z' if post.created_at else None)),
            'comments': [{
                'id': str(c.id) if hasattr(c, 'id') and c.id else None,
                'content': c.content,
                'author_name': c.author_name,
                'author_id': c.author_id if hasattr(c, 'author_id') else None,
                'created_at': c.created_at.isoformat() + 'Z' if c.created_at else None,
            } for c in post.comments]
        })
    return jsonify(output), 200

# --- 2. Create a Post ---
@forum_routes.route('', methods=['POST', 'OPTIONS'], strict_slashes=False)
@forum_routes.route('/', methods=['POST', 'OPTIONS'], strict_slashes=False)
@token_required
def create_post():
    """Create a new forum post with auto-censoring. Handles both /api/forum and /api/forum/"""
    
    # Handle CORS preflight (before auth)
    if request.method == 'OPTIONS':
        return '', 204
    
    user = request.current_user  # set by token_required

    # ---------------------------------------------------------------------------
    # Parse body — JSON when no image, multipart/form-data when image is attached
    # ---------------------------------------------------------------------------
    if request.is_json:
        data = request.get_json()
        title    = data.get('title') if data else None
        content  = data.get('content') if data else None
        category = data.get('category', 'general') if data else 'general'
        image_file = None
    else:
        # multipart/form-data
        title    = request.form.get('title')
        content  = request.form.get('content')
        category = request.form.get('category', 'general')
        image_file = request.files.get('image')

    if not title or not content:
        return jsonify({'error': 'title and content are required'}), 400

    # ---------------------------------------------------------------------------
    # AUTO-CENSOR PROFANITY - Automatically clean the text
    # ---------------------------------------------------------------------------
    was_censored = False
    original_title = title
    original_content = content
    
    # Censor title if it contains profanity
    if contains_profanity(title):
        title = censor_profanity(title)
        was_censored = True
    
    # Censor content if it contains profanity
    if contains_profanity(content):
        content = censor_profanity(content)
        was_censored = True

    # ---------------------------------------------------------------------------
    # Upload image to Cloudinary (if provided)
    # ---------------------------------------------------------------------------
    image_url = None
    if image_file:
        try:
            upload_result = cloudinary_uploader.upload(
                image_file,
                folder='avocare/forum',
                resource_type='image'
            )
            image_url = upload_result.get('secure_url')
        except Exception as e:
            print(f"Cloudinary upload error: {e}")
            return jsonify({'error': 'Image upload failed'}), 500

    # ---------------------------------------------------------------------------
    # Create post with censored content
    # ---------------------------------------------------------------------------
    author_name = getattr(user, 'name', 'Anonymous')

    new_post = Post(
        title=title,
        content=content,
        category=category,
        image_url=image_url,
        author=user,
        author_name=author_name
    )
    new_post.save()
    
    # Build response
    response_data = {
        'message': 'Post created',
        'post': {
            'id': str(new_post.id),
            'title': new_post.title,
            'content': new_post.content,
            'username': author_name,
            'user_id': str(user.id),
            'category': new_post.category,
            'imageUrl': new_post.image_url,
            'likes': 0,
            'comments_count': 0,
            'created_at': new_post.created_at.isoformat() + 'Z' if new_post.created_at else None,
            'comments': []
        }
    }
    
    # Notify user if content was censored
    if was_censored:
        response_data['censored'] = True
        response_data['message'] = 'Post created with inappropriate words censored'
    
    return jsonify(response_data), 201

# --- 3. Update a Post ---
@forum_routes.route('/<post_id>', methods=['PUT', 'OPTIONS'], strict_slashes=False)
@token_required
def update_post(post_id):
    """Update an existing post with auto-censoring (only by author)"""
    
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
    
    user = request.current_user
    post = Post.objects(id=post_id).first()
    
    if not post:
        return jsonify({'error': 'Post not found'}), 404
    
    # Check if user is the author
    if str(post.author.id) != str(user.id):
        return jsonify({'error': 'Unauthorized: You can only edit your own posts'}), 403
    
    # ---------------------------------------------------------------------------
    # Parse body — JSON when no new image, multipart when a new image is attached
    # ---------------------------------------------------------------------------
    if request.is_json:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        title        = data.get('title')
        content      = data.get('content')
        category     = data.get('category')
        remove_image = data.get('removeImage', False)
        image_file   = None
        
    else:
        # multipart/form-data (new image attached)
        title        = request.form.get('title')
        content      = request.form.get('content')
        category     = request.form.get('category')
        remove_image = False
        image_file   = request.files.get('image')

    # ---------------------------------------------------------------------------
    # AUTO-CENSOR PROFANITY in updated fields
    # ---------------------------------------------------------------------------
    was_censored = False
    
    if title and contains_profanity(title):
        title = censor_profanity(title)
        was_censored = True
    
    if content and contains_profanity(content):
        content = censor_profanity(content)
        was_censored = True

    # ---------------------------------------------------------------------------
    # Upload new image to Cloudinary (if provided)
    # ---------------------------------------------------------------------------
    if image_file:
        try:
            upload_result = cloudinary_uploader.upload(
                image_file,
                folder='avocare/forum',
                resource_type='image'
            )
            post.image_url = upload_result.get('secure_url')
        except Exception as e:
            print(f"Cloudinary upload error: {e}")
            return jsonify({'error': 'Image upload failed'}), 500
    elif remove_image:
        # Frontend explicitly asked to clear the existing image
        post.image_url = None

    # ---------------------------------------------------------------------------
    # Update text fields with censored content
    # ---------------------------------------------------------------------------
    if title:
        post.title = title
    if content:
        post.content = content
    if category:
        post.category = category
    
    # Update the timestamp
    post.updated_at = datetime.utcnow()
    
    post.save()
    
    response_data = {
        'message': 'Post updated successfully',
        'post': {
            'id': str(post.id),
            'title': post.title,
            'content': post.content,
            'category': post.category,
            'imageUrl': post.image_url
        }
    }
    
    # Notify user if content was censored
    if was_censored:
        response_data['censored'] = True
        response_data['message'] = 'Post updated with inappropriate words censored'
    
    return jsonify(response_data), 200

# --- 4. Delete a Post ---
@forum_routes.route('/<post_id>', methods=['DELETE', 'OPTIONS'], strict_slashes=False)
@token_required
def delete_post(post_id):
    """Delete a post (only by author)"""
    
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
    
    user = request.current_user
    post = Post.objects(id=post_id).first()
    
    if not post:
        return jsonify({'error': 'Post not found'}), 404
    
    # Check if user is the author
    if str(post.author.id) != str(user.id):
        return jsonify({'error': 'Unauthorized: You can only delete your own posts'}), 403
    
    post.delete()
    
    return jsonify({'message': 'Post deleted successfully'}), 200

# --- 5. Like / Unlike (Toggle) ---
@forum_routes.route('/<post_id>/like', methods=['PUT', 'OPTIONS'], strict_slashes=False)
@token_required
def like_post(post_id):
    """Toggle like on a post"""
    
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
    
    user = request.current_user
    post = Post.objects(id=post_id).first()
    
    if not post:
        return jsonify({'error': 'Post not found'}), 404

    if user in post.liked_by:
        post.update(pull__liked_by=user)
        action = 'unliked'
    else:
        post.update(add_to_set__liked_by=user)
        action = 'liked'
    
    post.reload()
    return jsonify({'message': action, 'likes': post.like_count}), 200

# --- 6. Add Comment ---
@forum_routes.route('/<post_id>/comment', methods=['POST', 'OPTIONS'], strict_slashes=False)
@token_required
def add_comment(post_id):
    """Add a comment to a post with auto-censoring"""
    
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
    
    user = request.current_user
    post = Post.objects(id=post_id).first()
    
    if not post:
        return jsonify({'error': 'Post not found'}), 404

    data = request.get_json()
    if not data or not data.get('content'):
        return jsonify({'error': 'content is required'}), 400

    comment_content = data.get('content')
    
    # ---------------------------------------------------------------------------
    # AUTO-CENSOR PROFANITY in comment
    # ---------------------------------------------------------------------------
    was_censored = False
    if contains_profanity(comment_content):
        comment_content = censor_profanity(comment_content)
        was_censored = True

    comment = Comment(
        content=comment_content,
        author_name=getattr(user, 'name', 'Anonymous'),
        author_id=str(user.id)
    )
    
    post.comments.append(comment)
    post.save()
    
    response_data = {'message': 'Comment added'}
    
    # Notify user if comment was censored
    if was_censored:
        response_data['censored'] = True
        response_data['message'] = 'Comment added with inappropriate words censored'
    
    return jsonify(response_data), 200

# --- 7. Update Comment ---
@forum_routes.route('/<post_id>/comment/<comment_index>', methods=['PUT', 'OPTIONS'], strict_slashes=False)
@token_required
def update_comment(post_id, comment_index):
    """Update a comment with auto-censoring (only by author)"""
    
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
    
    user = request.current_user
    post = Post.objects(id=post_id).first()
    
    if not post:
        return jsonify({'error': 'Post not found'}), 404
    
    try:
        # Convert comment_index to int if it's a numeric index
        # Or find comment by ID if comment_index looks like an ObjectId
        if comment_index.isdigit():
            idx = int(comment_index)
            if idx >= len(post.comments):
                return jsonify({'error': 'Comment not found'}), 404
            comment = post.comments[idx]
        else:
            # Find comment by ID
            comment = None
            for c in post.comments:
                if hasattr(c, 'id') and str(c.id) == comment_index:
                    comment = c
                    break
            if not comment:
                return jsonify({'error': 'Comment not found'}), 404
    except (ValueError, IndexError):
        return jsonify({'error': 'Invalid comment identifier'}), 400
    
    # Check if user is the comment author
    comment_author_id = comment.author_id if hasattr(comment, 'author_id') else None
    if comment_author_id != str(user.id):
        return jsonify({'error': 'Unauthorized: You can only edit your own comments'}), 403
    
    data = request.get_json()
    if not data or not data.get('content'):
        return jsonify({'error': 'content is required'}), 400
    
    updated_content = data.get('content')
    
    # ---------------------------------------------------------------------------
    # AUTO-CENSOR PROFANITY in updated comment
    # ---------------------------------------------------------------------------
    was_censored = False
    if contains_profanity(updated_content):
        updated_content = censor_profanity(updated_content)
        was_censored = True
    
    # Update comment content
    comment.content = updated_content
    post.save()
    
    response_data = {'message': 'Comment updated successfully'}
    
    # Notify user if comment was censored
    if was_censored:
        response_data['censored'] = True
        response_data['message'] = 'Comment updated with inappropriate words censored'
    
    return jsonify(response_data), 200

# --- 8. Delete Comment ---
@forum_routes.route('/<post_id>/comment/<comment_index>', methods=['DELETE', 'OPTIONS'], strict_slashes=False)
@token_required
def delete_comment(post_id, comment_index):
    """Delete a comment (only by author)"""
    
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
    
    user = request.current_user
    post = Post.objects(id=post_id).first()
    
    if not post:
        return jsonify({'error': 'Post not found'}), 404
    
    try:
        # Similar logic to update_comment
        if comment_index.isdigit():
            idx = int(comment_index)
            if idx >= len(post.comments):
                return jsonify({'error': 'Comment not found'}), 404
            comment = post.comments[idx]
        else:
            comment = None
            comment_idx = None
            for i, c in enumerate(post.comments):
                if hasattr(c, 'id') and str(c.id) == comment_index:
                    comment = c
                    comment_idx = i
                    break
            if not comment:
                return jsonify({'error': 'Comment not found'}), 404
            idx = comment_idx
    except (ValueError, IndexError):
        return jsonify({'error': 'Invalid comment identifier'}), 400
    
    # Check if user is the comment author
    comment_author_id = comment.author_id if hasattr(comment, 'author_id') else None
    if comment_author_id != str(user.id):
        return jsonify({'error': 'Unauthorized: You can only delete your own comments'}), 403
    
    # Remove comment from the list
    post.comments.pop(idx)
    post.save()
    
    return jsonify({'message': 'Comment deleted successfully'}), 200