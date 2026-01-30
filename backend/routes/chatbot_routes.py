from flask import Blueprint, request, jsonify
from google import genai
from google.genai import types
import os
import re
import traceback

chatbot_routes = Blueprint('chatbot_routes', __name__, url_prefix='/api/chatbot')

# System prompt for avocado farming assistant
SYSTEM_PROMPT = """You are an expert avocado farming assistant called AvoCare Assistant. Provide helpful, accurate, and practical advice about avocado cultivation, pest management, disease identification, fertilization, irrigation, harvesting, and post-harvest handling. 

Keep responses concise but informative (2-4 paragraphs maximum). Use a friendly, professional tone. 

IMPORTANT: Do not use any markdown formatting such as **, *, _, or #. Write in plain text only. Use simple numbered lists and bullet points with hyphens (-) if needed.

When discussing diseases or pests, provide:
1. Clear identification characteristics
2. Practical treatment options
3. Prevention strategies

If asked about topics outside of avocado farming, politely redirect the conversation back to avocado cultivation and care."""

@chatbot_routes.route('/health', methods=['GET'])
def chatbot_health_check():
    """Health check endpoint for chatbot service"""
    try:
        gemini_key = os.getenv('GEMINI_API_KEY')
        is_healthy = gemini_key is not None and len(gemini_key) > 0
        
        return jsonify({
            'status': 'healthy' if is_healthy else 'unhealthy',
            'service': 'AvoCare Chatbot',
            'gemini_configured': is_healthy,
            'message': 'Chatbot service is operational' if is_healthy else 'Missing GEMINI_API_KEY in environment'
        }), 200
    except Exception as e:
        return jsonify({
            'error': f'Health check failed: {str(e)}',
            'success': False
        }), 500

@chatbot_routes.route('/chat', methods=['POST'])
def chat():
    """Handle chat messages and return Gemini AI responses"""
    try:
        print("\n" + "="*50)
        print("📞 CHAT ENDPOINT CALLED")
        print("="*50)
        
        # Get API key from environment
        gemini_key = os.getenv('GEMINI_API_KEY')
        print(f"🔑 API Key present: {'YES' if gemini_key else 'NO'}")
        if gemini_key:
            print(f"   Key length: {len(gemini_key)}")
            print(f"   Key preview: {gemini_key[:10]}...{gemini_key[-4:]}")
        
        # Check if Gemini is configured
        if not gemini_key:
            print("❌ ERROR: No API key found")
            return jsonify({
                'error': 'Gemini API key not configured. Please set GEMINI_API_KEY environment variable.',
                'success': False
            }), 503
        
        data = request.get_json()
        print(f"📨 Request data: {data}")
        
        # Validate request
        if not data:
            print("❌ ERROR: No JSON data")
            return jsonify({
                'error': 'No JSON data provided',
                'success': False
            }), 400
        
        if 'message' not in data:
            print("❌ ERROR: No message in data")
            return jsonify({
                'error': 'No message provided',
                'success': False
            }), 400
        
        user_message = data['message'].strip()
        print(f"💬 User message: {user_message}")
        
        # Validate message is not empty
        if not user_message:
            print("❌ ERROR: Empty message")
            return jsonify({
                'error': 'Message cannot be empty',
                'success': False
            }), 400
        
        # Initialize Gemini client
        print("🤖 Initializing Gemini client...")
        try:
            client = genai.Client(api_key=gemini_key)
            print("✅ Gemini client initialized")
        except Exception as e:
            print(f"❌ Failed to initialize client: {e}")
            return jsonify({
                'error': f'Failed to initialize AI client: {str(e)}',
                'success': False
            }), 500
        
        # Generate response
        print("🔄 Generating response...")
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=f"{SYSTEM_PROMPT}\n\nUser question: {user_message}",
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=1024,
                )
            )
            print("✅ Response generated")
            
            if response and response.text:
                # Clean the response text
                cleaned_text = response.text.strip()
                
                # Remove markdown formatting
                cleaned_text = cleaned_text.replace('**', '').replace('*', '').replace('_', '')
                cleaned_text = re.sub(r'^#+\s+', '', cleaned_text, flags=re.MULTILINE)
                
                print(f"📝 Response length: {len(cleaned_text)} characters")
                print(f"📤 Sending response...")
                
                return jsonify({
                    'response': cleaned_text,
                    'success': True
                }), 200
            else:
                print("❌ Empty response")
                return jsonify({
                    'error': 'Empty response from AI service',
                    'success': False
                }), 500
                
        except Exception as e:
            print(f"❌ Gemini API error: {str(e)}")
            print(f"📋 Full traceback:\n{traceback.format_exc()}")
            
            error_msg = str(e)
            if '429' in error_msg or 'quota' in error_msg.lower():
                return jsonify({
                    'error': 'API quota exceeded. Please try again later.',
                    'success': False
                }), 429
            elif '401' in error_msg:
                return jsonify({
                    'error': 'Invalid API key. Please check your Gemini API key.',
                    'success': False
                }), 401
            else:
                return jsonify({
                    'error': f'AI service error: {error_msg}',
                    'success': False
                }), 500
            
    except Exception as e:
        print(f"❌❌ SERVER ERROR in chat endpoint: {str(e)}")
        print(f"📋 Full traceback:\n{traceback.format_exc()}")
        return jsonify({
            'error': f'Server error: {str(e)}',
            'success': False
        }), 500

@chatbot_routes.route('/suggestions', methods=['GET'])
def get_suggestions():
    """Get quick question suggestions for users"""
    try:
        print("📋 Suggestions endpoint called")
        suggestions = [
            {
                'id': 1,
                'category': 'Disease',
                'question': 'How do I identify root rot?',
                'icon': 'leaf'
            },
            {
                'id': 2,
                'category': 'Fertilization',
                'question': 'Best fertilizer for avocados?',
                'icon': 'flask'
            },
            {
                'id': 3,
                'category': 'Harvesting',
                'question': 'When to harvest avocados?',
                'icon': 'calendar'
            },
            {
                'id': 4,
                'category': 'Pests',
                'question': 'Common avocado pests?',
                'icon': 'bug'
            },
            {
                'id': 5,
                'category': 'Disease',
                'question': 'How to prevent anthracnose?',
                'icon': 'shield'
            },
            {
                'id': 6,
                'category': 'Irrigation',
                'question': 'Watering schedule for avocados?',
                'icon': 'water'
            },
            {
                'id': 7,
                'category': 'Soil',
                'question': 'Best soil pH for avocados?',
                'icon': 'beaker'
            }
        ]
        
        return jsonify({
            'suggestions': suggestions,
            'success': True
        }), 200
    except Exception as e:
        print(f"Error in suggestions: {e}")
        return jsonify({
            'error': 'Failed to get suggestions',
            'success': False
        }), 500

@chatbot_routes.route('/test', methods=['GET'])
def test_endpoint():
    """Simple test endpoint"""
    return jsonify({
        'status': 'success',
        'message': 'Chatbot endpoint is working!',
        'timestamp': 'now'
    }), 200