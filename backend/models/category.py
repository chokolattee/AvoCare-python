from mongoengine import Document, StringField, DateTimeField
from datetime import datetime


class Category(Document):
    meta = {'strict': False}

    name = StringField(required=True, unique=True)
    created_at = DateTimeField(default=datetime.utcnow)


# ─── Seed default avocado categories ─────────────────────────────────────────
def seed_categories():
    defaults = [
        "Fresh Avocados",
        "Avocado Spreads & Dips",
        "Avocado Oils",
        "Avocado Skincare",
        "Avocado Snacks",
        "Avocado Drinks & Smoothies",
        "Avocado Pastes & Powders",
        "Avocado-Infused Foods",
        "Gift Sets & Bundles",
    ]
    for name in defaults:
        if not Category.objects(name=name).first():
            Category(name=name).save()