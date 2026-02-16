import { API_BASE_URL as API_URL }  from '../config/api';

// Individual fruit detection interface
export interface FruitRipenessDetection {
  id: number;
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height] normalized (0-1)
  bbox_absolute?: [number, number, number, number]; // [x, y, width, height] in pixels
  color: string;
  texture: string;
  days_to_ripe: string;
  recommendation: string;
  all_probabilities: { [key: string]: number };
  color_metrics?: {
    avg_hue: number;
    avg_saturation: number;
    avg_value: number;
  };
}

export interface RipenessResult {
  success: boolean;
  count?: number; // Number of fruits detected
  image_size?: {
    width: number;
    height: number;
  };
  prediction?: {
    type: string;
    ripeness: string;
    ripeness_level: number;
    color: string;
    texture: string;
    confidence: number;
    days_to_ripe?: string;
    recommendation?: string;
    bbox?: [number, number, number, number]; // Primary fruit bbox
    color_metrics?: {
      avg_hue: number;
      avg_saturation: number;
      avg_value: number;
    };
  };
  all_probabilities?: {
    [key: string]: number;
  };
  detections?: FruitRipenessDetection[]; // Array of all detected fruits
  error?: string;
}

const ripenessApi = {
  predictRipeness: async (imageUri: string): Promise<RipenessResult> => {
    try {
      console.log('🥑 Ripeness API: Starting prediction for multiple fruits...');
      
      const formData = new FormData();
      
      // Handle blob URLs (web) vs file URIs (mobile)
      if (imageUri.startsWith('blob:')) {
        // For web: fetch the blob and convert to file
        const blob = await fetch(imageUri).then(r => r.blob());
        formData.append('image', blob, 'fruit.jpg');
      } else {
        // For mobile: use the file URI directly
        formData.append('image', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'fruit.jpg',
        } as any);
      }

      console.log('📤 Sending request to:', `${API_URL}/api/ripeness/predict`);
      
      const response = await fetch(`${API_URL}/api/ripeness/predict`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      console.log('📥 Response received:', {
        success: result.success,
        count: result.count,
        detections: result.detections?.length || 0
      });
      
      // Handle errors with more detail
      if (!response.ok) {
        console.error('❌ API Error:', result);
        return { 
          success: false, 
          error: result.error || `Server error: ${response.status}` 
        };
      }

      // Log detection details
      if (result.detections && result.detections.length > 0) {
        console.log(`✅ Detected ${result.detections.length} fruit(s):`);
        result.detections.forEach((det: FruitRipenessDetection) => {
          console.log(`   #${det.id}: ${det.class} (${(det.confidence * 100).toFixed(1)}%) - ${det.color}`);
        });
      }

      return result;
    } catch (error) {
      console.error('❌ Network error:', error);
      return { success: false, error: String(error) };
    }
  },

  checkHealth: async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/ripeness/health`);
      const data = await response.json();
      const isHealthy = data.status === 'healthy' && data.model_loaded === true;
      
      console.log('🏥 Ripeness API health:', isHealthy ? '✅ Healthy' : '❌ Unhealthy');
      if (isHealthy) {
        console.log('   Features:', data.features);
      }
      
      return isHealthy;
    } catch (error) {
      console.error('❌ Ripeness API health check failed:', error);
      return false;
    }
  },

  getClasses: async () => {
    try {
      const response = await fetch(`${API_URL}/api/ripeness/classes`);
      const data = await response.json();
      console.log('📚 Ripeness classes:', data.classes);
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch ripeness classes:', error);
      return null;
    }
  },

  debugUpload: async (imageUri: string) => {
    try {
      const formData = new FormData();
      
      // Handle blob URLs (web) vs file URIs (mobile)
      if (imageUri.startsWith('blob:')) {
        const blob = await fetch(imageUri).then(r => r.blob());
        formData.append('image', blob, 'debug.jpg');
      } else {
        formData.append('image', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'debug.jpg',
        } as any);
      }

      const response = await fetch(`${API_URL}/api/ripeness/debug-upload`, {
        method: 'POST',
        body: formData,
      });

      return await response.json();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
};

export default ripenessApi;