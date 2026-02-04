from mongoengine import Document, StringField, DateTimeField, ReferenceField, ListField, EmbeddedDocument, EmbeddedDocumentField, BooleanField, ObjectIdField
from datetime import datetime
from models.user import User
from bson import ObjectId

class Comment(EmbeddedDocument):
    id = ObjectIdField(default=ObjectId)
    content = StringField(required=True)
    author_name = StringField(required=True)
    author_id = StringField()
    reply_to = StringField()  # Comment ID this is replying to
    liked_by = ListField(StringField())  # List of user IDs who liked this comment
    created_at = DateTimeField(default=datetime.utcnow)

class Post(Document):
    # 👇 ADD THIS LINE HERE!
    meta = {'strict': False} 
    
    title = StringField(required=True)
    content = StringField(required=True)
    category = StringField(required=True)
    image_urls = ListField(StringField(), default=list)  # Multiple Cloudinary URLs
    archived = BooleanField(default=False)  # Archive status
    
    author = ReferenceField(User, required=True)
    author_name = StringField()
    
    liked_by = ListField(ReferenceField(User)) 
    
    comments = ListField(EmbeddedDocumentField(Comment))
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    @property
    def like_count(self):
        return len(self.liked_by)