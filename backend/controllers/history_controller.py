# controllers/history_controller.py
from flask import request, jsonify, g, current_app
from models.history import History
from datetime import datetime, timedelta
from utils.image_utils import process_and_upload_images, delete_cloudinary_images
import jwt


class HistoryController:
    """Controller for handling history-related operations"""
    
    @staticmethod
    def save_ripeness_analysis():
        """Save ripeness analysis for authenticated user"""
        try:
            current_user = request.current_user
            data = request.get_json()
            
            # Add validation logging
            print(f"📝 Saving ripeness analysis for user: {current_user.email}")
            print(f"📊 Data keys: {list(data.keys())}")
            
            # Validate required fields
            if not data.get('prediction'):
                return jsonify({
                    'success': False,
                    'message': 'Missing prediction data'
                }), 400
            
            if not data['prediction'].get('ripeness'):
                return jsonify({
                    'success': False,
                    'message': 'Missing ripeness data'
                }), 400
            
            # Process and upload images if image data is provided
            image_urls = {}
            if data.get('image_data'):
                print(f"📸 Processing images for ripeness analysis...")
                try:
                    # Prepare detection for bounding box
                    detection = {
                        'bbox': data['prediction'].get('bbox', [0.2, 0.2, 0.6, 0.6]),
                        'ripeness': data['prediction'].get('ripeness'),
                        'confidence': data['prediction'].get('confidence', 0.0)
                    }
                    
                    image_urls = process_and_upload_images(
                        image_data=data['image_data'],
                        detections=[detection],
                        image_size=data.get('image_size', {'width': 800, 'height': 600}),
                        analysis_type='ripeness',
                        user_id=str(current_user.id)
                    )
                    print(f"✅ Images uploaded successfully")
                except Exception as e:
                    print(f"⚠️  Image upload failed: {str(e)}")
                    # Continue without images - don't fail the entire save
            
            # Add image URLs to data
            data['original_image_url'] = image_urls.get('original_image_url')
            data['annotated_image_url'] = image_urls.get('annotated_image_url')
            data['original_public_id'] = image_urls.get('original_public_id')
            data['annotated_public_id'] = image_urls.get('annotated_public_id')
            
            # Create history record
            history = History.create_ripeness_analysis(current_user, data)
            history.save()
            
            print(f"✅ Ripeness analysis saved with ID: {history.id}")
            
            return jsonify({
                'success': True,
                'message': 'Ripeness analysis saved successfully',
                'analysis': history.to_dict_public()
            }), 201
            
        except Exception as e:
            print(f"❌ Error saving ripeness analysis: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({
                'success': False,
                'message': f'Server error: {str(e)}'
            }), 500
    
    @staticmethod
    def save_leaf_analysis():
        """Save leaf analysis for authenticated user"""
        try:
            current_user = request.current_user
            data = request.get_json()
            
            # Add validation logging
            print(f"📝 Saving leaf analysis for user: {current_user.email}")
            print(f"📊 Data keys: {list(data.keys())}")
            print(f"📊 Prediction keys: {list(data.get('prediction', {}).keys())}")
            
            # Validate required fields
            if not data.get('prediction'):
                return jsonify({
                    'success': False,
                    'message': 'Missing prediction data'
                }), 400
            
            if not data['prediction'].get('class'):
                return jsonify({
                    'success': False,
                    'message': 'Missing leaf class'
                }), 400
            
            # Process and upload images if image data is provided
            image_urls = {}
            if data.get('image_data'):
                print(f"📸 Processing images for leaf analysis...")
                try:
                    # Use detections if available, otherwise create from prediction
                    detections = data.get('detections', [])
                    if not detections:
                        detections = [{
                            'bbox': data['prediction'].get('bbox', [0.25, 0.25, 0.5, 0.5]),
                            'class': data['prediction'].get('class'),
                            'confidence': data['prediction'].get('confidence', 0.0)
                        }]
                    
                    image_urls = process_and_upload_images(
                        image_data=data['image_data'],
                        detections=detections,
                        image_size=data.get('image_size', {'width': 800, 'height': 600}),
                        analysis_type='leaf',
                        user_id=str(current_user.id)
                    )
                    print(f"✅ Images uploaded successfully")
                except Exception as e:
                    print(f"⚠️  Image upload failed: {str(e)}")
                    # Continue without images
            
            # Add image URLs to data
            data['original_image_url'] = image_urls.get('original_image_url')
            data['annotated_image_url'] = image_urls.get('annotated_image_url')
            data['original_public_id'] = image_urls.get('original_public_id')
            data['annotated_public_id'] = image_urls.get('annotated_public_id')
            
            # Create history record
            history = History.create_leaf_analysis(current_user, data)
            history.save()
            
            print(f"✅ Leaf analysis saved with ID: {history.id}")
            
            return jsonify({
                'success': True,
                'message': 'Leaf analysis saved successfully',
                'analysis': history.to_dict_public()
            }), 201
            
        except Exception as e:
            print(f"❌ Error saving leaf analysis: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({
                'success': False,
                'message': f'Server error: {str(e)}'
            }), 500
    
    @staticmethod
    def save_fruit_disease_analysis():
        """Save fruit disease analysis for authenticated user"""
        try:
            current_user = request.current_user
            data = request.get_json()
            
            # Add validation logging
            print(f"📝 Saving fruit disease analysis for user: {current_user.email}")
            print(f"📊 Data keys: {list(data.keys())}")
            
            # Validate required fields
            if not data.get('prediction'):
                return jsonify({
                    'success': False,
                    'message': 'Missing prediction data'
                }), 400
            
            if not data['prediction'].get('class'):
                return jsonify({
                    'success': False,
                    'message': 'Missing disease class'
                }), 400
            
            # Process and upload images if image data is provided
            image_urls = {}
            if data.get('image_data'):
                print(f"📸 Processing images for fruit disease analysis...")
                try:
                    # Use detections if available, otherwise create from prediction
                    detections = data.get('detections', [])
                    if not detections:
                        detections = [{
                            'bbox': data['prediction'].get('bbox', [0.2, 0.2, 0.6, 0.6]),
                            'class': data['prediction'].get('class'),
                            'confidence': data['prediction'].get('confidence', 0.0)
                        }]
                    
                    image_urls = process_and_upload_images(
                        image_data=data['image_data'],
                        detections=detections,
                        image_size=data.get('image_size', {'width': 800, 'height': 600}),
                        analysis_type='fruit_disease',
                        user_id=str(current_user.id)
                    )
                    print(f"✅ Images uploaded successfully")
                except Exception as e:
                    print(f"⚠️  Image upload failed: {str(e)}")
                    # Continue without images
            
            # Add image URLs to data
            data['original_image_url'] = image_urls.get('original_image_url')
            data['annotated_image_url'] = image_urls.get('annotated_image_url')
            data['original_public_id'] = image_urls.get('original_public_id')
            data['annotated_public_id'] = image_urls.get('annotated_public_id')
            
            # Create history record
            history = History.create_fruit_disease_analysis(current_user, data)
            history.save()
            
            print(f"✅ Fruit disease analysis saved with ID: {history.id}")
            
            return jsonify({
                'success': True,
                'message': 'Fruit disease analysis saved successfully',
                'analysis': history.to_dict_public()
            }), 201
            
        except Exception as e:
            print(f"❌ Error saving fruit disease analysis: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({
                'success': False,
                'message': f'Server error: {str(e)}'
            }), 500
    
    @staticmethod
    def save_batch_analyses():
        """
        Save multiple analyses at once (batch processing)
        Supports mixed types: ripeness, leaf, and fruit_disease
        """
        try:
            current_user = request.current_user
            data = request.get_json()
            
            # Validate batch data
            if not data.get('analyses') or not isinstance(data['analyses'], list):
                return jsonify({
                    'success': False,
                    'message': 'Missing or invalid analyses array'
                }), 400
            
            analyses = data['analyses']
            print(f"📦 Starting batch save of {len(analyses)} analyses for user: {current_user.email}")
            
            results = []
            successful = 0
            failed = 0
            
            for idx, analysis_data in enumerate(analyses):
                try:
                    print(f"\n📝 Processing analysis {idx + 1}/{len(analyses)}...")
                    
                    # Get analysis type
                    analysis_type = analysis_data.get('analysis_type')
                    if analysis_type not in ['ripeness', 'leaf', 'fruit_disease']:
                        raise ValueError(f"Invalid analysis type: {analysis_type}")
                    
                    # Validate required fields
                    if not analysis_data.get('prediction'):
                        raise ValueError("Missing prediction data")
                    
                    # Process images if provided
                    image_urls = {}
                    if analysis_data.get('image_data'):
                        print(f"📸 Processing images for {analysis_type} analysis...")
                        
                        # Prepare detections based on type
                        detections = analysis_data.get('detections', [])
                        if not detections:
                            detections = [{
                                'bbox': analysis_data['prediction'].get('bbox', [0.25, 0.25, 0.5, 0.5]),
                                'class': analysis_data['prediction'].get('class') or analysis_data['prediction'].get('ripeness'),
                                'confidence': analysis_data['prediction'].get('confidence', 0.0)
                            }]
                        
                        from utils.image_utils import process_and_upload_images
                        image_urls = process_and_upload_images(
                            image_data=analysis_data['image_data'],
                            detections=detections,
                            image_size=analysis_data.get('image_size', {'width': 800, 'height': 600}),
                            analysis_type=analysis_type,
                            user_id=str(current_user.id)
                        )
                    
                    # Add image URLs to analysis data
                    analysis_data['original_image_url'] = image_urls.get('original_image_url')
                    analysis_data['annotated_image_url'] = image_urls.get('annotated_image_url')
                    analysis_data['original_public_id'] = image_urls.get('original_public_id')
                    analysis_data['annotated_public_id'] = image_urls.get('annotated_public_id')
                    
                    # Create history record based on type
                    if analysis_type == 'ripeness':
                        history = History.create_ripeness_analysis(current_user, analysis_data)
                    elif analysis_type == 'leaf':
                        history = History.create_leaf_analysis(current_user, analysis_data)
                    elif analysis_type == 'fruit_disease':
                        history = History.create_fruit_disease_analysis(current_user, analysis_data)
                    
                    history.save()
                    
                    results.append({
                        'success': True,
                        'index': idx,
                        'analysis_id': str(history.id),
                        'analysis_type': analysis_type
                    })
                    successful += 1
                    print(f"✅ Analysis {idx + 1} saved successfully (ID: {history.id})")
                    
                except Exception as e:
                    print(f"❌ Error saving analysis {idx + 1}: {str(e)}")
                    results.append({
                        'success': False,
                        'index': idx,
                        'error': str(e),
                        'analysis_type': analysis_data.get('analysis_type', 'unknown')
                    })
                    failed += 1
            
            print(f"\n✅ Batch save complete: {successful} successful, {failed} failed")
            
            return jsonify({
                'success': True,
                'message': f'Batch save complete: {successful} successful, {failed} failed',
                'results': results,
                'summary': {
                    'total': len(analyses),
                    'successful': successful,
                    'failed': failed
                }
            }), 201 if failed == 0 else 207  # 207 Multi-Status if some failed
            
        except Exception as e:
            print(f"❌ Error in batch save: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({
                'success': False,
                'message': f'Server error: {str(e)}'
            }), 500
    
    @staticmethod
    def get_all_analyses():
        """Get all analyses for authenticated user with optional type filter"""
        try:
            current_user = request.current_user
            
            # Get query parameters
            limit = int(request.args.get('limit', 50))
            offset = int(request.args.get('offset', 0))
            analysis_type = request.args.get('type')  # Optional filter
            
            # Validate limits
            limit = min(limit, 100)  # Max 100
            offset = max(offset, 0)   # Min 0
            
            # Build query
            query = {'user': current_user}
            if analysis_type in ['ripeness', 'leaf', 'fruit_disease']:
                query['analysis_type'] = analysis_type
            
            # Get analyses
            total = History.objects(**query).count()
            analyses = History.objects(**query).skip(offset).limit(limit)
            
            # Get counts by type
            counts = {
                'ripeness': History.objects(user=current_user, analysis_type='ripeness').count(),
                'leaf': History.objects(user=current_user, analysis_type='leaf').count(),
                'fruit_disease': History.objects(user=current_user, analysis_type='fruit_disease').count(),
                'total': History.objects(user=current_user).count()
            }
            
            return jsonify({
                'success': True,
                'analyses': [h.to_dict_public() for h in analyses],
                'total': total,
                'limit': limit,
                'offset': offset,
                'counts': counts
            })
            
        except Exception as e:
            print(f"❌ Error getting analyses: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Server error: {str(e)}'
            }), 500
    
    @staticmethod
    def get_ripeness_analyses():
        """Get ripeness analyses for authenticated user"""
        try:
            current_user = request.current_user
            
            limit = int(request.args.get('limit', 50))
            offset = int(request.args.get('offset', 0))
            
            limit = min(limit, 100)
            offset = max(offset, 0)
            
            total = History.objects(user=current_user, analysis_type='ripeness').count()
            analyses = History.objects(
                user=current_user, 
                analysis_type='ripeness'
            ).skip(offset).limit(limit)
            
            return jsonify({
                'success': True,
                'analyses': [h.to_dict_public() for h in analyses],
                'total': total,
                'limit': limit,
                'offset': offset
            })
            
        except Exception as e:
            print(f"❌ Error getting ripeness analyses: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Server error: {str(e)}'
            }), 500
    
    @staticmethod
    def get_leaf_analyses():
        """Get leaf analyses for authenticated user"""
        try:
            current_user = request.current_user
            
            limit = int(request.args.get('limit', 50))
            offset = int(request.args.get('offset', 0))
            
            limit = min(limit, 100)
            offset = max(offset, 0)
            
            total = History.objects(user=current_user, analysis_type='leaf').count()
            analyses = History.objects(
                user=current_user, 
                analysis_type='leaf'
            ).skip(offset).limit(limit)
            
            return jsonify({
                'success': True,
                'analyses': [h.to_dict_public() for h in analyses],
                'total': total,
                'limit': limit,
                'offset': offset
            })
            
        except Exception as e:
            print(f"❌ Error getting leaf analyses: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Server error: {str(e)}'
            }), 500
    
    @staticmethod
    def get_fruit_disease_analyses():
        """Get fruit disease analyses for authenticated user"""
        try:
            current_user = request.current_user
            
            limit = int(request.args.get('limit', 50))
            offset = int(request.args.get('offset', 0))
            
            limit = min(limit, 100)
            offset = max(offset, 0)
            
            total = History.objects(user=current_user, analysis_type='fruit_disease').count()
            analyses = History.objects(
                user=current_user, 
                analysis_type='fruit_disease'
            ).skip(offset).limit(limit)
            
            return jsonify({
                'success': True,
                'analyses': [h.to_dict_public() for h in analyses],
                'total': total,
                'limit': limit,
                'offset': offset
            })
            
        except Exception as e:
            print(f"❌ Error getting fruit disease analyses: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Server error: {str(e)}'
            }), 500
    
    @staticmethod
    def get_analysis(analysis_id):
        """Get specific analysis by ID"""
        try:
            current_user = request.current_user
            
            # Get analysis
            history = History.objects(id=analysis_id, user=current_user).first()
            
            if not history:
                return jsonify({
                    'success': False,
                    'message': 'Analysis not found'
                }), 404
            
            return jsonify({
                'success': True,
                'analysis': history.to_dict_public()
            })
            
        except Exception as e:
            print(f"❌ Error getting analysis: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Server error: {str(e)}'
            }), 500
    
    @staticmethod
    def update_analysis_notes(analysis_id):
        """Update notes for specific analysis"""
        try:
            current_user = request.current_user
            data = request.get_json()
            
            # Get analysis
            history = History.objects(id=analysis_id, user=current_user).first()
            
            if not history:
                return jsonify({
                    'success': False,
                    'message': 'Analysis not found'
                }), 404
            
            # Update notes
            history.notes = data.get('notes', '')
            history.save()
            
            return jsonify({
                'success': True,
                'message': 'Notes updated successfully',
                'analysis': history.to_dict_public()
            })
            
        except Exception as e:
            print(f"❌ Error updating notes: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Server error: {str(e)}'
            }), 500
    
    @staticmethod
    def delete_analysis(analysis_id):
        """Delete specific analysis"""
        try:
            current_user = request.current_user
            
            # Get analysis
            history = History.objects(id=analysis_id, user=current_user).first()
            
            if not history:
                return jsonify({
                    'success': False,
                    'message': 'Analysis not found'
                }), 404
            
            # Delete images from Cloudinary if they exist
            public_ids = []
            if history.original_public_id:
                public_ids.append(history.original_public_id)
            if history.annotated_public_id:
                public_ids.append(history.annotated_public_id)
            
            if public_ids:
                print(f"🗑️  Deleting {len(public_ids)} images from Cloudinary...")
                delete_cloudinary_images(public_ids)
            
            # Delete from database
            history.delete()
            
            return jsonify({
                'success': True,
                'message': 'Analysis deleted successfully'
            })
            
        except Exception as e:
            print(f"❌ Error deleting analysis: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Server error: {str(e)}'
            }), 500
    
    @staticmethod
    def get_statistics():
        """Get analysis statistics for authenticated user"""
        try:
            current_user = request.current_user
            
            # Total counts by type
            total_analyses = History.objects(user=current_user).count()
            by_type = {
                'ripeness': History.objects(user=current_user, analysis_type='ripeness').count(),
                'leaf': History.objects(user=current_user, analysis_type='leaf').count(),
                'fruit_disease': History.objects(user=current_user, analysis_type='fruit_disease').count()
            }
            
            # Ripeness distribution
            ripeness_analyses = History.objects(user=current_user, analysis_type='ripeness')
            ripeness_dist = {}
            for h in ripeness_analyses:
                ripeness = h.ripeness or 'unknown'
                ripeness_dist[ripeness] = ripeness_dist.get(ripeness, 0) + 1
            
            # Leaf distribution
            leaf_analyses = History.objects(user=current_user, analysis_type='leaf')
            leaf_dist = {}
            for h in leaf_analyses:
                leaf_class = h.leaf_class or 'unknown'
                leaf_dist[leaf_class] = leaf_dist.get(leaf_class, 0) + 1
            
            # Disease distribution
            disease_analyses = History.objects(user=current_user, analysis_type='fruit_disease')
            disease_dist = {}
            for h in disease_analyses:
                disease_class = h.disease_class or 'unknown'
                disease_dist[disease_class] = disease_dist.get(disease_class, 0) + 1
            
            # Recent activity (last 7 days)
            seven_days_ago = datetime.utcnow() - timedelta(days=7)
            recent_count = History.objects(
                user=current_user,
                created_at__gte=seven_days_ago
            ).count()
            
            return jsonify({
                'success': True,
                'statistics': {
                    'total_analyses': total_analyses,
                    'by_type': by_type,
                    'ripeness_distribution': ripeness_dist,
                    'leaf_distribution': leaf_dist,
                    'disease_distribution': disease_dist,
                    'recent_activity': {
                        'last_7_days': recent_count
                    }
                }
            })
            
        except Exception as e:
            print(f"❌ Error getting statistics: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Server error: {str(e)}'
            }), 500