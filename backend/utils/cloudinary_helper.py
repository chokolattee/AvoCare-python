import cloudinary
import cloudinary.uploader
import cloudinary.api
from datetime import datetime

class CloudinaryHelper:
    @staticmethod
    def upload_image(file, folder="avocare", prefix=""):
        """
        Upload image to Cloudinary
        
        Args:
            file: File object to upload
            folder: Cloudinary folder path (default: "avocare")
            prefix: Prefix for the public_id (default: timestamp)
        
        Returns:
            dict: {'success': bool, 'url': str, 'public_id': str} or {'success': False, 'error': str}
        """
        try:
            # Generate public_id with prefix
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            public_id = f"{prefix}_{timestamp}" if prefix else f"img_{timestamp}"
            
            # Upload to Cloudinary with correct parameters
            result = cloudinary.uploader.upload(
                file,
                folder=folder,
                public_id=public_id,  
                overwrite=True,
                resource_type="image"
            )
            
            return {
                'success': True,
                'url': result.get('secure_url'),
                'public_id': result.get('public_id')
            }
        except Exception as e:
            print(f"❌ Cloudinary upload error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def delete_image(public_id):
        """
        Delete image from Cloudinary
        
        Args:
            public_id: The public_id of the image to delete
        
        Returns:
            dict: {'success': bool, 'result': dict} or {'success': False, 'error': str}
        """
        try:
            result = cloudinary.uploader.destroy(public_id)
            return {
                'success': True,
                'result': result
            }
        except Exception as e:
            print(f"❌ Cloudinary delete error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def validate_image_file(filename, allowed_extensions=None):
        """
        Validate if file has an allowed image extension
        
        Args:
            filename: Name of the file to validate
            allowed_extensions: Set of allowed extensions (default: common image formats)
        
        Returns:
            bool: True if valid, False otherwise
        """
        if allowed_extensions is None:
            allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'}
        
        if not filename or '.' not in filename:
            return False
            
        extension = filename.rsplit('.', 1)[1].lower()
        return extension in allowed_extensions