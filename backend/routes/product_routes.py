from flask import Blueprint, request, jsonify
from mongoengine.errors import ValidationError, NotUniqueError, DoesNotExist
from bson import ObjectId
from datetime import datetime
import json

import cloudinary
from cloudinary import uploader as cloudinary_uploader

from models.product import Product, NutritionEntry
from models.category import Category

product_bp = Blueprint('products', __name__)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def serialize_product(product):
    return {
        'id':              str(product.id),
        'name':            product.name,
        'description':     product.description,
        'category':        {'id': str(product.category.id), 'name': product.category.name},
        'price':           product.price,
        'stock':           product.stock,
        'images':          product.images,
        'nutrition':       [{'label': n.label, 'amount': n.amount} for n in product.nutrition],
        'status':          product.status,
        'is_out_of_stock': product.is_out_of_stock,
        'created_at':      product.created_at.isoformat(),
        'updated_at':      product.updated_at.isoformat(),
    }

def serialize_category(category):
    return {
        'id':   str(category.id),
        'name': category.name,
    }

def upload_images_from_request(file_key='images', max_count=5):
    """
    Upload all valid files from request.files.getlist(file_key) to Cloudinary.
    Returns (list_of_secure_urls, error_response_or_None).
    """
    urls = []
    files = request.files.getlist(file_key)
    print(f"[upload_images_from_request] received {len(files)} file(s) under key='{file_key}'")

    for img_file in files[:max_count]:
        # Skip empty/unnamed file slots that browsers sometimes send
        if not img_file or not img_file.filename:
            print("[upload_images_from_request] skipping empty file slot")
            continue
        try:
            result = cloudinary_uploader.upload(
                img_file,
                folder='avocare/product',
                resource_type='image',
            )
            url = result.get('secure_url')
            print(f"[upload_images_from_request] uploaded → {url}")
            urls.append(url)
        except Exception as e:
            print(f"[upload_images_from_request] Cloudinary error: {e}")
            return urls, jsonify({'success': False, 'message': f'Image upload failed: {str(e)}'}), 500

    return urls, None


# ─── Categories ───────────────────────────────────────────────────────────────

@product_bp.route('/categories', methods=['GET'])
def get_categories():
    categories = Category.objects().order_by('name')
    return jsonify({'success': True, 'data': [serialize_category(c) for c in categories]}), 200


@product_bp.route('/categories', methods=['POST'])
def create_category():
    data = request.get_json()
    try:
        category = Category(name=data.get('name')).save()
        return jsonify({'success': True, 'data': serialize_category(category)}), 201
    except NotUniqueError:
        return jsonify({'success': False, 'message': 'Category already exists'}), 400
    except ValidationError as e:
        return jsonify({'success': False, 'message': str(e)}), 400


# ─── Products ─────────────────────────────────────────────────────────────────

@product_bp.route('/products', methods=['GET'])
def get_products():
    status   = request.args.get('status')
    category = request.args.get('category')
    search   = request.args.get('search')

    query = {}
    if status:   query['status'] = status
    if category: query['category'] = category
    if search:   query['name__icontains'] = search

    products = Product.objects(**query).order_by('-created_at')
    return jsonify({'success': True, 'data': [serialize_product(p) for p in products]}), 200


@product_bp.route('/products/<product_id>', methods=['GET'])
def get_product(product_id):
    try:
        product = Product.objects.get(id=product_id)
        return jsonify({'success': True, 'data': serialize_product(product)}), 200
    except (DoesNotExist, Exception):
        return jsonify({'success': False, 'message': 'Not found'}), 404


# ── POST /api/products ────────────────────────────────────────────────────────
@product_bp.route('/products', methods=['POST'])
def create_product():
    is_multipart = request.content_type and request.content_type.startswith('multipart/form-data')

    if is_multipart:
        name          = request.form.get('name')
        description   = request.form.get('description', '')
        category_id   = request.form.get('category')
        price         = request.form.get('price')
        stock         = request.form.get('stock', 0)
        status        = request.form.get('status', 'draft')
        nutrition_raw = request.form.get('nutrition', '[]')

        print(f"[create_product] name={name}, category={category_id}, price={price}, stock={stock}")
        print(f"[create_product] files: {list(request.files.keys())}")

        try:
            nutrition = [
                NutritionEntry(label=n['label'], amount=n['amount'])
                for n in json.loads(nutrition_raw)
                if n.get('label') or n.get('amount')
            ]
        except Exception:
            nutrition = []

        image_urls, err = upload_images_from_request()
        if err:
            return err

        try:
            category = Category.objects.get(id=category_id)
        except DoesNotExist:
            return jsonify({'success': False, 'message': 'Invalid category'}), 400

        product = Product(
            name        = name,
            description = description,
            category    = category,
            price       = float(price) if price else 0,
            stock       = int(stock)   if stock  else 0,
            images      = image_urls,
            nutrition   = nutrition,
            status      = status,
        ).save()
        return jsonify({'success': True, 'data': serialize_product(product)}), 201

    else:
        data = request.get_json()
        try:
            category = Category.objects.get(id=data.get('category'))
            nutrition = [
                NutritionEntry(label=n['label'], amount=n['amount'])
                for n in data.get('nutrition', [])
                if n.get('label') or n.get('amount')
            ]
            product = Product(
                name        = data.get('name'),
                description = data.get('description', ''),
                category    = category,
                price       = data.get('price'),
                stock       = data.get('stock', 0),
                images      = data.get('images', []),
                nutrition   = nutrition,
                status      = data.get('status', 'draft'),
            ).save()
            return jsonify({'success': True, 'data': serialize_product(product)}), 201
        except DoesNotExist:
            return jsonify({'success': False, 'message': 'Invalid category'}), 400
        except ValidationError as e:
            return jsonify({'success': False, 'message': str(e)}), 400


# ── PUT /api/products/<id> ────────────────────────────────────────────────────
@product_bp.route('/products/<product_id>', methods=['PUT'])
def update_product(product_id):
    try:
        product = Product.objects.get(id=product_id)

        if product.status == 'archived':
            return jsonify({'success': False, 'message': 'Restore the product before editing.'}), 400

        is_multipart = request.content_type and request.content_type.startswith('multipart/form-data')

        if is_multipart:
            name                = request.form.get('name')
            description         = request.form.get('description', '')
            category_id         = request.form.get('category')
            price               = request.form.get('price')
            stock               = request.form.get('stock', 0)
            status              = request.form.get('status', 'draft')
            nutrition_raw       = request.form.get('nutrition', '[]')
            keep_image_urls_raw = request.form.get('keepImageUrls', '[]')

            # ── DEBUG ─────────────────────────────────────────────────────────
            print(f"[update_product] id={product_id}")
            print(f"[update_product] form keys:       {list(request.form.keys())}")
            print(f"[update_product] file keys:       {list(request.files.keys())}")
            print(f"[update_product] keepImageUrls:   {keep_image_urls_raw}")
            print(f"[update_product] files count:     {len(request.files.getlist('images'))}")
            # ─────────────────────────────────────────────────────────────────

            try:
                nutrition = [
                    NutritionEntry(label=n['label'], amount=n['amount'])
                    for n in json.loads(nutrition_raw)
                    if n.get('label') or n.get('amount')
                ]
            except Exception:
                nutrition = []

            try:
                keep_image_urls = json.loads(keep_image_urls_raw)
                if not isinstance(keep_image_urls, list):
                    keep_image_urls = []
            except Exception:
                keep_image_urls = []

            # Upload any new images the user picked
            new_image_urls, err = upload_images_from_request()
            if err:
                return err

            # Final image list: kept existing URLs + newly uploaded URLs, capped at 5
            product.images = (keep_image_urls + new_image_urls)[:5]

            print(f"[update_product] keep={keep_image_urls}")
            print(f"[update_product] new={new_image_urls}")
            print(f"[update_product] final images={product.images}")

            if name        is not None: product.name        = name
            if description is not None: product.description = description
            if price       is not None: product.price       = float(price)
            if stock       is not None: product.stock       = int(stock)
            if status:                  product.status      = status

            if category_id:
                try:
                    product.category = Category.objects.get(id=category_id)
                except DoesNotExist:
                    return jsonify({'success': False, 'message': 'Invalid category'}), 400

            # Always write nutrition so the user can clear all entries
            product.nutrition = nutrition

        else:
            data = request.get_json()
            if 'category' in data:
                try:
                    product.category = Category.objects.get(id=data['category'])
                except DoesNotExist:
                    return jsonify({'success': False, 'message': 'Invalid category'}), 400
            if 'name'        in data: product.name        = data['name']
            if 'description' in data: product.description = data['description']
            if 'price'       in data: product.price       = data['price']
            if 'stock'       in data: product.stock       = data['stock']
            if 'images'      in data: product.images      = data['images']
            if 'status'      in data: product.status      = data['status']
            if 'nutrition'   in data:
                product.nutrition = [
                    NutritionEntry(label=n['label'], amount=n['amount'])
                    for n in data['nutrition']
                    if n.get('label') or n.get('amount')
                ]

        product.updated_at = datetime.utcnow()
        product.save()
        return jsonify({'success': True, 'data': serialize_product(product)}), 200

    except DoesNotExist:
        return jsonify({'success': False, 'message': 'Not found'}), 404
    except ValidationError as e:
        return jsonify({'success': False, 'message': str(e)}), 400


# ── PATCH /api/products/<id>/archive ─────────────────────────────────────────
@product_bp.route('/products/<product_id>/archive', methods=['PATCH'])
def archive_product(product_id):
    try:
        product = Product.objects.get(id=product_id)
        product.update(status='archived', updated_at=datetime.utcnow())
        product.reload()
        return jsonify({'success': True, 'data': serialize_product(product)}), 200
    except DoesNotExist:
        return jsonify({'success': False, 'message': 'Not found'}), 404


# ── PATCH /api/products/<id>/restore ─────────────────────────────────────────
@product_bp.route('/products/<product_id>/restore', methods=['PATCH'])
def restore_product(product_id):
    try:
        product = Product.objects.get(id=product_id)
        product.update(status='draft', updated_at=datetime.utcnow())
        product.reload()
        return jsonify({'success': True, 'data': serialize_product(product)}), 200
    except DoesNotExist:
        return jsonify({'success': False, 'message': 'Not found'}), 404