import os
import json
import numpy as np
import pandas as pd
import tensorflow as tf
from keras.applications import MobileNetV2
from keras.layers import Dense, GlobalAveragePooling2D, Dropout, Concatenate, Input
from keras.models import Model
from keras.optimizers import Adam
from keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
from keras.src.legacy.preprocessing.image import ImageDataGenerator
import matplotlib.pyplot as plt
import cv2
from pathlib import Path
from collections import Counter

# Configuration
IMG_SIZE = (224, 224)
BATCH_SIZE = 16
EPOCHS = 50
LEARNING_RATE = 0.001
BALANCE_STRATEGY = 'hybrid'  # Options: 'undersample', 'oversample', 'hybrid'
TARGET_SAMPLES_PER_CLASS = None  # None = use median, or set a specific number
USE_COLOR_FEATURES = True  # Enable color-based feature extraction

# Paths - using relative paths from script location
SCRIPT_DIR = Path(__file__).parent
BASE_DIR = SCRIPT_DIR.parent / "datasets" / "ripenessv2"
MODEL_DIR = SCRIPT_DIR / "models_ripenessv2"
RESULTS_DIR = SCRIPT_DIR / "results_ripenessv2"

# Create directories
MODEL_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

# Avocado ripeness HSV color ranges (from tune_avocado_colors.py)
AVOCADO_COLOR_RANGES = {
    'bright_green': {'lower': np.array([35, 40, 40]), 'upper': np.array([85, 255, 200])},
    'medium_green': {'lower': np.array([30, 30, 30]), 'upper': np.array([75, 200, 150])},
    'dark_green': {'lower': np.array([25, 20, 20]), 'upper': np.array([65, 180, 100])},
    'brown_green': {'lower': np.array([20, 15, 15]), 'upper': np.array([40, 150, 80])},
    'very_dark': {'lower': np.array([0, 0, 20]), 'upper': np.array([30, 100, 60])},
}


class AvocadoColorExtractor:
    """Extract color-based features from avocado images using HSV ranges"""
    
    @staticmethod
    def extract_hsv_features(image_rgb, bbox=None):
        """
        Extract HSV color features from an image or bounding box region
        
        Args:
            image_rgb: RGB image (0-255 or 0-1 normalized)
            bbox: Optional (xmin, ymin, xmax, ymax) for cropping to bounding box
        
        Returns:
            Dictionary of color features (5 values for each color range)
        """
        # Convert to 0-255 range if normalized
        if image_rgb.max() <= 1.0:
            image_rgb = (image_rgb * 255).astype(np.uint8)
        
        # Convert RGB to BGR for OpenCV
        image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
        
        # Crop to bounding box if provided
        if bbox is not None:
            xmin, ymin, xmax, ymax = bbox
            image_bgr = image_bgr[ymin:ymax, xmin:xmax]
        
        # Convert to HSV
        hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)
        
        # Extract features for each color range
        features = []
        
        for color_name, color_range in AVOCADO_COLOR_RANGES.items():
            mask = cv2.inRange(hsv, color_range['lower'], color_range['upper'])
            
            # Calculate percentage of pixels in this color range
            percentage = np.sum(mask > 0) / (mask.shape[0] * mask.shape[1])
            features.append(percentage)
        
        return np.array(features)
    
    @staticmethod
    def get_dominant_color_stage(color_features):
        """
        Determine dominant color stage from features
        
        Args:
            color_features: Array of 5 color percentages
        
        Returns:
            Index of dominant color (0-4)
        """
        return np.argmax(color_features)


class TFObjectDetectionDataLoader:
    """Load and process TensorFlow Object Detection CSV format dataset with bounding box support"""
    
    def __init__(self, data_dir, split='train', category_mapping=None, use_bbox=True):
        self.data_dir = Path(data_dir) / split
        self.csv_file = self.data_dir / '_annotations.csv'
        self.use_bbox = use_bbox
        
        # Verify paths exist
        if not self.csv_file.exists():
            raise FileNotFoundError(f"CSV annotation file not found: {self.csv_file}")
        
        # Load CSV annotations
        # Expected columns: filename, width, height, class, xmin, ymin, xmax, ymax
        self.annotations_df = pd.read_csv(self.csv_file)
        
        print(f"\nLoaded {len(self.annotations_df)} annotations from {split} set")
        print(f"CSV columns: {list(self.annotations_df.columns)}")
        
        # Build category mapping
        if category_mapping is None:
            # Build category mapping from CSV data
            unique_classes = sorted(self.annotations_df['class'].unique())
            self.name_to_idx = {name: idx for idx, name in enumerate(unique_classes)}
            self.idx_to_name = {idx: name for name, idx in self.name_to_idx.items()}
            self.num_classes = len(unique_classes)
            self.categories = self.idx_to_name
            
            print(f"\nFound {self.num_classes} unique classes:")
            for idx, name in self.idx_to_name.items():
                print(f"  {idx}: {name}")
        else:
            # Use provided mapping from training set
            self.name_to_idx = category_mapping['name_to_idx']
            self.idx_to_name = category_mapping['idx_to_name']
            self.categories = category_mapping['idx_to_name']
            self.num_classes = len(self.categories)
        
        # Group annotations by filename (each image may have multiple bounding boxes)
        self.images_grouped = self.annotations_df.groupby('filename')
    
    def get_category_mapping(self):
        """Return category mapping for use in validation/test sets"""
        return {
            'idx_to_name': self.idx_to_name,
            'name_to_idx': self.name_to_idx
        }
    
    def load_image(self, filename):
        """Load and preprocess image"""
        img_path = self.data_dir / filename
        
        # Handle potential subdirectories
        if not img_path.exists():
            # Try looking in an 'images' subdirectory
            img_path = self.data_dir / 'images' / filename
        
        if not img_path.exists():
            raise ValueError(f"Could not find image: {filename}")
        
        img = cv2.imread(str(img_path))
        if img is None:
            raise ValueError(f"Could not load image: {img_path}")
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        return img
    
    def get_dataset(self, balance=False, target_per_class=None, extract_color_features=False):
        """
        Create dataset with images, labels, and optional color features
        
        Args:
            balance: Whether to balance the classes
            target_per_class: Target number of samples per class (None = median)
            extract_color_features: Whether to extract HSV color features
        
        Returns:
            Tuple of (images, labels) or (images, labels, color_features) as numpy arrays
        """
        # Collect all samples organized by class
        samples_by_class = {i: [] for i in range(self.num_classes)}
        
        for filename, group in self.images_grouped:
            try:
                # Process each bounding box in the image
                for idx, row in group.iterrows():
                    class_name = row['class']
                    label = self.name_to_idx[class_name]
                    
                    # Get bounding box coordinates
                    bbox = None
                    if self.use_bbox and all(col in row for col in ['xmin', 'ymin', 'xmax', 'ymax']):
                        bbox = (int(row['xmin']), int(row['ymin']), 
                               int(row['xmax']), int(row['ymax']))
                    
                    samples_by_class[label].append((filename, label, bbox))
                    
            except Exception as e:
                print(f"Warning: Skipping image {filename}: {e}")
        
        # Print class distribution before balancing
        print("\nOriginal class distribution:")
        for class_idx in range(self.num_classes):
            class_name = self.idx_to_name[class_idx]
            count = len(samples_by_class[class_idx])
            print(f"  {class_name}: {count} samples")
        
        # Balance if requested
        if balance:
            samples_by_class = self._balance_classes(samples_by_class, target_per_class)
        
        # Load images for all selected samples
        images_list = []
        labels_list = []
        color_features_list = []
        
        for class_idx in range(self.num_classes):
            for filename, label, bbox in samples_by_class[class_idx]:
                try:
                    # Load full image
                    img = self.load_image(filename)
                    
                    # Crop to bounding box if available
                    if bbox is not None:
                        xmin, ymin, xmax, ymax = bbox
                        img_cropped = img[ymin:ymax, xmin:xmax]
                    else:
                        img_cropped = img
                    
                    # Resize to target size
                    img_resized = cv2.resize(img_cropped, IMG_SIZE)
                    img_normalized = img_resized.astype(np.float32) / 255.0
                    
                    images_list.append(img_normalized)
                    labels_list.append(label)
                    
                    # Extract color features if requested
                    if extract_color_features:
                        color_feat = AvocadoColorExtractor.extract_hsv_features(img_resized)
                        color_features_list.append(color_feat)
                    
                except Exception as e:
                    print(f"Warning: Could not load {filename}: {e}")
        
        # Print final distribution
        if balance:
            print("\nBalanced class distribution:")
            label_counts = Counter(labels_list)
            for class_idx in range(self.num_classes):
                class_name = self.idx_to_name[class_idx]
                count = label_counts[class_idx]
                print(f"  {class_name}: {count} samples")
        
        if extract_color_features:
            return np.array(images_list), np.array(labels_list), np.array(color_features_list)
        else:
            return np.array(images_list), np.array(labels_list)
    
    def _balance_classes(self, samples_by_class, target_per_class=None):
        """
        Balance classes using undersampling and/or oversampling
        
        Args:
            samples_by_class: Dictionary mapping class indices to list of samples
            target_per_class: Target number of samples per class
        
        Returns:
            Balanced samples_by_class dictionary
        """
        class_counts = [len(samples) for samples in samples_by_class.values()]
        
        # Determine target size
        if target_per_class is None:
            if BALANCE_STRATEGY == 'undersample':
                target_per_class = min(class_counts)
            elif BALANCE_STRATEGY == 'oversample':
                target_per_class = max(class_counts)
            else:  # hybrid
                target_per_class = int(np.median(class_counts))
        
        print(f"\nBalancing strategy: {BALANCE_STRATEGY}")
        print(f"Target samples per class: {target_per_class}")
        
        balanced_samples = {}
        
        for class_idx in range(self.num_classes):
            samples = samples_by_class[class_idx]
            current_count = len(samples)
            
            if current_count > target_per_class:
                # Undersample: randomly select subset
                np.random.seed(42)  # For reproducibility
                indices = np.random.choice(current_count, target_per_class, replace=False)
                balanced_samples[class_idx] = [samples[i] for i in indices]
            
            elif current_count < target_per_class:
                # Oversample: duplicate samples to reach target
                balanced_samples[class_idx] = samples.copy()
                needed = target_per_class - current_count
                
                # Randomly sample with replacement to get needed samples
                np.random.seed(42)
                indices = np.random.choice(current_count, needed, replace=True)
                balanced_samples[class_idx].extend([samples[i] for i in indices])
            
            else:
                # Already balanced
                balanced_samples[class_idx] = samples
        
        return balanced_samples


def build_model(num_classes, use_color_features=False, color_feature_dim=5):
    """
    Build MobileNetV2-based model for avocado ripeness classification
    with optional color feature integration
    
    Args:
        num_classes: Number of ripeness classes
        use_color_features: Whether to include color features as additional input
        color_feature_dim: Dimension of color features (default 5 for 5 color ranges)
    """
    
    if use_color_features:
        # Image input
        image_input = Input(shape=(*IMG_SIZE, 3), name='image_input')
        
        # Load pre-trained MobileNetV2
        base_model = MobileNetV2(
            input_shape=(*IMG_SIZE, 3),
            include_top=False,
            weights='imagenet'
        )
        base_model.trainable = False
        
        # Image processing branch
        x_img = base_model(image_input)
        x_img = GlobalAveragePooling2D()(x_img)
        
        # Color features input
        color_input = Input(shape=(color_feature_dim,), name='color_input')
        
        # Combine image and color features
        combined = Concatenate()([x_img, color_input])
        
        # Classification head
        x = Dense(256, activation='relu')(combined)
        x = Dropout(0.5)(x)
        x = Dense(128, activation='relu')(x)
        x = Dropout(0.3)(x)
        predictions = Dense(num_classes, activation='softmax')(x)
        
        model = Model(inputs=[image_input, color_input], outputs=predictions)
        
    else:
        # Standard single-input model
        base_model = MobileNetV2(
            input_shape=(*IMG_SIZE, 3),
            include_top=False,
            weights='imagenet'
        )
        base_model.trainable = False
        
        x = base_model.output
        x = GlobalAveragePooling2D()(x)
        x = Dense(256, activation='relu')(x)
        x = Dropout(0.5)(x)
        x = Dense(128, activation='relu')(x)
        x = Dropout(0.3)(x)
        predictions = Dense(num_classes, activation='softmax')(x)
        
        model = Model(inputs=base_model.input, outputs=predictions)
    
    return model


def plot_class_distribution(labels, category_names, filename='class_distribution.png'):
    """Plot and save class distribution"""
    label_counts = Counter(labels)
    
    class_names = [category_names[i] for i in range(len(category_names))]
    counts = [label_counts[i] for i in range(len(category_names))]
    
    plt.figure(figsize=(12, 6))
    colors = plt.cm.RdYlGn_r(np.linspace(0.2, 0.8, len(class_names)))
    bars = plt.bar(range(len(class_names)), counts, color=colors, alpha=0.8)
    plt.xlabel('Ripeness Level', fontsize=12, fontweight='bold')
    plt.ylabel('Number of Samples', fontsize=12, fontweight='bold')
    plt.title('Class Distribution - Avocado Ripeness', fontsize=16, fontweight='bold', pad=20)
    plt.xticks(range(len(class_names)), class_names, rotation=45, ha='right')
    plt.grid(axis='y', alpha=0.3)
    
    # Add value labels on bars
    for bar in bars:
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height,
                f'{int(height)}', ha='center', va='bottom', fontsize=10)
    
    plt.tight_layout()
    plt.savefig(RESULTS_DIR / filename, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Class distribution saved to {RESULTS_DIR / filename}")


def plot_color_features_analysis(color_features, labels, category_names):
    """Plot color feature distribution across ripeness levels"""
    color_names = ['Bright Green', 'Medium Green', 'Dark Green', 'Brown-Green', 'Very Dark']
    
    fig, axes = plt.subplots(1, len(category_names), figsize=(5*len(category_names), 5))
    if len(category_names) == 1:
        axes = [axes]
    
    for class_idx, class_name in enumerate(category_names):
        # Get color features for this class
        class_mask = labels == class_idx
        class_features = color_features[class_mask]
        
        if len(class_features) > 0:
            # Average color features for this class
            avg_features = np.mean(class_features, axis=0)
            
            axes[class_idx].bar(range(5), avg_features, color='darkgreen', alpha=0.7)
            axes[class_idx].set_title(f'{class_name}', fontsize=12, fontweight='bold')
            axes[class_idx].set_xlabel('Color Range', fontsize=10)
            axes[class_idx].set_ylabel('Avg. Percentage', fontsize=10)
            axes[class_idx].set_xticks(range(5))
            axes[class_idx].set_xticklabels(color_names, rotation=45, ha='right', fontsize=8)
            axes[class_idx].set_ylim([0, 1])
            axes[class_idx].grid(axis='y', alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(RESULTS_DIR / 'color_features_analysis.png', dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Color features analysis saved to {RESULTS_DIR / 'color_features_analysis.png'}")


def plot_training_history(history):
    """Plot and save training history"""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    
    # Accuracy plot
    ax1.plot(history.history['accuracy'], label='Train Accuracy', linewidth=2)
    ax1.plot(history.history['val_accuracy'], label='Val Accuracy', linewidth=2)
    ax1.set_title('Model Accuracy', fontsize=14, fontweight='bold')
    ax1.set_xlabel('Epoch', fontsize=12)
    ax1.set_ylabel('Accuracy', fontsize=12)
    ax1.legend(loc='lower right')
    ax1.grid(True, alpha=0.3)
    
    # Loss plot
    ax2.plot(history.history['loss'], label='Train Loss', linewidth=2)
    ax2.plot(history.history['val_loss'], label='Val Loss', linewidth=2)
    ax2.set_title('Model Loss', fontsize=14, fontweight='bold')
    ax2.set_xlabel('Epoch', fontsize=12)
    ax2.set_ylabel('Loss', fontsize=12)
    ax2.legend(loc='upper right')
    ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(RESULTS_DIR / 'training_history.png', dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Training history saved to {RESULTS_DIR / 'training_history.png'}")


def evaluate_model(model, test_data, test_labels, category_names, use_color_features=False):
    """Evaluate model and create confusion matrix"""
    from sklearn.metrics import classification_report, confusion_matrix
    import seaborn as sns
    
    # Predictions
    if use_color_features:
        test_images, test_color_features = test_data
        predictions = model.predict([test_images, test_color_features])
    else:
        predictions = model.predict(test_data)
    
    predicted_classes = np.argmax(predictions, axis=1)
    
    # Get class names in correct order
    class_names = [category_names[i] for i in range(len(category_names))]
    
    # Classification report
    report = classification_report(
        test_labels, 
        predicted_classes, 
        target_names=class_names,
        digits=4
    )
    
    print("\n" + "="*60)
    print("CLASSIFICATION REPORT")
    print("="*60)
    print(report)
    
    # Save report
    with open(RESULTS_DIR / 'classification_report.txt', 'w') as f:
        f.write(report)
    
    # Confusion matrix
    cm = confusion_matrix(test_labels, predicted_classes)
    
    plt.figure(figsize=(12, 10))
    sns.heatmap(
        cm, 
        annot=True, 
        fmt='d', 
        cmap='RdYlGn_r',
        xticklabels=class_names,
        yticklabels=class_names,
        cbar_kws={'label': 'Count'}
    )
    plt.title('Confusion Matrix - Avocado Ripeness', fontsize=16, fontweight='bold', pad=20)
    plt.xlabel('Predicted Label', fontsize=12, fontweight='bold')
    plt.ylabel('True Label', fontsize=12, fontweight='bold')
    plt.xticks(rotation=45, ha='right')
    plt.yticks(rotation=0)
    plt.tight_layout()
    plt.savefig(RESULTS_DIR / 'confusion_matrix.png', dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Confusion matrix saved to {RESULTS_DIR / 'confusion_matrix.png'}")
    
    # Per-class accuracy
    class_accuracy = cm.diagonal() / cm.sum(axis=1)
    
    plt.figure(figsize=(12, 6))
    colors = plt.cm.RdYlGn_r(np.linspace(0.2, 0.8, len(class_names)))
    bars = plt.bar(range(len(class_names)), class_accuracy, color=colors, alpha=0.8)
    plt.xlabel('Ripeness Level', fontsize=12, fontweight='bold')
    plt.ylabel('Accuracy', fontsize=12, fontweight='bold')
    plt.title('Per-Class Accuracy - Avocado Ripeness', fontsize=16, fontweight='bold', pad=20)
    plt.xticks(range(len(class_names)), class_names, rotation=45, ha='right')
    plt.ylim([0, 1.05])
    plt.grid(axis='y', alpha=0.3)
    
    # Add value labels on bars
    for bar in bars:
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height,
                f'{height:.3f}', ha='center', va='bottom', fontsize=10)
    
    plt.tight_layout()
    plt.savefig(RESULTS_DIR / 'per_class_accuracy.png', dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Per-class accuracy saved to {RESULTS_DIR / 'per_class_accuracy.png'}")
    
    return predictions, predicted_classes


def visualize_predictions(model, test_data, test_labels, category_names, use_color_features=False, num_samples=12):
    """Visualize sample predictions"""
    if use_color_features:
        test_images, test_color_features = test_data
        predictions = model.predict([test_images[:num_samples], test_color_features[:num_samples]])
    else:
        predictions = model.predict(test_data[:num_samples])
    
    predicted_classes = np.argmax(predictions, axis=1)
    
    fig, axes = plt.subplots(3, 4, figsize=(16, 12))
    axes = axes.ravel()
    
    for i in range(num_samples):
        if use_color_features:
            axes[i].imshow(test_images[i])
        else:
            axes[i].imshow(test_data[i])
        
        true_label = category_names[test_labels[i]]
        pred_label = category_names[predicted_classes[i]]
        confidence = predictions[i][predicted_classes[i]]
        
        color = 'green' if test_labels[i] == predicted_classes[i] else 'red'
        
        title = f'True: {true_label}\nPred: {pred_label}\nConf: {confidence:.2%}'
        
        # Add color feature info if available
        if use_color_features:
            dominant_color_idx = AvocadoColorExtractor.get_dominant_color_stage(test_color_features[i])
            color_names = ['Bright', 'Medium', 'Dark', 'Brown', 'VDark']
            title += f'\nColor: {color_names[dominant_color_idx]}'
        
        axes[i].set_title(title, fontsize=9, color=color, fontweight='bold')
        axes[i].axis('off')
    
    plt.tight_layout()
    plt.savefig(RESULTS_DIR / 'sample_predictions.png', dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Sample predictions saved to {RESULTS_DIR / 'sample_predictions.png'}")


def save_model_info(model, history, category_names, train_labels, use_color_features):
    """Save model information and metrics"""
    label_counts = Counter(train_labels)
    
    info = {
        'model_architecture': 'MobileNetV2 + Color Features' if use_color_features else 'MobileNetV2',
        'dataset': 'Avocado Ripeness Classification',
        'input_size': IMG_SIZE,
        'num_classes': len(category_names),
        'categories': category_names,
        'class_distribution': {category_names[i]: int(label_counts[i]) for i in range(len(category_names))},
        'balance_strategy': BALANCE_STRATEGY,
        'use_color_features': use_color_features,
        'color_ranges': {k: {'lower': v['lower'].tolist(), 'upper': v['upper'].tolist()} 
                        for k, v in AVOCADO_COLOR_RANGES.items()} if use_color_features else None,
        'total_params': int(model.count_params()),
        'final_train_accuracy': float(history.history['accuracy'][-1]),
        'final_val_accuracy': float(history.history['val_accuracy'][-1]),
        'final_train_loss': float(history.history['loss'][-1]),
        'final_val_loss': float(history.history['val_loss'][-1]),
        'best_val_accuracy': float(max(history.history['val_accuracy'])),
        'epochs_trained': len(history.history['accuracy'])
    }
    
    with open(RESULTS_DIR / 'model_info.json', 'w') as f:
        json.dump(info, f, indent=4)
    
    print("\n" + "="*60)
    print("MODEL INFORMATION")
    print("="*60)
    for key, value in info.items():
        if key not in ['categories', 'class_distribution', 'color_ranges']:
            print(f"{key}: {value}")
    print("\nClass Distribution:")
    for class_name, count in info['class_distribution'].items():
        print(f"  {class_name}: {count}")
    if use_color_features:
        print("\n✓ Color features enabled with HSV ranges from tune_avocado_colors.py")
    print("="*60)


def main():
    """Main training pipeline"""
    print("="*60)
    print("AVOCADO RIPENESS CLASSIFICATION MODEL TRAINING")
    print("With Bounding Box Support & Color Feature Integration")
    print("="*60)
    
    # Load datasets
    print("\n[1/8] Loading datasets with bounding box support...")
    train_loader = TFObjectDetectionDataLoader(BASE_DIR, 'train', use_bbox=True)
    
    # Get category mapping from training set
    category_mapping = train_loader.get_category_mapping()
    
    # Use the same mapping for validation and test sets
    valid_loader = TFObjectDetectionDataLoader(BASE_DIR, 'valid', category_mapping, use_bbox=True)
    test_loader = TFObjectDetectionDataLoader(BASE_DIR, 'test', category_mapping, use_bbox=True)
    
    # Load and balance training data with color features
    if USE_COLOR_FEATURES:
        print("\n[2/8] Extracting color features from training data...")
        train_images, train_labels, train_color_features = train_loader.get_dataset(
            balance=True, 
            target_per_class=TARGET_SAMPLES_PER_CLASS,
            extract_color_features=True
        )
        
        print("\n[3/8] Extracting color features from validation data...")
        valid_images, valid_labels, valid_color_features = valid_loader.get_dataset(
            balance=False,
            extract_color_features=True
        )
        
        print("\n[4/8] Extracting color features from test data...")
        test_images, test_labels, test_color_features = test_loader.get_dataset(
            balance=False,
            extract_color_features=True
        )
        
        print(f"\n✓ Color features extracted (5 HSV ranges per sample)")
        print(f"  Train color features shape: {train_color_features.shape}")
        
        # Analyze color features
        plot_color_features_analysis(train_color_features, train_labels, 
                                    train_loader.idx_to_name)
    else:
        train_images, train_labels = train_loader.get_dataset(
            balance=True, 
            target_per_class=TARGET_SAMPLES_PER_CLASS
        )
        valid_images, valid_labels = valid_loader.get_dataset(balance=False)
        test_images, test_labels = test_loader.get_dataset(balance=False)
    
    category_names = train_loader.idx_to_name
    num_classes = train_loader.num_classes
    
    print(f"\nFinal dataset sizes:")
    print(f"Train samples: {len(train_images)}")
    print(f"Valid samples: {len(valid_images)}")
    print(f"Test samples: {len(test_images)}")
    print(f"Number of classes: {num_classes}")
    print(f"Classes: {[category_names[i] for i in range(num_classes)]}")
    
    # Plot class distributions
    print(f"\n[{5 if USE_COLOR_FEATURES else 2}/8] Plotting class distributions...")
    plot_class_distribution(train_labels, category_names, 'train_class_distribution.png')
    plot_class_distribution(test_labels, category_names, 'test_class_distribution.png')
    
    # Build model
    print(f"\n[{6 if USE_COLOR_FEATURES else 3}/8] Building model...")
    model = build_model(num_classes, use_color_features=USE_COLOR_FEATURES)
    
    model.compile(
        optimizer=Adam(learning_rate=LEARNING_RATE),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    print(f"Model parameters: {model.count_params():,}")
    if USE_COLOR_FEATURES:
        print("✓ Model includes color feature integration")
    
    # Callbacks
    callbacks = [
        ModelCheckpoint(
            MODEL_DIR / 'best_model.keras',
            monitor='val_accuracy',
            save_best_only=True,
            verbose=1
        ),
        EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True,
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-7,
            verbose=1
        )
    ]
    
    # Train model
    print(f"\n[{7 if USE_COLOR_FEATURES else 4}/8] Training model...")
    if USE_COLOR_FEATURES:
        history = model.fit(
            [train_images, train_color_features], train_labels,
            validation_data=([valid_images, valid_color_features], valid_labels),
            epochs=EPOCHS,
            batch_size=BATCH_SIZE,
            callbacks=callbacks,
            verbose=1
        )
    else:
        history = model.fit(
            train_images, train_labels,
            validation_data=(valid_images, valid_labels),
            epochs=EPOCHS,
            batch_size=BATCH_SIZE,
            callbacks=callbacks,
            verbose=1
        )
    
    # Save final model
    model_filename = 'final_model_avocado_ripeness_with_color.keras' if USE_COLOR_FEATURES else 'final_model_avocado_ripeness.keras'
    model.save(MODEL_DIR / model_filename)
    print(f"\nModel saved to {MODEL_DIR / model_filename}")
    
    # Save color ranges configuration
    if USE_COLOR_FEATURES:
        with open(MODEL_DIR / 'color_ranges_config.json', 'w') as f:
            color_config = {k: {'lower': v['lower'].tolist(), 'upper': v['upper'].tolist()} 
                           for k, v in AVOCADO_COLOR_RANGES.items()}
            json.dump(color_config, f, indent=4)
        print(f"✓ Color ranges config saved to {MODEL_DIR / 'color_ranges_config.json'}")
    
    # Plot training history
    print(f"\n[{8 if USE_COLOR_FEATURES else 5}/8] Plotting training history...")
    plot_training_history(history)
    
    # Evaluate model
    print(f"\n[{8 if USE_COLOR_FEATURES else 6}/8] Evaluating model...")
    if USE_COLOR_FEATURES:
        test_data = (test_images, test_color_features)
    else:
        test_data = test_images
    
    predictions, predicted_classes = evaluate_model(
        model, test_data, test_labels, category_names, USE_COLOR_FEATURES
    )
    
    # Visualize predictions
    print(f"\n[{8 if USE_COLOR_FEATURES else 7}/8] Visualizing predictions...")
    visualize_predictions(model, test_data, test_labels, category_names, USE_COLOR_FEATURES)
    
    # Save model info
    save_model_info(model, history, category_names, train_labels, USE_COLOR_FEATURES)
    
    print("\n" + "="*60)
    print("TRAINING COMPLETED SUCCESSFULLY!")
    print("="*60)
    print(f"Model saved to: {MODEL_DIR}")
    print(f"Results saved to: {RESULTS_DIR}")
    if USE_COLOR_FEATURES:
        print("\n✓ Model trained with:")
        print("  - Bounding box support for multiple avocado detection")
        print("  - HSV color feature extraction (5 ranges)")
        print("  - Color ranges from tune_avocado_colors.py")
    print("="*60)


if __name__ == "__main__":
    main()