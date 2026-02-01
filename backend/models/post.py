from mongoengine import Document, StringField, DateTimeField, ReferenceField, ListField, EmbeddedDocument, EmbeddedDocumentField
from datetime import datetime
from models.user import User

class Comment(EmbeddedDocument):
    content = StringField(required=True)
    author_name = StringField(required=True)
    author_id = StringField()
    created_at = DateTimeField(default=datetime.utcnow)

class Post(Document):
    # 👇 ADD THIS LINE HERE!
    meta = {'strict': False} 
    
    title = StringField(required=True)
    content = StringField(required=True)
    category = StringField(required=True)
    image_url = StringField(null=True)  # Cloudinary URL for the post image
    
    author = ReferenceField(User, required=True)
    author_name = StringField()
    
    liked_by = ListField(ReferenceField(User)) 
    
    comments = ListField(EmbeddedDocumentField(Comment))
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    @property
    def like_count(self):
        return len(self.liked_by)