import os
import json
import numpy as np
import pandas as pd
import tensorflow as tf
from keras.applications import MobileNetV2
from keras.layers import Dense, GlobalAveragePooling2D, Dropout
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

# Paths - using relative paths from script location
SCRIPT_DIR = Path(__file__).parent
BASE_DIR = SCRIPT_DIR.parent / "datasets" / "fruit-disease"
MODEL_DIR = SCRIPT_DIR / "models_fruit-disease"
RESULTS_DIR = SCRIPT_DIR / "results_fruit-disease"

# Create directories
MODEL_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


class TFObjectDetectionDataLoader:
    """Load and process TensorFlow Object Detection CSV format dataset with class balancing"""
    
    def __init__(self, data_dir, split='train', category_mapping=None):
        self.data_dir = Path(data_dir) / split
        self.csv_file = self.data_dir / '_annotations.csv'
        
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
        img = cv2.resize(img, IMG_SIZE)
        img = img.astype(np.float32) / 255.0
        return img
    
    def get_dataset(self, balance=False, target_per_class=None):
        """
        Create dataset with images and labels
        
        For images with multiple bounding boxes (multiple diseases), we use the first one.
        In a more advanced implementation, you could crop individual bounding boxes.
        
        Args:
            balance: Whether to balance the classes
            target_per_class: Target number of samples per class (None = median)
        
        Returns:
            Tuple of (images, labels) as numpy arrays
        """
        # Collect all samples organized by class
        samples_by_class = {i: [] for i in range(self.num_classes)}
        
        for filename, group in self.images_grouped:
            try:
                # Get the class of the first annotation (primary disease)
                # In TF Object Detection format, one image can have multiple boxes
                class_name = group.iloc[0]['class']
                label = self.name_to_idx[class_name]
                
                samples_by_class[label].append((filename, label))
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
        
        for class_idx in range(self.num_classes):
            for filename, label in samples_by_class[class_idx]:
                try:
                    img = self.load_image(filename)
                    images_list.append(img)
                    labels_list.append(label)
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


def augment_data(images, labels, augment_factor=2):
    """
    Augment data using ImageDataGenerator
    
    Args:
        images: Array of images
        labels: Array of labels
        augment_factor: How many augmented versions to create per image
    
    Returns:
        Augmented images and labels
    """
    datagen = ImageDataGenerator(
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        horizontal_flip=True,
        vertical_flip=True,
        zoom_range=0.2,
        brightness_range=[0.8, 1.2],
        fill_mode='nearest'
    )
    
    augmented_images = []
    augmented_labels = []
    
    # Keep original data
    augmented_images.extend(images)
    augmented_labels.extend(labels)
    
    # Generate augmented versions
    for i in range(len(images)):
        img = images[i].reshape((1,) + images[i].shape)
        label = labels[i]
        
        aug_iter = datagen.flow(img, batch_size=1)
        
        for _ in range(augment_factor - 1):  # -1 because we already have original
            aug_img = next(aug_iter)[0]
            augmented_images.append(aug_img)
            augmented_labels.append(label)
    
    return np.array(augmented_images), np.array(augmented_labels)


def build_model(num_classes):
    """Build MobileNetV2-based model for avocado fruit disease classification"""
    
    # Load pre-trained MobileNetV2
    base_model = MobileNetV2(
        input_shape=(*IMG_SIZE, 3),
        include_top=False,
        weights='imagenet'
    )
    
    # Freeze base model layers
    base_model.trainable = False
    
    # Add custom classification head
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
    bars = plt.bar(range(len(class_names)), counts, color='steelblue', alpha=0.8)
    plt.xlabel('Disease Class', fontsize=12, fontweight='bold')
    plt.ylabel('Number of Samples', fontsize=12, fontweight='bold')
    plt.title('Class Distribution - Avocado Fruit Disease', fontsize=16, fontweight='bold', pad=20)
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


def evaluate_model(model, test_images, test_labels, category_names):
    """Evaluate model and create confusion matrix"""
    from sklearn.metrics import classification_report, confusion_matrix
    import seaborn as sns
    
    # Predictions
    predictions = model.predict(test_images)
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
        cmap='Blues',
        xticklabels=class_names,
        yticklabels=class_names,
        cbar_kws={'label': 'Count'}
    )
    plt.title('Confusion Matrix - Avocado Fruit Disease', fontsize=16, fontweight='bold', pad=20)
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
    bars = plt.bar(range(len(class_names)), class_accuracy, color='steelblue', alpha=0.8)
    plt.xlabel('Disease Class', fontsize=12, fontweight='bold')
    plt.ylabel('Accuracy', fontsize=12, fontweight='bold')
    plt.title('Per-Class Accuracy - Avocado Fruit Disease', fontsize=16, fontweight='bold', pad=20)
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


def visualize_predictions(model, test_images, test_labels, category_names, num_samples=12):
    """Visualize sample predictions"""
    predictions = model.predict(test_images[:num_samples])
    predicted_classes = np.argmax(predictions, axis=1)
    
    fig, axes = plt.subplots(3, 4, figsize=(16, 12))
    axes = axes.ravel()
    
    for i in range(num_samples):
        axes[i].imshow(test_images[i])
        
        true_label = category_names[test_labels[i]]
        pred_label = category_names[predicted_classes[i]]
        confidence = predictions[i][predicted_classes[i]]
        
        color = 'green' if test_labels[i] == predicted_classes[i] else 'red'
        
        axes[i].set_title(
            f'True: {true_label}\nPred: {pred_label}\nConf: {confidence:.2%}',
            fontsize=10,
            color=color,
            fontweight='bold'
        )
        axes[i].axis('off')
    
    plt.tight_layout()
    plt.savefig(RESULTS_DIR / 'sample_predictions.png', dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Sample predictions saved to {RESULTS_DIR / 'sample_predictions.png'}")


def save_model_info(model, history, category_names, train_labels):
    """Save model information and metrics"""
    label_counts = Counter(train_labels)
    
    info = {
        'model_architecture': 'MobileNetV2',
        'dataset': 'Avocado Fruit Disease',
        'input_size': IMG_SIZE,
        'num_classes': len(category_names),
        'categories': category_names,
        'class_distribution': {category_names[i]: int(label_counts[i]) for i in range(len(category_names))},
        'balance_strategy': BALANCE_STRATEGY,
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
        if key not in ['categories', 'class_distribution']:
            print(f"{key}: {value}")
    print("\nClass Distribution:")
    for class_name, count in info['class_distribution'].items():
        print(f"  {class_name}: {count}")
    print("="*60)


def main():
    """Main training pipeline"""
    print("="*60)
    print("AVOCADO FRUIT DISEASE DETECTION MODEL TRAINING (BALANCED)")
    print("="*60)
    
    # Load datasets
    print("\n[1/7] Loading datasets...")
    train_loader = TFObjectDetectionDataLoader(BASE_DIR, 'train')
    
    # Get category mapping from training set
    category_mapping = train_loader.get_category_mapping()
    
    # Use the same mapping for validation and test sets
    valid_loader = TFObjectDetectionDataLoader(BASE_DIR, 'valid', category_mapping)
    test_loader = TFObjectDetectionDataLoader(BASE_DIR, 'test', category_mapping)
    
    # Load and balance training data
    train_images, train_labels = train_loader.get_dataset(
        balance=True, 
        target_per_class=TARGET_SAMPLES_PER_CLASS
    )
    
    # Load validation and test data (no balancing - keep original distribution)
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
    print("\n[2/7] Plotting class distributions...")
    plot_class_distribution(train_labels, category_names, 'train_class_distribution.png')
    plot_class_distribution(test_labels, category_names, 'test_class_distribution.png')
    
    # Verify no duplicate classes
    class_list = [category_names[i] for i in range(num_classes)]
    if len(class_list) != len(set(class_list)):
        print("\nERROR: Duplicate classes detected!")
        print("This should not happen. Check your CSV annotation file.")
        return
    
    # Build model
    print("\n[3/7] Building model...")
    model = build_model(num_classes)
    
    model.compile(
        optimizer=Adam(learning_rate=LEARNING_RATE),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    print(f"Model parameters: {model.count_params():,}")
    
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
    print("\n[4/7] Training model...")
    history = model.fit(
        train_images, train_labels,
        validation_data=(valid_images, valid_labels),
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        callbacks=callbacks,
        verbose=1
    )
    
    # Save final model
    model.save(MODEL_DIR / 'final_model_balanced.keras')
    print(f"\nModel saved to {MODEL_DIR / 'final_model_balanced.keras'}")
    
    # Plot training history
    print("\n[5/7] Plotting training history...")
    plot_training_history(history)
    
    # Evaluate model
    print("\n[6/7] Evaluating model...")
    predictions, predicted_classes = evaluate_model(
        model, test_images, test_labels, category_names
    )
    
    # Visualize predictions
    print("\n[7/7] Visualizing predictions...")
    visualize_predictions(model, test_images, test_labels, category_names)
    
    # Save model info
    save_model_info(model, history, category_names, train_labels)
    
    print("\n" + "="*60)
    print("TRAINING COMPLETED SUCCESSFULLY!")
    print("="*60)
    print(f"Model saved to: {MODEL_DIR}")
    print(f"Results saved to: {RESULTS_DIR}")
    print("="*60)


if __name__ == "__main__":
    main()