from mongoengine import (
    Document, EmbeddedDocument, StringField, FloatField,
    IntField, BooleanField, ListField, ReferenceField,
    EmbeddedDocumentField, DateTimeField, ObjectIdField
)
from datetime import datetime
from bson import ObjectId
from models.category import Category


class NutritionEntry(EmbeddedDocument):
    id     = ObjectIdField(default=ObjectId)
    label  = StringField(required=True)   # e.g. "Calories"
    amount = StringField(required=True)   # e.g. "160kcal"


class Product(Document):
    meta = {'strict': False}

    name        = StringField(required=True)
    description = StringField(default='')
    category    = ReferenceField(Category, required=True)
    price       = FloatField(required=True, min_value=0)
    stock       = IntField(required=True, default=0, min_value=0)
    images      = ListField(StringField(), default=list)   # Cloudinary URLs
    nutrition   = ListField(EmbeddedDocumentField(NutritionEntry), default=list)
    status      = StringField(
                      required=True,
                      default='draft',
                      choices=('active', 'draft', 'archived')
                  )

    created_at  = DateTimeField(default=datetime.utcnow)
    updated_at  = DateTimeField(default=datetime.utcnow)

    @property
    def is_out_of_stock(self):
        return self.stock == 0

    @property
    def nutrition_count(self):
        return len(self.nutrition)