import { API_BASE_URL as API_URL }  from '../config/api';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export interface LeafDetection {
  id: number;
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height] normalized (0-1)
  bbox_absolute: [number, number, number, number]; // [x, y, width, height] in pixels
  all_probabilities: { [key: string]: number };
}

export interface LeavesResult {
  success: boolean;
  prediction?: {
    class: string;
    confidence: number;
    bbox: [number, number, number, number];
    all_probabilities: { [key: string]: number };
  };
  detections?: LeafDetection[]; // Multiple leaves detected
  count?: number; // Number of leaves detected
  image_size?: {
    width: number;
    height: number;
  };
  error?: string;
}

const leavesApi = {
  predictLeaves: async (imageUri: string): Promise<LeavesResult> => {
    try {
      console.log('🍃 Starting leaf detection with image:', imageUri);
      
      // Don't resize - send full resolution for better detection
      const formData = new FormData();
      
      if (imageUri.startsWith('blob:')) {
        const blob = await fetch(imageUri).then(r => r.blob());
        formData.append('image', blob, 'leaf.jpg');
      } else {
        formData.append('image', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'leaf.jpg',
        } as any);
      }

      console.log('📤 Sending to backend...');
      const response = await fetch(`${API_URL}/api/leaves/predict`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('📥 Received response:', result);
      
      // Handle 400 errors with more detail
      if (!response.ok) {
        console.error('❌ API Error:', result);
        return { 
          success: false, 
          error: result.error || `Server error: ${response.status}` 
        };
      }

      // Return result with multiple detections
      console.log(`✅ Detected ${result.count || 0} leaves`);
      return result;
    } catch (error) {
      console.error('❌ Network error:', error);
      return { success: false, error: String(error) };
    }
  },

  checkHealth: async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/leaves/health`);
      const data = await response.json();
      console.log('🏥 Leaves API health:', data);
      return data.status === 'ok' && data.model_loaded === true;
    } catch (error) {
      console.error('❌ Leaves API health check failed:', error);
      return false;
    }
  },
};

export default leavesApi;