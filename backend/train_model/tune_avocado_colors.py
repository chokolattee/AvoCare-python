import cv2
import numpy as np
from PIL import Image
import matplotlib.pyplot as plt

class AvocadoColorTuner:
    """Interactive tool for tuning avocado color detection parameters"""
    
    def __init__(self):
        self.image = None
        self.hsv = None
        
    def load_image(self, image_path):
        """Load an image for color analysis"""
        self.image = cv2.imread(image_path)
        if self.image is None:
            raise ValueError(f"Could not load image: {image_path}")
        self.hsv = cv2.cvtColor(self.image, cv2.COLOR_BGR2HSV)
        print(f"✓ Loaded image: {image_path}")
        print(f"  Size: {self.image.shape[1]}x{self.image.shape[0]}")
        
    def sample_color(self, x, y, radius=5):
        """
        Sample HSV color values from a region around a point
        
        Args:
            x, y: Pixel coordinates
            radius: Sample radius (average colors in this area)
        """
        if self.hsv is None:
            raise ValueError("No image loaded. Call load_image() first.")
        
        # Get region
        y_start = max(0, y - radius)
        y_end = min(self.hsv.shape[0], y + radius)
        x_start = max(0, x - radius)
        x_end = min(self.hsv.shape[1], x + radius)
        
        region = self.hsv[y_start:y_end, x_start:x_end]
        
        # Calculate average
        avg_h = np.mean(region[:, :, 0])
        avg_s = np.mean(region[:, :, 1])
        avg_v = np.mean(region[:, :, 2])
        
        # Calculate range
        min_h, max_h = np.min(region[:, :, 0]), np.max(region[:, :, 0])
        min_s, max_s = np.min(region[:, :, 1]), np.max(region[:, :, 1])
        min_v, max_v = np.min(region[:, :, 2]), np.max(region[:, :, 2])
        
        print(f"\n🎨 Color Sample at ({x}, {y}):")
        print(f"  Average HSV: H={avg_h:.1f}, S={avg_s:.1f}, V={avg_v:.1f}")
        print(f"  H Range: {min_h:.0f} - {max_h:.0f}")
        print(f"  S Range: {min_s:.0f} - {max_s:.0f}")
        print(f"  V Range: {min_v:.0f} - {max_v:.0f}")
        
        return {
            'avg': (avg_h, avg_s, avg_v),
            'min': (min_h, min_s, min_v),
            'max': (max_h, max_s, max_v)
        }
    
    def analyze_avocado_region(self, x, y, w, h):
        """
        Analyze HSV values in a rectangular region (e.g., an avocado)
        
        Args:
            x, y: Top-left corner
            w, h: Width and height
        """
        if self.hsv is None:
            raise ValueError("No image loaded. Call load_image() first.")
        
        region = self.hsv[y:y+h, x:x+w]
        
        # Statistics
        h_values = region[:, :, 0].flatten()
        s_values = region[:, :, 1].flatten()
        v_values = region[:, :, 2].flatten()
        
        print(f"\n🥑 Avocado Region Analysis ({w}x{h} pixels):")
        print(f"  H: min={np.min(h_values):.0f}, max={np.max(h_values):.0f}, "
              f"mean={np.mean(h_values):.1f}, median={np.median(h_values):.1f}")
        print(f"  S: min={np.min(s_values):.0f}, max={np.max(s_values):.0f}, "
              f"mean={np.mean(s_values):.1f}, median={np.median(s_values):.1f}")
        print(f"  V: min={np.min(v_values):.0f}, max={np.max(v_values):.0f}, "
              f"mean={np.mean(v_values):.1f}, median={np.median(v_values):.1f}")
        
        # Suggested ranges (with margin)
        margin_h, margin_s, margin_v = 5, 10, 10
        
        print(f"\n💡 Suggested HSV Range (with margin):")
        print(f"  Lower: [{max(0, np.min(h_values)-margin_h):.0f}, "
              f"{max(0, np.min(s_values)-margin_s):.0f}, "
              f"{max(0, np.min(v_values)-margin_v):.0f}]")
        print(f"  Upper: [{min(180, np.max(h_values)+margin_h):.0f}, "
              f"{min(255, np.max(s_values)+margin_s):.0f}, "
              f"{min(255, np.max(v_values)+margin_v):.0f}]")
        
        # Plot histograms
        self._plot_histograms(h_values, s_values, v_values)
        
        return {
            'h': {'min': np.min(h_values), 'max': np.max(h_values), 
                  'mean': np.mean(h_values), 'median': np.median(h_values)},
            's': {'min': np.min(s_values), 'max': np.max(s_values),
                  'mean': np.mean(s_values), 'median': np.median(s_values)},
            'v': {'min': np.min(v_values), 'max': np.max(v_values),
                  'mean': np.mean(v_values), 'median': np.median(v_values)}
        }
    
    def _plot_histograms(self, h_values, s_values, v_values):
        """Plot HSV histograms"""
        fig, axes = plt.subplots(1, 3, figsize=(15, 4))
        
        axes[0].hist(h_values, bins=50, color='red', alpha=0.7)
        axes[0].set_title('Hue Distribution')
        axes[0].set_xlabel('Hue (0-180)')
        axes[0].set_ylabel('Frequency')
        axes[0].grid(alpha=0.3)
        
        axes[1].hist(s_values, bins=50, color='green', alpha=0.7)
        axes[1].set_title('Saturation Distribution')
        axes[1].set_xlabel('Saturation (0-255)')
        axes[1].set_ylabel('Frequency')
        axes[1].grid(alpha=0.3)
        
        axes[2].hist(v_values, bins=50, color='blue', alpha=0.7)
        axes[2].set_title('Value Distribution')
        axes[2].set_xlabel('Value (0-255)')
        axes[2].set_ylabel('Frequency')
        axes[2].grid(alpha=0.3)
        
        plt.tight_layout()
        plt.show()
    
    def test_range(self, lower_hsv, upper_hsv, show_result=True):
        """
        Test a specific HSV range on the loaded image
        
        Args:
            lower_hsv: (h, s, v) lower bounds
            upper_hsv: (h, s, v) upper bounds
            show_result: Whether to display the result
        """
        if self.hsv is None:
            raise ValueError("No image loaded. Call load_image() first.")
        
        lower = np.array(lower_hsv)
        upper = np.array(upper_hsv)
        
        mask = cv2.inRange(self.hsv, lower, upper)
        
        # Apply to original image
        result = cv2.bitwise_and(self.image, self.image, mask=mask)
        
        # Count detected pixels
        detected_pixels = np.sum(mask > 0)
        total_pixels = mask.shape[0] * mask.shape[1]
        percentage = (detected_pixels / total_pixels) * 100
        
        print(f"\n🔍 Testing HSV Range:")
        print(f"  Lower: {lower_hsv}")
        print(f"  Upper: {upper_hsv}")
        print(f"  Detected: {detected_pixels} pixels ({percentage:.2f}% of image)")
        
        if show_result:
            # Display
            fig, axes = plt.subplots(1, 3, figsize=(15, 5))
            
            axes[0].imshow(cv2.cvtColor(self.image, cv2.COLOR_BGR2RGB))
            axes[0].set_title('Original Image')
            axes[0].axis('off')
            
            axes[1].imshow(mask, cmap='gray')
            axes[1].set_title('Detection Mask')
            axes[1].axis('off')
            
            axes[2].imshow(cv2.cvtColor(result, cv2.COLOR_BGR2RGB))
            axes[2].set_title('Detected Regions')
            axes[2].axis('off')
            
            plt.tight_layout()
            plt.show()
        
        return mask
    
    def interactive_sample(self, image_path):
        """
        Interactive tool to click on image and get HSV values
        
        Args:
            image_path: Path to image
        """
        self.load_image(image_path)
        
        print("\n🖱️  Interactive Color Sampler")
        print("=" * 50)
        print("Click on the image to sample colors.")
        print("Press 'q' to quit.")
        print("=" * 50)
        
        # Mouse callback
        def mouse_callback(event, x, y, flags, param):
            if event == cv2.EVENT_LBUTTONDOWN:
                self.sample_color(x, y, radius=10)
        
        # Create window and set callback
        cv2.namedWindow('Image - Click to Sample')
        cv2.setMouseCallback('Image - Click to Sample', mouse_callback)
        
        while True:
            cv2.imshow('Image - Click to Sample', self.image)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        cv2.destroyAllWindows()
    
    def compare_ranges(self, ranges_dict):
        """
        Compare multiple HSV ranges side by side
        
        Args:
            ranges_dict: Dictionary of {name: (lower, upper)}
        """
        if self.hsv is None:
            raise ValueError("No image loaded. Call load_image() first.")
        
        n_ranges = len(ranges_dict)
        fig, axes = plt.subplots(2, n_ranges, figsize=(5*n_ranges, 10))
        
        if n_ranges == 1:
            axes = axes.reshape(2, 1)
        
        for i, (name, (lower, upper)) in enumerate(ranges_dict.items()):
            lower = np.array(lower)
            upper = np.array(upper)
            
            mask = cv2.inRange(self.hsv, lower, upper)
            result = cv2.bitwise_and(self.image, self.image, mask=mask)
            
            # Mask
            axes[0, i].imshow(mask, cmap='gray')
            axes[0, i].set_title(f'{name}\nMask')
            axes[0, i].axis('off')
            
            # Result
            axes[1, i].imshow(cv2.cvtColor(result, cv2.COLOR_BGR2RGB))
            axes[1, i].set_title(f'{name}\nDetection')
            axes[1, i].axis('off')
        
        plt.tight_layout()
        plt.show()

def main():
    """Example usage of the color tuner"""
    tuner = AvocadoColorTuner()
    
    print("🥑 Avocado Color Detection Tuner")
    print("=" * 60)
    print("\nThis tool helps you find the right HSV color ranges")
    print("for detecting avocados in your images.\n")
    
    # Example 1: Sample specific colors
    print("Example 1: Sample Color from Specific Point")
    print("-" * 60)
    image_path = input("Enter path to avocado image: ")
    
    try:
        tuner.load_image(image_path)
        
        # Interactive sampling
        print("\nStarting interactive mode...")
        tuner.interactive_sample(image_path)
        
    except Exception as e:
        print(f"Error: {e}")
        return
    
    # Example 2: Test predefined ranges
    print("\n\nExample 2: Test Current Detection Ranges")
    print("-" * 60)
    
    ranges_to_test = {
        'Bright Green (Unripe)': ([35, 40, 40], [85, 255, 200]),
        'Medium Green (Ripening)': ([30, 30, 30], [75, 200, 150]),
        'Dark Green (Ripe)': ([25, 20, 20], [65, 180, 100]),
        'Brown-Green (Overripe)': ([20, 15, 15], [40, 150, 80]),
        'Very Dark (Rotten)': ([0, 0, 20], [30, 100, 60]),
    }
    
    print("Comparing all 5 detection ranges...")
    tuner.compare_ranges(ranges_to_test)
    
    # Example 3: Analyze specific region
    print("\n\nExample 3: Analyze Specific Region")
    print("-" * 60)
    
    try:
        x = int(input("Enter region x (top-left): "))
        y = int(input("Enter region y (top-left): "))
        w = int(input("Enter region width: "))
        h = int(input("Enter region height: "))
        
        tuner.analyze_avocado_region(x, y, w, h)
        
    except ValueError:
        print("Skipping region analysis...")
    
    print("\n✓ Color tuning session complete!")

if __name__ == "__main__":
    main()