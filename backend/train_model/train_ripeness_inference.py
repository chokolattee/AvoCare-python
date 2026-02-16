import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import tensorflow as tf
from tensorflow import keras
import cv2
import matplotlib.pyplot as plt

class RipenessDetector:
    """Detector for fruit ripeness with bounding box support"""
    
    def __init__(self, model_path, classes_path, img_size=224, confidence_threshold=0.5):
        """
        Initialize the ripeness detector
        
        Args:
            model_path: Path to trained model (.h5 file)
            classes_path: Path to classes.txt file
            img_size: Image size for model input
            confidence_threshold: Minimum confidence for predictions
        """
        self.img_size = img_size
        self.confidence_threshold = confidence_threshold
        
        # Load model
        print(f"Loading model from {model_path}...")
        self.model = keras.models.load_model(model_path)
        
        # Load class names
        with open(classes_path, 'r') as f:
            self.class_names = [line.strip() for line in f.readlines()]
        
        print(f"Model loaded with {len(self.class_names)} classes: {self.class_names}")
        
    def detect_objects(self, image):
        """
        Detect avocado objects in image using color-based segmentation
        Returns list of bounding boxes (x, y, w, h)
        """
        # Convert PIL to OpenCV format
        img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Convert to HSV for better color segmentation
        hsv = cv2.cvtColor(img_cv, cv2.COLOR_BGR2HSV)
        
        # Define color ranges specifically for avocados at different ripeness stages
        # Avocados range from bright green (unripe) to dark green/brown-black (ripe/overripe)
        
        lower_ranges = [
            # Bright green (unripe avocados)
            np.array([35, 40, 40]),     # Light green with moderate saturation
            # Medium green (ripening avocados)
            np.array([30, 30, 30]),     # Slightly yellow-green
            # Dark green (ripe avocados)
            np.array([25, 20, 20]),     # Dark green transitioning to brown
            # Very dark green/brown (overripe avocados)
            np.array([20, 15, 15]),     # Brown-green, very dark
            # Black-brown (very ripe/overripe)
            np.array([0, 0, 20]),       # Very dark, almost black
        ]
        
        upper_ranges = [
            # Bright green (unripe avocados)
            np.array([85, 255, 200]),   # Full range of bright greens
            # Medium green (ripening avocados)
            np.array([75, 200, 150]),   # Medium green range
            # Dark green (ripe avocados)
            np.array([65, 180, 100]),   # Darker greens
            # Very dark green/brown (overripe avocados)
            np.array([40, 150, 80]),    # Brown-green tones
            # Black-brown (very ripe/overripe)
            np.array([30, 100, 60]),    # Very dark tones
        ]
        
        # Create combined mask for all avocado colors
        mask = np.zeros(hsv.shape[:2], dtype=np.uint8)
        for lower, upper in zip(lower_ranges, upper_ranges):
            mask = cv2.bitwise_or(mask, cv2.inRange(hsv, lower, upper))
        
        # Apply morphological operations to clean up mask
        kernel = np.ones((7, 7), np.uint8)  # Larger kernel for avocados
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        
        # Apply Gaussian blur to reduce noise
        mask = cv2.GaussianBlur(mask, (5, 5), 0)
        _, mask = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)
        
        # Find contours
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter and get bounding boxes
        bboxes = []
        min_area = (image.width * image.height) * 0.008  # Minimum 0.8% of image area (avocados can be small)
        max_area = (image.width * image.height) * 0.7   # Maximum 70% of image area
        
        for contour in contours:
            area = cv2.contourArea(contour)
            if min_area < area < max_area:
                # Check if contour is relatively compact (avocados are oval/round)
                perimeter = cv2.arcLength(contour, True)
                if perimeter > 0:
                    circularity = 4 * np.pi * area / (perimeter * perimeter)
                    
                    # Avocados have circularity between 0.4-0.9 (oval to round)
                    if circularity > 0.3:  # Accept reasonably round shapes
                        x, y, w, h = cv2.boundingRect(contour)
                        
                        # Check aspect ratio (avocados are typically 1:1 to 1:1.5 ratio)
                        aspect_ratio = float(w) / h if h > 0 else 0
                        if 0.6 < aspect_ratio < 1.7:  # Accept oval shapes
                            # Add some padding
                            padding = 15
                            x = max(0, x - padding)
                            y = max(0, y - padding)
                            w = min(image.width - x, w + 2 * padding)
                            h = min(image.height - y, h + 2 * padding)
                            bboxes.append((x, y, w, h))
        
        # If no objects detected, return whole image as one bbox
        if len(bboxes) == 0:
            bboxes = [(0, 0, image.width, image.height)]
        
        return bboxes
    
    def classify_region(self, image, bbox):
        """
        Classify a specific region of the image
        
        Args:
            image: PIL Image
            bbox: Tuple of (x, y, w, h)
            
        Returns:
            Dictionary with class predictions and confidence
        """
        x, y, w, h = bbox
        
        # Crop region
        region = image.crop((x, y, x + w, y + h))
        
        # Preprocess
        region = region.resize((self.img_size, self.img_size))
        img_array = np.array(region, dtype=np.float32)
        img_array = tf.keras.applications.mobilenet_v2.preprocess_input(img_array)
        img_array = np.expand_dims(img_array, axis=0)
        
        # Predict
        predictions = self.model.predict(img_array, verbose=0)[0]
        
        # Get results
        results = {}
        for i, class_name in enumerate(self.class_names):
            if predictions[i] >= self.confidence_threshold:
                results[class_name] = float(predictions[i])
        
        return results
    
    def detect_and_classify(self, image_path, output_path=None, visualize=True):
        """
        Detect and classify all fruits in an image
        
        Args:
            image_path: Path to input image
            output_path: Optional path to save annotated image
            visualize: Whether to display the result
            
        Returns:
            List of detections with bboxes and classifications
        """
        # Load image
        image = Image.open(image_path).convert('RGB')
        
        # Detect objects
        bboxes = self.detect_objects(image)
        print(f"Detected {len(bboxes)} potential fruit(s) in image")
        
        # Classify each detection
        detections = []
        for i, bbox in enumerate(bboxes):
            classifications = self.classify_region(image, bbox)
            
            if classifications:  # Only add if something was detected
                detections.append({
                    'bbox': bbox,
                    'classifications': classifications,
                    'id': i + 1
                })
                
                print(f"\nFruit #{i+1} at bbox {bbox}:")
                for class_name, confidence in classifications.items():
                    print(f"  {class_name}: {confidence:.2%}")
        
        # Visualize if requested
        if visualize or output_path:
            annotated_image = self.draw_detections(image, detections)
            
            if output_path:
                annotated_image.save(output_path)
                print(f"\n✓ Saved annotated image to {output_path}")
            
            if visualize:
                plt.figure(figsize=(12, 8))
                plt.imshow(annotated_image)
                plt.axis('off')
                plt.title('Ripeness Detection Results')
                plt.tight_layout()
                plt.show()
        
        return detections
    
    def draw_detections(self, image, detections):
        """Draw bounding boxes and labels on image"""
        # Create a copy for annotation
        annotated = image.copy()
        draw = ImageDraw.Draw(annotated)
        
        # Try to load a font
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
            small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
        except:
            font = ImageFont.load_default()
            small_font = ImageFont.load_default()
        
        # Color scheme for different ripeness levels
        color_map = {
            'unripe': (0, 255, 0),      # Green
            'ripe': (255, 165, 0),       # Orange
            'overripe': (255, 0, 0),     # Red
            'rotten': (139, 0, 0),       # Dark red
        }
        
        for detection in detections:
            x, y, w, h = detection['bbox']
            classifications = detection['classifications']
            fruit_id = detection['id']
            
            # Determine primary classification (highest confidence)
            if classifications:
                primary_class = max(classifications.items(), key=lambda x: x[1])
                class_name, confidence = primary_class
                
                # Get color
                color = color_map.get(class_name.lower(), (255, 255, 0))  # Default yellow
                
                # Draw bounding box
                draw.rectangle([x, y, x + w, y + h], outline=color, width=3)
                
                # Draw label background
                label = f"#{fruit_id}: {class_name} ({confidence:.1%})"
                bbox_text = draw.textbbox((x, y - 25), label, font=font)
                draw.rectangle(bbox_text, fill=color)
                
                # Draw label text
                draw.text((x, y - 25), label, fill=(255, 255, 255), font=font)
                
                # Draw additional classifications if any
                if len(classifications) > 1:
                    y_offset = y + 5
                    for cls_name, conf in sorted(classifications.items(), key=lambda x: x[1], reverse=True):
                        if cls_name != class_name:  # Skip primary
                            detail_label = f"{cls_name}: {conf:.1%}"
                            draw.text((x + 5, y_offset), detail_label, 
                                    fill=color_map.get(cls_name.lower(), (255, 255, 0)), 
                                    font=small_font)
                            y_offset += 18
        
        return annotated
    
    def batch_detect(self, image_folder, output_folder=None, extensions=['.jpg', '.jpeg', '.png']):
        """
        Process multiple images in a folder
        
        Args:
            image_folder: Folder containing images
            output_folder: Optional folder to save results
            extensions: List of valid image extensions
            
        Returns:
            Dictionary mapping image paths to their detections
        """
        if output_folder:
            os.makedirs(output_folder, exist_ok=True)
        
        results = {}
        
        # Get all image files
        image_files = []
        for ext in extensions:
            image_files.extend([f for f in os.listdir(image_folder) if f.lower().endswith(ext)])
        
        print(f"Processing {len(image_files)} images...")
        
        for img_file in image_files:
            img_path = os.path.join(image_folder, img_file)
            output_path = None
            
            if output_folder:
                output_path = os.path.join(output_folder, f"detected_{img_file}")
            
            print(f"\n{'='*60}")
            print(f"Processing: {img_file}")
            print(f"{'='*60}")
            
            try:
                detections = self.detect_and_classify(img_path, output_path, visualize=False)
                results[img_file] = detections
            except Exception as e:
                print(f"Error processing {img_file}: {e}")
                results[img_file] = []
        
        return results

if __name__ == "__main__":
    # Get paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    # Initialize detector
    detector = RipenessDetector(
        model_path=os.path.join(project_root, 'train_model', 'model_ripenessv1', 'best_model.h5'),
        classes_path=os.path.join(project_root, 'train_model', 'model_ripenessv1', 'classes.txt'),
        img_size=224,
        confidence_threshold=0.5
    )
    
    # Example: Detect single image
    # detector.detect_and_classify('path/to/image.jpg', output_path='result.jpg')
    
    # Example: Batch process folder
    test_folder = os.path.join(project_root, 'datasets', 'ripeness', 'images')
    output_folder = os.path.join(project_root, 'train_model','results_ripenessv1', 'detections')
    
    if os.path.exists(test_folder):
        results = detector.batch_detect(test_folder, output_folder)
        print(f"\n✓ Processed {len(results)} images")
        print(f"✓ Results saved to {output_folder}")
    else:
        print(f"Test folder not found: {test_folder}")
        print("Please provide image paths directly or create the test folder")