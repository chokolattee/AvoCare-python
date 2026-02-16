from flask import Blueprint, request, jsonify, g
from datetime import datetime
import json
import cloudinary
from cloudinary import uploader as cloudinary_uploader
from models.post import Post, Comment
from models.user import User
from middleware.auth_middleware import token_required
from utils.profanity_filter import contains_profanity

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
    
    posts = Post.objects(archived=False).order_by('-created_at')
    output = []
    
    for post in posts:
        # Handle both old single image and new multiple images
        image_urls = []
        if hasattr(post, 'image_urls') and post.image_urls:
            image_urls = post.image_urls
        elif hasattr(post, 'image_url') and post.image_url:
            image_urls = [post.image_url]
            
        output.append({
            'id': str(post.id),
            'title': post.title,
            'content': post.content,
            'username': post.author_name,
            'user_id': str(post.author.id) if post.author else None,
            'author_image': post.author.image if post.author and post.author.image else '',
            'category': post.category,
            'imageUrls': image_urls,
            'likes': post.like_count,
            'comments_count': len(post.comments),
            'created_at': post.created_at.isoformat() + 'Z' if post.created_at else None,
            'updated_at': (post.updated_at.isoformat() + 'Z' if hasattr(post, 'updated_at') and post.updated_at else (post.created_at.isoformat() + 'Z' if post.created_at else None)),
            'archived': post.archived if hasattr(post, 'archived') else False,
            'comments': [{
                'id': str(c.id) if hasattr(c, 'id') and c.id else None,
                'content': c.content,
                'author_name': c.author_name,
                'author_id': c.author_id if hasattr(c, 'author_id') else None,
                'reply_to': c.reply_to if hasattr(c, 'reply_to') else None,
                'likes': len(c.liked_by) if hasattr(c, 'liked_by') and c.liked_by else 0,
                'liked_by': c.liked_by if hasattr(c, 'liked_by') and c.liked_by else [],
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
    # REJECT PROFANITY - Do not allow posts with bad words
    # ---------------------------------------------------------------------------
    if contains_profanity(title):
        return jsonify({
            'error': 'Title contains inappropriate language. Please remove offensive words and try again.'
        }), 400
    
    if contains_profanity(content):
        return jsonify({
            'error': 'Content contains inappropriate language. Please remove offensive words and try again.'
        }), 400

    # ---------------------------------------------------------------------------
    # Upload multiple images to Cloudinary (if provided)
    # ---------------------------------------------------------------------------
    image_urls = []
    
    # Handle multiple images from form data
    image_files = request.files.getlist('images')
    for img_file in image_files[:5]:  # Limit to 5 images
        if img_file:
            try:
                upload_result = cloudinary_uploader.upload(
                    img_file,
                    folder='avocare/forum',
                    resource_type='image'
                )
                image_urls.append(upload_result.get('secure_url'))
            except Exception as e:
                print(f"Cloudinary upload error: {e}")
                return jsonify({'error': f'Image upload failed: {str(e)}'}), 500
    
    # Fallback: handle single image for backward compatibility
    if not image_urls and image_file:
        try:
            upload_result = cloudinary_uploader.upload(
                image_file,
                folder='avocare/forum',
                resource_type='image'
            )
            image_urls.append(upload_result.get('secure_url'))
        except Exception as e:
            print(f"Cloudinary upload error: {e}")
            return jsonify({'error': 'Image upload failed'}), 500

    # ---------------------------------------------------------------------------
    # Create post
    # ---------------------------------------------------------------------------
    author_name = getattr(user, 'name', 'Anonymous')

    new_post = Post(
        title=title,
        content=content,
        category=category,
        image_urls=image_urls,
        author=user,
        author_name=author_name,
        archived=False
    )
    new_post.save()
    
    # Build response
    response_data = {
        'message': 'Post created successfully',
        'post': {
            'id': str(new_post.id),
            'title': new_post.title,
            'content': new_post.content,
            'username': author_name,
            'user_id': str(user.id),
            'author_image': user.image if user.image else '',
            'category': new_post.category,
            'imageUrls': new_post.image_urls,
            'likes': 0,
            'comments_count': 0,
            'created_at': new_post.created_at.isoformat() + 'Z' if new_post.created_at else None,
            'archived': False,
            'comments': []
        }
    }
    
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
        keep_image_urls = data.get('keepImageUrls', [])
        image_file   = None
        
    else:
        # multipart/form-data (new image attached)
        title        = request.form.get('title')
        content      = request.form.get('content')
        category     = request.form.get('category')
        remove_image = request.form.get('removeImage', 'false').lower() == 'true'
        keep_image_urls_str = request.form.get('keepImageUrls', '[]')
        try:
            keep_image_urls = json.loads(keep_image_urls_str)
        except:
            keep_image_urls = []
        image_file   = request.files.get('image')

    # ---------------------------------------------------------------------------
    # REJECT PROFANITY in updated fields
    # ---------------------------------------------------------------------------
    if title and contains_profanity(title):
        return jsonify({
            'error': 'Title contains inappropriate language. Please remove offensive words and try again.'
        }), 400
    
    if content and contains_profanity(content):
        return jsonify({
            'error': 'Content contains inappropriate language. Please remove offensive words and try again.'
        }), 400

    # ---------------------------------------------------------------------------
    # Upload new images to Cloudinary (if provided)
    # ---------------------------------------------------------------------------
    # Start with existing images that should be kept
    new_image_urls = []
    
    # Filter existing images - only keep those in keep_image_urls list
    if hasattr(post, 'image_urls') and post.image_urls:
        new_image_urls = [url for url in post.image_urls if url in keep_image_urls]
    elif hasattr(post, 'image_url') and post.image_url:
        # Handle old single image format
        if post.image_url in keep_image_urls:
            new_image_urls = [post.image_url]
    
    # Handle multiple new images
    image_files = request.files.getlist('images')
    for img_file in image_files[:5]:  # Limit to 5 images
        if img_file:
            try:
                upload_result = cloudinary_uploader.upload(
                    img_file,
                    folder='avocare/forum',
                    resource_type='image'
                )
                new_image_urls.append(upload_result.get('secure_url'))
            except Exception as e:
                print(f"Cloudinary upload error: {e}")
                return jsonify({'error': f'Image upload failed: {str(e)}'}), 500
    
    # Handle single image for backward compatibility
    if image_file:
        try:
            upload_result = cloudinary_uploader.upload(
                image_file,
                folder='avocare/forum',
                resource_type='image'
            )
            new_image_urls.append(upload_result.get('secure_url'))
        except Exception as e:
            print(f"Cloudinary upload error: {e}")
            return jsonify({'error': 'Image upload failed'}), 500
    elif remove_image:
        # Frontend explicitly asked to clear all the existing images
        new_image_urls = []
    
    # Update image_urls field
    post.image_urls = new_image_urls
    if hasattr(post, 'image_url'):
        post.image_url = None  # Clear old single image field

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
    
    # Handle both old single image and new multiple images
    image_urls = []
    if hasattr(post, 'image_urls') and post.image_urls:
        image_urls = post.image_urls
    elif hasattr(post, 'image_url') and post.image_url:
        image_urls = [post.image_url]
    
    response_data = {
        'message': 'Post updated successfully',
        'post': {
            'id': str(post.id),
            'title': post.title,
            'content': post.content,
            'category': post.category,
            'imageUrls': image_urls
        }
    }
    
    return jsonify(response_data), 200

# --- 4. Archive a Post ---
@forum_routes.route('/<post_id>/archive', methods=['PUT', 'OPTIONS'], strict_slashes=False)
@token_required
def archive_post(post_id):
    """Archive a post (only by author)"""
    
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
    
    user = request.current_user
    post = Post.objects(id=post_id).first()
    
    if not post:
        return jsonify({'error': 'Post not found'}), 404
    
    # Check if user is the author
    if str(post.author.id) != str(user.id):
        return jsonify({'error': 'Unauthorized: You can only archive your own posts'}), 403
    
    post.archived = True
    post.save()
    
    return jsonify({'message': 'Post archived successfully'}), 200

# --- 4b. Unarchive a Post ---
@forum_routes.route('/<post_id>/unarchive', methods=['PUT', 'OPTIONS'], strict_slashes=False)
@token_required
def unarchive_post(post_id):
    """Unarchive a post (only by author)"""
    
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
    
    user = request.current_user
    post = Post.objects(id=post_id).first()
    
    if not post:
        return jsonify({'error': 'Post not found'}), 404
    
    # Check if user is the author
    if str(post.author.id) != str(user.id):
        return jsonify({'error': 'Unauthorized: You can only unarchive your own posts'}), 403
    
    post.archived = False
    post.save()
    
    return jsonify({'message': 'Post unarchived successfully'}), 200

# --- 4c. Get Archived Posts ---
@forum_routes.route('/archived', methods=['GET', 'OPTIONS'], strict_slashes=False)
@token_required
def get_archived_posts():
    """Get archived posts for current user"""
    
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
    
    user = request.current_user
    posts = Post.objects(author=user, archived=True).order_by('-created_at')
    output = []
    
    for post in posts:
        # Handle both old single image and new multiple images
        image_urls = []
        if hasattr(post, 'image_urls') and post.image_urls:
            image_urls = post.image_urls
        elif hasattr(post, 'image_url') and post.image_url:
            image_urls = [post.image_url]
            
        output.append({
            'id': str(post.id),
            'title': post.title,
            'content': post.content,
            'username': post.author_name if post.author_name else 'Anonymous',
            'user_id': str(post.author.id) if post.author else None,
            'category': post.category,
            'imageUrls': image_urls,
            'likes': post.like_count,
            'comments_count': len(post.comments) if post.comments else 0,
            'created_at': post.created_at.isoformat() + 'Z' if post.created_at else None,
            'updated_at': post.updated_at.isoformat() + 'Z' if hasattr(post, 'updated_at') and post.updated_at else None,
            'archived': True,
            'comments': [
                {
                    'content': c.content,
                    'author_name': c.author_name,
                    'created_at': c.created_at.isoformat() + 'Z' if c.created_at else None
                } for c in (post.comments or [])
            ]
        })
    
    return jsonify(output), 200

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
    reply_to = data.get('reply_to')  # Optional: comment ID to reply to
    
    # ---------------------------------------------------------------------------
    # REJECT PROFANITY in comment
    # ---------------------------------------------------------------------------
    if contains_profanity(comment_content):
        return jsonify({
            'error': 'Comment contains inappropriate language. Please remove offensive words and try again.'
        }), 400

    comment = Comment(
        content=comment_content,
        author_name=getattr(user, 'name', 'Anonymous'),
        author_id=str(user.id),
        reply_to=reply_to if reply_to else None
    )
    
    post.comments.append(comment)
    post.save()
    
    return jsonify({'message': 'Comment added successfully'}), 201

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
    # REJECT PROFANITY in updated comment
    # ---------------------------------------------------------------------------
    if contains_profanity(updated_content):
        return jsonify({
            'error': 'Comment contains inappropriate language. Please remove offensive words and try again.'
        }), 400
    
    # Update comment content
    comment.content = updated_content
    post.save()
    
    return jsonify({'message': 'Comment updated successfully'}), 200

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

# --- 9. Like / Unlike Comment ---
@forum_routes.route('/<post_id>/comment/<comment_index>/like', methods=['PUT', 'OPTIONS'], strict_slashes=False)
@token_required
def like_comment(post_id, comment_index):
    """Toggle like on a comment"""
    
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
    
    user = request.current_user
    post = Post.objects(id=post_id).first()
    
    if not post:
        return jsonify({'error': 'Post not found'}), 404
    
    try:
        if comment_index.isdigit():
            idx = int(comment_index)
            if idx >= len(post.comments):
                return jsonify({'error': 'Comment not found'}), 404
            comment = post.comments[idx]
        else:
            comment = None
            for i, c in enumerate(post.comments):
                if hasattr(c, 'id') and str(c.id) == comment_index:
                    comment = c
                    idx = i
                    break
            if not comment:
                return jsonify({'error': 'Comment not found'}), 404
    except (ValueError, IndexError):
        return jsonify({'error': 'Invalid comment identifier'}), 400
    
    # Initialize liked_by if it doesn't exist
    if not hasattr(comment, 'liked_by') or comment.liked_by is None:
        comment.liked_by = []
    
    user_id = str(user.id)
    
    # Toggle like
    if user_id in comment.liked_by:
        comment.liked_by.remove(user_id)
        action = 'unliked'
    else:
        comment.liked_by.append(user_id)
        action = 'liked'
    
    post.save()
    
    return jsonify({
        'message': action,
        'likes': len(comment.liked_by),
        'comment_index': idx
    }), 200