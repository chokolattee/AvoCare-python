# utils/image_utils.py
from PIL import Image, ImageDraw, ImageFont
import io
import base64
from datetime import datetime
from utils.cloudinary_helper import CloudinaryHelper


def upload_to_cloudinary(image_data, folder, filename_prefix):
    """
    Upload image to Cloudinary using CloudinaryHelper
    
    Args:
        image_data: Base64 string or file path
        folder: Cloudinary folder (e.g., 'history/ripeness', 'history/leaves')
        filename_prefix: Prefix for filename (e.g., 'ripeness_', 'leaf_')
    
    Returns:
        dict: {
            'url': 'https://...',
            'public_id': 'history/ripeness/ripeness_123456',
            'secure_url': 'https://...'
        }
    """
    try:
        # Validate inputs
        if not image_data:
            raise ValueError("Image data is required")
        
        if not folder:
            raise ValueError("Folder path is required")
        
        if not filename_prefix:
            raise ValueError("Filename prefix is required")
        
        # Convert base64 to file-like object if needed
        if isinstance(image_data, str):
            # Remove data URL prefix if present
            if 'base64,' in image_data:
                image_data = image_data.split('base64,')[1]
            
            # Decode base64 to bytes
            try:
                image_bytes = base64.b64decode(image_data)
            except Exception as e:
                raise ValueError(f"Invalid base64 image data: {str(e)}")
            
            image_file = io.BytesIO(image_bytes)
        else:
            image_file = image_data
        
        # Upload using CloudinaryHelper
        result = CloudinaryHelper.upload_image(
            file=image_file,
            folder=folder,
            prefix=filename_prefix
        )
        
        if result['success']:
            print(f"✅ Image uploaded to Cloudinary: {result['url']}")
            return {
                'url': result['url'],
                'public_id': result['public_id'],
                'secure_url': result['url']  # CloudinaryHelper returns secure_url by default
            }
        else:
            raise Exception(result.get('error', 'Upload failed'))
        
    except Exception as e:
        print(f"❌ Cloudinary upload error: {str(e)}")
        raise


def draw_bounding_boxes(image_data, detections, image_size, analysis_type='ripeness'):
    """
    Draw bounding boxes on image
    
    Args:
        image_data: Base64 string or PIL Image
        detections: List of detection objects or single detection
        image_size: dict with 'width' and 'height'
        analysis_type: 'ripeness', 'leaf', or 'fruit_disease'
    
    Returns:
        str: Base64 encoded image with bounding boxes
    """
    try:
        # Validate inputs
        if not image_data:
            raise ValueError("Image data is required")
        
        # Load image
        if isinstance(image_data, str):
            # Remove data URL prefix if present
            if 'base64,' in image_data:
                image_data = image_data.split('base64,')[1]
            image_bytes = base64.b64decode(image_data)
            img = Image.open(io.BytesIO(image_bytes))
        else:
            img = image_data
        
        # Convert to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Create drawing context
        draw = ImageDraw.Draw(img)
        
        # Try to load a font
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
        except:
            try:
                font = ImageFont.truetype("arial.ttf", 16)
            except:
                font = ImageFont.load_default()
        
        # Get image dimensions
        img_width, img_height = img.size
        
        # Normalize detections to list
        if not isinstance(detections, list):
            detections = [detections]
        
        print(f"🎨 Drawing {len(detections)} bounding box(es) on {img_width}x{img_height} image")
        
        # Draw each detection
        for idx, detection in enumerate(detections):
            # Get bbox (normalized coordinates 0-1)
            bbox = detection.get('bbox', [0.25, 0.25, 0.5, 0.5])
            
            # Validate bbox
            if len(bbox) != 4:
                print(f"⚠️  Invalid bbox for detection {idx + 1}, using default")
                bbox = [0.25, 0.25, 0.5, 0.5]
            
            # Convert normalized to absolute coordinates
            x1 = int(bbox[0] * img_width)
            y1 = int(bbox[1] * img_height)
            x2 = int((bbox[0] + bbox[2]) * img_width)
            y2 = int((bbox[1] + bbox[3]) * img_height)
            
            # Ensure coordinates are within image bounds
            x1 = max(0, min(x1, img_width))
            y1 = max(0, min(y1, img_height))
            x2 = max(0, min(x2, img_width))
            y2 = max(0, min(y2, img_height))
            
            # Get class and confidence
            class_name = detection.get('class', detection.get('ripeness', 'Unknown'))
            confidence = detection.get('confidence', 0.0)
            
            # Choose color based on analysis type and class
            color = get_bbox_color(class_name, analysis_type)
            
            print(f"   Box {idx + 1}: {class_name} ({confidence:.2%}) at [{x1},{y1},{x2},{y2}] - color: {color}")
            
            # Draw rectangle
            draw.rectangle([x1, y1, x2, y2], outline=color, width=3)
            
            # Draw label background
            label = f"{class_name} {confidence:.2%}"
            
            # Get text bounding box
            try:
                bbox_text = draw.textbbox((x1, y1 - 25), label, font=font)
                text_width = bbox_text[2] - bbox_text[0]
                text_height = bbox_text[3] - bbox_text[1]
            except:
                # Fallback for older Pillow versions
                text_width, text_height = draw.textsize(label, font=font)
            
            # Draw label background
            draw.rectangle(
                [x1, y1 - text_height - 8, x1 + text_width + 10, y1],
                fill=color
            )
            
            # Draw label text
            draw.text((x1 + 5, y1 - text_height - 4), label, fill='white', font=font)
        
        # Convert back to base64
        buffered = io.BytesIO()
        img.save(buffered, format='PNG')
        img_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        print(f"✅ Successfully drew {len(detections)} bounding box(es)")
        
        return f"data:image/png;base64,{img_base64}"
        
    except Exception as e:
        print(f"❌ Error drawing bounding boxes: {str(e)}")
        import traceback
        traceback.print_exc()
        raise


def get_bbox_color(class_name, analysis_type):
    """
    Get color for bounding box based on class and analysis type
    
    Args:
        class_name: Detection class name
        analysis_type: 'ripeness', 'leaf', or 'fruit_disease'
    
    Returns:
        str: Color in hex format
    """
    # Ripeness colors
    if analysis_type == 'ripeness':
        colors = {
            'underripe': '#FF6B6B',  # Red
            'ripe': '#4ECDC4',       # Teal
            'overripe': '#FFE66D',   # Yellow
            'unripe': '#FF6B6B',
            'perfect': '#51CF66',    # Green
        }
        return colors.get(class_name.lower(), '#4ECDC4')
    
    # Leaf disease colors
    elif analysis_type == 'leaf':
        colors = {
            'healthy': '#51CF66',           # Green
            'anthracnose': '#FF6B6B',       # Red
            'nutrient deficient': '#FFE66D', # Yellow
            'pest infested': '#FF922B',     # Orange
        }
        return colors.get(class_name.lower(), '#4ECDC4')
    
    # Fruit disease colors
    elif analysis_type == 'fruit_disease':
        colors = {
            'healthy': '#51CF66',          # Green
            'anthracnose': '#FF6B6B',      # Red
            'stem end rot': '#FF922B',     # Orange
            'cercospora spot': '#FFE66D',  # Yellow
        }
        return colors.get(class_name.lower(), '#4ECDC4')
    
    # Default
    return '#4ECDC4'


def process_and_upload_images(image_data, detections, image_size, analysis_type, user_id):
    """
    Process and upload both original and annotated images
    
    Args:
        image_data: Base64 image string
        detections: Detection objects with bounding boxes (can be single dict or list)
        image_size: dict with 'width' and 'height'
        analysis_type: 'ripeness', 'leaf', or 'fruit_disease'
        user_id: User ID for folder organization
    
    Returns:
        dict: {
            'original_image_url': 'https://...',
            'annotated_image_url': 'https://...',
            'original_public_id': 'history/...',
            'annotated_public_id': 'history/...'
        }
    """
    try:
        # Validate inputs
        if not image_data:
            raise ValueError("Image data is required")
        
        if not detections:
            raise ValueError("Detections data is required")
        
        # Normalize detections to list
        if not isinstance(detections, list):
            detections = [detections]
        
        print(f"📸 Processing {len(detections)} detection(s) for {analysis_type}")
        
        # Create folder structure
        folder = f"history/{analysis_type}/{user_id}"
        
        # Upload original image
        print(f"📤 Uploading original image to {folder}...")
        original_result = upload_to_cloudinary(
            image_data,
            folder,
            f"{analysis_type}_original_"
        )
        
        # Create annotated image with bounding boxes
        print(f"🎨 Drawing {len(detections)} bounding box(es)...")
        annotated_image = draw_bounding_boxes(
            image_data,
            detections,
            image_size,
            analysis_type
        )
        
        # Upload annotated image
        print(f"📤 Uploading annotated image to {folder}...")
        annotated_result = upload_to_cloudinary(
            annotated_image,
            folder,
            f"{analysis_type}_annotated_"
        )
        
        print(f"✅ Successfully uploaded images:")
        print(f"   - Original: {original_result['secure_url']}")
        print(f"   - Annotated: {annotated_result['secure_url']}")
        
        return {
            'original_image_url': original_result['secure_url'],
            'annotated_image_url': annotated_result['secure_url'],
            'original_public_id': original_result['public_id'],
            'annotated_public_id': annotated_result['public_id']
        }
        
    except Exception as e:
        print(f"❌ Error processing images: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return None values if upload fails - don't crash the save
        return {
            'original_image_url': None,
            'annotated_image_url': None,
            'original_public_id': None,
            'annotated_public_id': None
        }


def process_and_upload_multiple_images(images_data):
    """
    Process and upload multiple images at once (batch processing)
    
    Args:
        images_data: List of dicts, each containing:
            - image_data: Base64 image string
            - detections: Detection objects with bounding boxes
            - image_size: dict with 'width' and 'height'
            - analysis_type: 'ripeness', 'leaf', or 'fruit_disease'
            - user_id: User ID for folder organization
    
    Returns:
        list: List of result dicts, each containing:
            {
                'success': True/False,
                'original_image_url': 'https://...',
                'annotated_image_url': 'https://...',
                'original_public_id': 'history/...',
                'annotated_public_id': 'history/...',
                'error': 'Error message if failed'
            }
    """
    results = []
    
    print(f"📦 Starting batch processing of {len(images_data)} images...")
    
    for idx, image_info in enumerate(images_data):
        print(f"\n📸 Processing image {idx + 1}/{len(images_data)}...")
        
        try:
            # Validate required fields
            if not all(key in image_info for key in ['image_data', 'detections', 'analysis_type', 'user_id']):
                raise ValueError("Missing required fields in image data")
            
            # Process and upload this image
            result = process_and_upload_images(
                image_data=image_info['image_data'],
                detections=image_info['detections'],
                image_size=image_info.get('image_size', {'width': 800, 'height': 600}),
                analysis_type=image_info['analysis_type'],
                user_id=image_info['user_id']
            )
            
            # Check if upload was successful
            if result['original_image_url'] and result['annotated_image_url']:
                results.append({
                    'success': True,
                    **result
                })
                print(f"✅ Image {idx + 1} processed successfully")
            else:
                results.append({
                    'success': False,
                    'error': 'Image upload failed',
                    **result
                })
                print(f"⚠️  Image {idx + 1} upload failed")
                
        except Exception as e:
            print(f"❌ Error processing image {idx + 1}: {str(e)}")
            results.append({
                'success': False,
                'error': str(e),
                'original_image_url': None,
                'annotated_image_url': None,
                'original_public_id': None,
                'annotated_public_id': None
            })
    
    successful = sum(1 for r in results if r['success'])
    print(f"\n✅ Batch processing complete: {successful}/{len(images_data)} images uploaded successfully")
    
    return results


def delete_cloudinary_images(public_ids):
    """
    Delete images from Cloudinary using CloudinaryHelper
    
    Args:
        public_ids: List of public IDs or single public ID
    
    Returns:
        bool: Success status
    """
    try:
        if not public_ids:
            return True
        
        if isinstance(public_ids, str):
            public_ids = [public_ids]
        
        # Filter out None values
        public_ids = [pid for pid in public_ids if pid]
        
        if not public_ids:
            return True
        
        print(f"🗑️  Deleting {len(public_ids)} images from Cloudinary...")
        
        for public_id in public_ids:
            try:
                result = CloudinaryHelper.delete_image(public_id)
                if result['success']:
                    print(f"✅ Deleted: {public_id}")
                else:
                    print(f"⚠️  Failed to delete {public_id}: {result.get('error')}")
            except Exception as e:
                print(f"⚠️  Failed to delete {public_id}: {str(e)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error deleting images: {str(e)}")
        return False