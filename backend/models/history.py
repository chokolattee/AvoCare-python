# models/history.py
from mongoengine import Document, StringField, FloatField, IntField, DictField, ListField, DateTimeField, ReferenceField
from datetime import datetime


class History(Document):
    """
    History model for storing analysis results
    Supports: ripeness detection, leaf disease detection, fruit disease detection
    """
    
    # Meta
    meta = {
        'collection': 'history',
        'indexes': [
            'user',
            'analysis_type',
            '-created_at',
            ('user', '-created_at'),
            ('user', 'analysis_type', '-created_at')
        ]
    }
    
    # User reference
    user = ReferenceField('User', required=True)
    
    # Analysis type
    analysis_type = StringField(
        required=True,
        choices=['ripeness', 'leaf', 'fruit_disease']
    )
    
    # ==========================================
    # RIPENESS FIELDS
    # ==========================================
    ripeness = StringField()  # 'underripe', 'ripe', 'overripe'
    ripeness_level = IntField()  # 0-5
    ripeness_confidence = FloatField()
    ripeness_color = StringField()
    ripeness_texture = StringField()
    ripeness_days_to_ripe = StringField()
    ripeness_recommendation = StringField()
    ripeness_bbox = ListField(FloatField())  # [x, y, width, height]
    ripeness_color_metrics = DictField()
    
    # ==========================================
    # LEAF FIELDS
    # ==========================================
    leaf_class = StringField()  # 'Healthy', 'Anthracnose', etc.
    leaf_confidence = FloatField()
    leaf_bbox = ListField(FloatField())
    leaf_detections = ListField(DictField())
    leaf_recommendation = StringField()
    
    # ==========================================
    # FRUIT DISEASE FIELDS
    # ==========================================
    disease_class = StringField()  # 'healthy', 'anthracnose', etc.
    disease_confidence = FloatField()
    disease_bbox = ListField(FloatField())
    disease_detections = ListField(DictField())
    disease_recommendation = StringField()
    
    # ==========================================
    # COMMON FIELDS
    # ==========================================
    all_probabilities = DictField()  # All class probabilities
    image_size = DictField()  # {'width': 800, 'height': 600}
    count = IntField(default=1)  # Number of detections
    notes = StringField(default='')  # User notes
    
    # ==========================================
    # IMAGE FIELDS (NEW)
    # ==========================================
    original_image_url = StringField()  # Cloudinary URL for original image
    annotated_image_url = StringField()  # Cloudinary URL for annotated image
    original_public_id = StringField()  # Cloudinary public ID for original
    annotated_public_id = StringField()  # Cloudinary public ID for annotated
    
    # Timestamps
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    
    # ==========================================
    # FACTORY METHODS
    # ==========================================
    
    @classmethod
    def create_ripeness_analysis(cls, user, data):
        """Create ripeness analysis record"""
        prediction = data.get('prediction', {})
        
        return cls(
            user=user,
            analysis_type='ripeness',
            
            # Ripeness data
            ripeness=prediction.get('ripeness'),
            ripeness_level=prediction.get('ripeness_level'),
            ripeness_confidence=prediction.get('confidence'),
            ripeness_color=prediction.get('color'),
            ripeness_texture=prediction.get('texture'),
            ripeness_days_to_ripe=prediction.get('days_to_ripe'),
            ripeness_recommendation=prediction.get('recommendation'),
            ripeness_bbox=prediction.get('bbox', []),
            ripeness_color_metrics=prediction.get('color_metrics', {}),
            
            # Common data
            all_probabilities=data.get('all_probabilities', {}),
            image_size=data.get('image_size', {}),
            count=data.get('count', 1),
            notes=data.get('notes', ''),
            
            # Image data
            original_image_url=data.get('original_image_url'),
            annotated_image_url=data.get('annotated_image_url'),
            original_public_id=data.get('original_public_id'),
            annotated_public_id=data.get('annotated_public_id')
        )
    
    @classmethod
    def create_leaf_analysis(cls, user, data):
        """Create leaf analysis record"""
        prediction = data.get('prediction', {})
        
        return cls(
            user=user,
            analysis_type='leaf',
            
            # Leaf data
            leaf_class=prediction.get('class'),
            leaf_confidence=prediction.get('confidence'),
            leaf_bbox=prediction.get('bbox', []),
            leaf_detections=data.get('detections', []),
            leaf_recommendation=data.get('recommendation', ''),
            
            # Common data
            all_probabilities=prediction.get('all_probabilities', {}),
            image_size=data.get('image_size', {}),
            count=data.get('count', 1),
            notes=data.get('notes', ''),
            
            # Image data
            original_image_url=data.get('original_image_url'),
            annotated_image_url=data.get('annotated_image_url'),
            original_public_id=data.get('original_public_id'),
            annotated_public_id=data.get('annotated_public_id')
        )
    
    @classmethod
    def create_fruit_disease_analysis(cls, user, data):
        """Create fruit disease analysis record"""
        prediction = data.get('prediction', {})
        
        return cls(
            user=user,
            analysis_type='fruit_disease',
            
            # Disease data
            disease_class=prediction.get('class'),
            disease_confidence=prediction.get('confidence'),
            disease_bbox=prediction.get('bbox', []),
            disease_detections=data.get('detections', []),
            disease_recommendation=data.get('recommendation', ''),
            
            # Common data
            all_probabilities=prediction.get('all_probabilities', {}),
            image_size=data.get('image_size', {}),
            count=data.get('count', 1),
            notes=data.get('notes', ''),
            
            # Image data
            original_image_url=data.get('original_image_url'),
            annotated_image_url=data.get('annotated_image_url'),
            original_public_id=data.get('original_public_id'),
            annotated_public_id=data.get('annotated_public_id')
        )
    
    
    # ==========================================
    # METHODS
    # ==========================================
    
    def save(self, *args, **kwargs):
        """Override save to update timestamp"""
        self.updated_at = datetime.utcnow()
        return super(History, self).save(*args, **kwargs)
    
    def to_dict_public(self):
        """Convert to public dictionary (excludes internal fields)"""
        data = {
            'id': str(self.id),
            'analysis_type': self.analysis_type,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'notes': self.notes,
            'count': self.count,
            'image_size': self.image_size,
            'all_probabilities': self.all_probabilities,
            
            # Image URLs
            'original_image_url': self.original_image_url,
            'annotated_image_url': self.annotated_image_url,
        }
        
        # Add type-specific fields
        if self.analysis_type == 'ripeness':
            data['ripeness'] = {
                'ripeness': self.ripeness,
                'ripeness_level': self.ripeness_level,
                'confidence': self.ripeness_confidence,
                'color': self.ripeness_color,
                'texture': self.ripeness_texture,
                'days_to_ripe': self.ripeness_days_to_ripe,
                'recommendation': self.ripeness_recommendation,
                'bbox': self.ripeness_bbox,
                'color_metrics': self.ripeness_color_metrics
            }
        
        elif self.analysis_type == 'leaf':
            data['leaf'] = {
                'class': self.leaf_class,
                'confidence': self.leaf_confidence,
                'bbox': self.leaf_bbox,
                'detections': self.leaf_detections,
                'recommendation': self.leaf_recommendation
            }
        
        elif self.analysis_type == 'fruit_disease':
            data['disease'] = {
                'class': self.disease_class,
                'confidence': self.disease_confidence,
                'bbox': self.disease_bbox,
                'detections': self.disease_detections,
                'recommendation': self.disease_recommendation
            }
        
        return data
    
    def __repr__(self):
        return f'<History {self.analysis_type} by {self.user.email} at {self.created_at}>'