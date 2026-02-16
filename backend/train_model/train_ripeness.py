import os
import pandas as pd
import numpy as np
from PIL import Image
import tensorflow as tf
from tensorflow import keras
from keras import layers, Model
from keras.applications import MobileNetV2
from keras.src.legacy.preprocessing.image import ImageDataGenerator
from keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt

class ImageDataGenerator2D(keras.utils.Sequence):
    """Custom data generator for loading images with their labels"""
    def __init__(self, df, dataset_folder, batch_size, img_size, augment=False):
        self.df = df.reset_index(drop=True)
        self.dataset_folder = dataset_folder
        self.batch_size = batch_size
        self.img_size = img_size
        self.augment = augment
        
        # Get class columns (all columns except filename)
        self.class_columns = [col for col in df.columns if col != 'filename']
        self.num_classes = len(self.class_columns)
        
        # Data augmentation
        if self.augment:
            self.datagen = ImageDataGenerator(
                rotation_range=10,
                width_shift_range=0.1,
                height_shift_range=0.1,
                horizontal_flip=True,
                brightness_range=[0.8, 1.2],
                fill_mode='nearest'
            )
        
    def __len__(self):
        return int(np.ceil(len(self.df) / self.batch_size))
    
    def __getitem__(self, idx):
        batch_df = self.df.iloc[idx * self.batch_size:(idx + 1) * self.batch_size]
        
        batch_images = []
        batch_labels = []
        
        for _, row in batch_df.iterrows():
            img_path = os.path.join(self.dataset_folder, row['filename'])
            
            # Load and preprocess image
            img = Image.open(img_path).convert('RGB')
            img = img.resize((self.img_size, self.img_size))
            img_array = np.array(img, dtype=np.float32)
            
            # Apply augmentation if training
            if self.augment:
                img_array = self.datagen.random_transform(img_array)
            
            # Normalize to [-1, 1] for MobileNetV2
            img_array = tf.keras.applications.mobilenet_v2.preprocess_input(img_array)
            
            batch_images.append(img_array)
            batch_labels.append(row[self.class_columns].values.astype(np.float32))
        
        return np.array(batch_images), np.array(batch_labels)

def create_model(num_classes, img_size):
    """Create MobileNetV2-based classifier with detection head"""
    # Load pre-trained MobileNetV2
    base_model = MobileNetV2(
        input_shape=(img_size, img_size, 3),
        include_top=False,
        weights='imagenet'
    )
    
    # Freeze base model initially
    base_model.trainable = False
    
    # Add custom classification head
    inputs = keras.Input(shape=(img_size, img_size, 3))
    x = base_model(inputs, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.2)(x)
    outputs = layers.Dense(num_classes, activation='sigmoid')(x)
    
    model = Model(inputs, outputs)
    
    return model

class Trainer:
    """Main trainer class for image classification"""
    def __init__(self, csv_path, dataset_folder, config=None):
        self.csv_path = csv_path
        self.dataset_folder = dataset_folder
        
        # Default configuration
        default_config = {
            'batch_size': 32,
            'num_epochs': 50,
            'learning_rate': 0.001,
            'img_size': 224,
            'test_split': 0.2,
            'save_path': 'model_ripenessv1',
            'early_stopping_patience': 10
        }
        
        self.config = {**default_config, **(config or {})}
        
        # Create save directory with absolute path
        if not os.path.isabs(self.config['save_path']):
            script_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(script_dir)
            self.config['save_path'] = os.path.join(project_root, self.config['save_path'])
        os.makedirs(self.config['save_path'], exist_ok=True)
        
        # Check GPU availability
        gpus = tf.config.list_physical_devices('GPU')
        if gpus:
            print(f"GPU available: {len(gpus)} device(s)")
            for gpu in gpus:
                tf.config.experimental.set_memory_growth(gpu, True)
        else:
            print("No GPU found, using CPU")
        
        # Load data
        self.df = pd.read_csv(csv_path)
        self.class_columns = [col for col in self.df.columns if col != 'filename']
        self.num_classes = len(self.class_columns)
        
        print(f"\nFound {len(self.df)} images with {self.num_classes} classes")
        print(f"Classes: {self.class_columns}")
        
    def prepare_data(self):
        """Prepare train and validation datasets"""
        # Split data
        train_df, val_df = train_test_split(
            self.df, 
            test_size=self.config['test_split'], 
            random_state=42
        )
        
        print(f"Train samples: {len(train_df)}, Val samples: {len(val_df)}")
        
        # Create data generators
        self.train_generator = ImageDataGenerator2D(
            train_df,
            self.dataset_folder,
            self.config['batch_size'],
            self.config['img_size'],
            augment=True
        )
        
        self.val_generator = ImageDataGenerator2D(
            val_df,
            self.dataset_folder,
            self.config['batch_size'],
            self.config['img_size'],
            augment=False
        )
        
    def train(self):
        """Main training loop"""
        # Create model
        print("\nBuilding MobileNetV2 model...")
        self.model = create_model(self.num_classes, self.config['img_size'])
        
        # Compile model
        self.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=self.config['learning_rate']),
            loss='binary_crossentropy',
            metrics=['accuracy', keras.metrics.AUC(name='auc')]
        )
        
        # Print model summary
        self.model.summary()
        
        # Callbacks
        callbacks = [
            ModelCheckpoint(
                os.path.join(self.config['save_path'], 'best_model.h5'),
                monitor='val_loss',
                save_best_only=True,
                verbose=1
            ),
            EarlyStopping(
                monitor='val_loss',
                patience=self.config['early_stopping_patience'],
                verbose=1,
                restore_best_weights=True
            ),
            ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=5,
                min_lr=1e-7,
                verbose=1
            )
        ]
        
        print("\n" + "="*60)
        print("Starting training...")
        print("="*60 + "\n")
        
        # Train model
        history = self.model.fit(
            self.train_generator,
            validation_data=self.val_generator,
            epochs=self.config['num_epochs'],
            callbacks=callbacks,
            verbose=1
        )
        
        # Fine-tuning phase (optional)
        print("\n" + "="*60)
        print("Fine-tuning the model...")
        print("="*60 + "\n")
        
        # Unfreeze some layers for fine-tuning
        self.model.layers[1].trainable = True
        
        # Recompile with lower learning rate
        self.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=self.config['learning_rate'] / 10),
            loss='binary_crossentropy',
            metrics=['accuracy', keras.metrics.AUC(name='auc')]
        )
        
        # Continue training
        history_finetune = self.model.fit(
            self.train_generator,
            validation_data=self.val_generator,
            epochs=20,
            callbacks=callbacks,
            verbose=1
        )
        
        # Combine histories
        for key in history.history.keys():
            history.history[key].extend(history_finetune.history[key])
        
        # Save final model
        self.model.save(os.path.join(self.config['save_path'], 'final_model.h5'))
        print(f"\n✓ Final model saved to {self.config['save_path']}/final_model.h5")
        
        # Save class names
        with open(os.path.join(self.config['save_path'], 'classes.txt'), 'w') as f:
            for class_name in self.class_columns:
                f.write(f"{class_name}\n")
        
        # Plot training history
        self.plot_history(history.history)
        
        # Evaluate on validation set
        self.evaluate()
        
        return history.history
    
    def evaluate(self):
        """Evaluate model on validation set"""
        print("\n" + "="*60)
        print("Evaluating model...")
        print("="*60 + "\n")
        
        # Create results directory
        results_dir = os.path.join(os.path.dirname(self.config['save_path']), 'results_ripenessv1')
        os.makedirs(results_dir, exist_ok=True)
        
        # Get predictions
        y_true = []
        y_pred = []
        
        for i in range(len(self.val_generator)):
            x_batch, y_batch = self.val_generator[i]
            pred_batch = self.model.predict(x_batch, verbose=0)
            
            y_true.extend(y_batch)
            y_pred.extend(pred_batch)
        
        y_true = np.array(y_true)
        y_pred = np.array(y_pred)
        y_pred_binary = (y_pred > 0.5).astype(int)
        
        # Save evaluation results
        eval_summary_path = os.path.join(results_dir, 'evaluation_results.txt')
        
        with open(eval_summary_path, 'w') as f:
            f.write("="*70 + "\n")
            f.write("MODEL EVALUATION RESULTS\n")
            f.write("="*70 + "\n\n")
            
            # Print and save classification report for each class
            for i, class_name in enumerate(self.class_columns):
                report_str = f"\n{class_name}:\n"
                report_str += classification_report(y_true[:, i], y_pred_binary[:, i], 
                                           target_names=['Negative', 'Positive'])
                print(report_str)
                f.write(report_str + "\n")
                
                # Create confusion matrix for this class
                cm = confusion_matrix(y_true[:, i], y_pred_binary[:, i])
                self._plot_confusion_matrix(cm, class_name, results_dir)
        
        print(f"\n✓ Saved evaluation results to {eval_summary_path}")
        
        # Create overall performance visualization
        self._plot_class_performance(y_true, y_pred, y_pred_binary, results_dir)
        
        # Save prediction probabilities for analysis
        self._save_prediction_analysis(y_true, y_pred, results_dir)
    
    def _plot_confusion_matrix(self, cm, class_name, results_dir):
        """Plot confusion matrix for a specific class"""
        plt.figure(figsize=(8, 6))
        
        # Normalize confusion matrix
        cm_normalized = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]
        
        # Plot
        plt.imshow(cm_normalized, interpolation='nearest', cmap=plt.cm.Blues)
        plt.title(f'Confusion Matrix - {class_name}', fontsize=14, fontweight='bold')
        plt.colorbar()
        
        classes = ['Negative', 'Positive']
        tick_marks = np.arange(len(classes))
        plt.xticks(tick_marks, classes, fontsize=12)
        plt.yticks(tick_marks, classes, fontsize=12)
        
        # Add text annotations
        thresh = cm_normalized.max() / 2.
        for i in range(cm.shape[0]):
            for j in range(cm.shape[1]):
                plt.text(j, i, f'{cm[i, j]}\n({cm_normalized[i, j]:.2%})',
                        ha="center", va="center", fontsize=11,
                        color="white" if cm_normalized[i, j] > thresh else "black")
        
        plt.ylabel('True Label', fontsize=12)
        plt.xlabel('Predicted Label', fontsize=12)
        plt.tight_layout()
        
        # Save
        cm_path = os.path.join(results_dir, f'confusion_matrix_{class_name.lower()}.png')
        plt.savefig(cm_path, dpi=150, bbox_inches='tight')
        plt.close()
    
    def _plot_class_performance(self, y_true, y_pred, y_pred_binary, results_dir):
        """Create comprehensive performance visualization across all classes"""
        from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score
        
        metrics = {
            'Precision': [],
            'Recall': [],
            'F1-Score': [],
            'AUC': []
        }
        
        for i in range(self.num_classes):
            metrics['Precision'].append(precision_score(y_true[:, i], y_pred_binary[:, i], zero_division=0))
            metrics['Recall'].append(recall_score(y_true[:, i], y_pred_binary[:, i], zero_division=0))
            metrics['F1-Score'].append(f1_score(y_true[:, i], y_pred_binary[:, i], zero_division=0))
            try:
                metrics['AUC'].append(roc_auc_score(y_true[:, i], y_pred[:, i]))
            except:
                metrics['AUC'].append(0.0)
        
        # Create bar plot
        fig, ax = plt.subplots(figsize=(12, 6))
        
        x = np.arange(len(self.class_columns))
        width = 0.2
        
        colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12']
        
        for i, (metric_name, values) in enumerate(metrics.items()):
            offset = width * (i - 1.5)
            ax.bar(x + offset, values, width, label=metric_name, color=colors[i], alpha=0.8)
        
        ax.set_xlabel('Ripeness Classes', fontsize=12, fontweight='bold')
        ax.set_ylabel('Score', fontsize=12, fontweight='bold')
        ax.set_title('Per-Class Performance Metrics', fontsize=14, fontweight='bold')
        ax.set_xticks(x)
        ax.set_xticklabels(self.class_columns, fontsize=11)
        ax.legend(fontsize=11)
        ax.set_ylim([0, 1.1])
        ax.grid(axis='y', alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(os.path.join(results_dir, 'class_performance_comparison.png'), dpi=150)
        plt.close()
        
        print(f"✓ Saved performance comparison to {results_dir}/class_performance_comparison.png")
    
    def _save_prediction_analysis(self, y_true, y_pred, results_dir):
        """Save detailed prediction analysis"""
        analysis_path = os.path.join(results_dir, 'prediction_analysis.txt')
        
        with open(analysis_path, 'w') as f:
            f.write("="*70 + "\n")
            f.write("PREDICTION ANALYSIS\n")
            f.write("="*70 + "\n\n")
            
            for i, class_name in enumerate(self.class_columns):
                f.write(f"\n{class_name} Analysis:\n")
                f.write("-"*70 + "\n")
                
                # True positives, false positives, etc.
                true_positives = np.sum((y_true[:, i] == 1) & (y_pred[:, i] > 0.5))
                false_positives = np.sum((y_true[:, i] == 0) & (y_pred[:, i] > 0.5))
                true_negatives = np.sum((y_true[:, i] == 0) & (y_pred[:, i] <= 0.5))
                false_negatives = np.sum((y_true[:, i] == 1) & (y_pred[:, i] <= 0.5))
                
                total_positive = np.sum(y_true[:, i] == 1)
                total_negative = np.sum(y_true[:, i] == 0)
                
                f.write(f"True Positives: {true_positives} / {total_positive}\n")
                f.write(f"False Positives: {false_positives} / {total_negative}\n")
                f.write(f"True Negatives: {true_negatives} / {total_negative}\n")
                f.write(f"False Negatives: {false_negatives} / {total_positive}\n")
                
                # Confidence statistics
                positive_confidences = y_pred[:, i][y_true[:, i] == 1]
                negative_confidences = y_pred[:, i][y_true[:, i] == 0]
                
                if len(positive_confidences) > 0:
                    f.write(f"\nPositive Samples - Avg Confidence: {np.mean(positive_confidences):.3f} "
                           f"(min: {np.min(positive_confidences):.3f}, max: {np.max(positive_confidences):.3f})\n")
                
                if len(negative_confidences) > 0:
                    f.write(f"Negative Samples - Avg Confidence: {np.mean(negative_confidences):.3f} "
                           f"(min: {np.min(negative_confidences):.3f}, max: {np.max(negative_confidences):.3f})\n")
        
        print(f"✓ Saved prediction analysis to {analysis_path}")
    
    def plot_history(self, history):
        """Plot training history"""
        # Create results directory
        results_dir = os.path.join(os.path.dirname(self.config['save_path']), 'results_ripenessv1')
        os.makedirs(results_dir, exist_ok=True)
        
        fig, axes = plt.subplots(1, 3, figsize=(15, 4))
        
        # Loss plot
        axes[0].plot(history['loss'], label='Train Loss')
        axes[0].plot(history['val_loss'], label='Val Loss')
        axes[0].set_xlabel('Epoch')
        axes[0].set_ylabel('Loss')
        axes[0].set_title('Training and Validation Loss')
        axes[0].legend()
        axes[0].grid(True)
        
        # Accuracy plot
        axes[1].plot(history['accuracy'], label='Train Acc')
        axes[1].plot(history['val_accuracy'], label='Val Acc')
        axes[1].set_xlabel('Epoch')
        axes[1].set_ylabel('Accuracy')
        axes[1].set_title('Training and Validation Accuracy')
        axes[1].legend()
        axes[1].grid(True)
        
        # AUC plot
        axes[2].plot(history['auc'], label='Train AUC')
        axes[2].plot(history['val_auc'], label='Val AUC')
        axes[2].set_xlabel('Epoch')
        axes[2].set_ylabel('AUC')
        axes[2].set_title('Training and Validation AUC')
        axes[2].legend()
        axes[2].grid(True)
        
        plt.tight_layout()
        
        # Save to both locations
        plt.savefig(os.path.join(self.config['save_path'], 'training_history.png'), dpi=150)
        plt.savefig(os.path.join(results_dir, 'training_history.png'), dpi=150)
        print(f"✓ Saved training history plot to {results_dir}/training_history.png")
        
        # Save individual metric plots for detailed analysis
        self._save_individual_plots(history, results_dir)
        
        # Save training summary
        self._save_training_summary(history, results_dir)
        
        plt.close()
    
    def _save_individual_plots(self, history, results_dir):
        """Save individual plots for each metric"""
        metrics = {
            'loss': ('Loss', 'Loss'),
            'accuracy': ('Accuracy', 'Accuracy'),
            'auc': ('AUC', 'AUC Score')
        }
        
        for metric, (title, ylabel) in metrics.items():
            plt.figure(figsize=(10, 6))
            plt.plot(history[metric], label=f'Train {title}', linewidth=2, marker='o', markersize=4)
            plt.plot(history[f'val_{metric}'], label=f'Val {title}', linewidth=2, marker='s', markersize=4)
            plt.xlabel('Epoch', fontsize=12)
            plt.ylabel(ylabel, fontsize=12)
            plt.title(f'Training and Validation {title}', fontsize=14, fontweight='bold')
            plt.legend(fontsize=11)
            plt.grid(True, alpha=0.3)
            
            # Add best value annotation
            best_val_idx = np.argmin(history[f'val_{metric}']) if metric == 'loss' else np.argmax(history[f'val_{metric}'])
            best_val = history[f'val_{metric}'][best_val_idx]
            plt.axvline(x=best_val_idx, color='r', linestyle='--', alpha=0.5, label=f'Best Val (Epoch {best_val_idx+1})')
            plt.legend(fontsize=11)
            
            plt.tight_layout()
            plt.savefig(os.path.join(results_dir, f'{metric}_plot.png'), dpi=150)
            plt.close()
        
        print(f"✓ Saved individual metric plots to {results_dir}/")
    
    def _save_training_summary(self, history, results_dir):
        """Save comprehensive training summary"""
        summary_path = os.path.join(results_dir, 'training_summary.txt')
        
        with open(summary_path, 'w') as f:
            f.write("="*70 + "\n")
            f.write("RIPENESS CLASSIFICATION MODEL - TRAINING SUMMARY\n")
            f.write("="*70 + "\n\n")
            
            # Model configuration
            f.write("MODEL CONFIGURATION\n")
            f.write("-"*70 + "\n")
            f.write(f"Model Architecture: MobileNetV2 (Transfer Learning)\n")
            f.write(f"Image Size: {self.config['img_size']}x{self.config['img_size']}\n")
            f.write(f"Batch Size: {self.config['batch_size']}\n")
            f.write(f"Initial Learning Rate: {self.config['learning_rate']}\n")
            f.write(f"Total Epochs: {len(history['loss'])}\n")
            f.write(f"Early Stopping Patience: {self.config['early_stopping_patience']}\n\n")
            
            # Dataset information
            f.write("DATASET INFORMATION\n")
            f.write("-"*70 + "\n")
            f.write(f"Total Images: {len(self.df)}\n")
            f.write(f"Training Images: {int(len(self.df) * (1 - self.config['test_split']))}\n")
            f.write(f"Validation Images: {int(len(self.df) * self.config['test_split'])}\n")
            f.write(f"Number of Classes: {self.num_classes}\n")
            f.write(f"Class Names: {', '.join(self.class_names)}\n\n")
            
            # Class distribution
            f.write("CLASS DISTRIBUTION\n")
            f.write("-"*70 + "\n")
            for class_name in self.class_columns:
                count = self.df[class_name].sum()
                percentage = (count / len(self.df)) * 100
                f.write(f"{class_name}: {int(count)} images ({percentage:.1f}%)\n")
            f.write("\n")
            
            # Training results
            f.write("TRAINING RESULTS\n")
            f.write("-"*70 + "\n")
            
            # Final metrics
            f.write("Final Epoch Metrics:\n")
            f.write(f"  Train Loss: {history['loss'][-1]:.4f}\n")
            f.write(f"  Train Accuracy: {history['accuracy'][-1]:.4f} ({history['accuracy'][-1]*100:.2f}%)\n")
            f.write(f"  Train AUC: {history['auc'][-1]:.4f}\n")
            f.write(f"  Val Loss: {history['val_loss'][-1]:.4f}\n")
            f.write(f"  Val Accuracy: {history['val_accuracy'][-1]:.4f} ({history['val_accuracy'][-1]*100:.2f}%)\n")
            f.write(f"  Val AUC: {history['val_auc'][-1]:.4f}\n\n")
            
            # Best metrics
            best_val_loss_idx = np.argmin(history['val_loss'])
            best_val_acc_idx = np.argmax(history['val_accuracy'])
            best_val_auc_idx = np.argmax(history['val_auc'])
            
            f.write("Best Validation Metrics:\n")
            f.write(f"  Best Val Loss: {history['val_loss'][best_val_loss_idx]:.4f} (Epoch {best_val_loss_idx + 1})\n")
            f.write(f"  Best Val Accuracy: {history['val_accuracy'][best_val_acc_idx]:.4f} ({history['val_accuracy'][best_val_acc_idx]*100:.2f}%) (Epoch {best_val_acc_idx + 1})\n")
            f.write(f"  Best Val AUC: {history['val_auc'][best_val_auc_idx]:.4f} (Epoch {best_val_auc_idx + 1})\n\n")
            
            # Overfitting analysis
            f.write("OVERFITTING ANALYSIS\n")
            f.write("-"*70 + "\n")
            train_val_loss_diff = history['loss'][-1] - history['val_loss'][-1]
            train_val_acc_diff = history['accuracy'][-1] - history['val_accuracy'][-1]
            
            f.write(f"Train-Val Loss Difference: {train_val_loss_diff:.4f}\n")
            f.write(f"Train-Val Accuracy Difference: {train_val_acc_diff:.4f} ({train_val_acc_diff*100:.2f}%)\n")
            
            if train_val_acc_diff > 0.1:
                f.write("⚠ Warning: Significant overfitting detected (>10% accuracy gap)\n")
            elif train_val_acc_diff > 0.05:
                f.write("⚠ Caution: Moderate overfitting detected (5-10% accuracy gap)\n")
            else:
                f.write("✓ Good generalization (accuracy gap < 5%)\n")
            f.write("\n")
            
            # Learning curve analysis
            f.write("LEARNING CURVE ANALYSIS\n")
            f.write("-"*70 + "\n")
            
            # Improvement over epochs
            initial_val_acc = history['val_accuracy'][0]
            final_val_acc = history['val_accuracy'][-1]
            improvement = final_val_acc - initial_val_acc
            
            f.write(f"Initial Validation Accuracy: {initial_val_acc:.4f} ({initial_val_acc*100:.2f}%)\n")
            f.write(f"Final Validation Accuracy: {final_val_acc:.4f} ({final_val_acc*100:.2f}%)\n")
            f.write(f"Total Improvement: {improvement:.4f} ({improvement*100:.2f}%)\n\n")
            
            # Model files
            f.write("SAVED MODEL FILES\n")
            f.write("-"*70 + "\n")
            f.write(f"Best Model: {os.path.join(self.config['save_path'], 'best_model.h5')}\n")
            f.write(f"Final Model: {os.path.join(self.config['save_path'], 'final_model.h5')}\n")
            f.write(f"Class Names: {os.path.join(self.config['save_path'], 'classes.txt')}\n")
            f.write(f"Training History: {os.path.join(results_dir, 'training_history.png')}\n\n")
            
            f.write("="*70 + "\n")
            f.write("End of Training Summary\n")
            f.write("="*70 + "\n")
        
        print(f"✓ Saved training summary to {summary_path}")
        
        # Also save metrics as CSV for further analysis
        metrics_df = pd.DataFrame(history)
        metrics_df.index.name = 'epoch'
        metrics_csv_path = os.path.join(results_dir, 'training_metrics.csv')
        metrics_df.to_csv(metrics_csv_path)
        print(f"✓ Saved training metrics CSV to {metrics_csv_path}")

if __name__ == "__main__":
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Go up one level to the project root
    project_root = os.path.dirname(script_dir)
    
    # Configuration
    config = {
        'batch_size': 32,
        'num_epochs': 50,
        'learning_rate': 0.001,
        'img_size': 224,
        'test_split': 0.2,
        'early_stopping_patience': 10
    }
    
    # Initialize trainer with absolute paths pointing to datasets/ripeness/
    trainer = Trainer(
        csv_path=os.path.join(project_root, 'datasets', 'ripeness', 'classes.csv'),
        dataset_folder=os.path.join(project_root, 'datasets', 'ripeness', 'images'),
        config=config
    )
    
    # Prepare data
    trainer.prepare_data()
    
    # Train model
    history = trainer.train()
    
    print("\n" + "="*70)
    print("✓ TRAINING COMPLETED SUCCESSFULLY!")
    print("="*70)
    print(f"\nModel files saved in: {trainer.config['save_path']}/")
    print("  - best_model.h5 (best validation loss)")
    print("  - final_model.h5 (final model after fine-tuning)")
    print("  - classes.txt (class names)")
    print(f"\nResults and analysis saved in: results_ripenessv1/")
    print("  - training_history.png (combined metrics)")
    print("  - loss_plot.png, accuracy_plot.png, auc_plot.png (individual metrics)")
    print("  - training_summary.txt (comprehensive training report)")
    print("  - training_metrics.csv (epoch-by-epoch data)")
    print("  - evaluation_results.txt (validation performance)")
    print("  - confusion_matrix_*.png (per-class confusion matrices)")
    print("  - class_performance_comparison.png (metric comparison)")
    print("  - prediction_analysis.txt (detailed prediction stats)")
    print("\n" + "="*70)