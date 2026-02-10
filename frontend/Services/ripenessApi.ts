import { API_BASE_URL as API_URL }  from '../config/api';

export interface RipenessResult {
  success: boolean;
  prediction?: {
    type: string;
    ripeness: string;
    ripeness_level: number;
    color: string;
    texture: string;
    confidence: number;
    days_to_ripe?: string;
    recommendation?: string;
    bbox?: [number, number, number, number]; // [xmin, ymin, xmax, ymax] in normalized coordinates
  };
  all_probabilities?: {
    [key: string]: number;
  };
  error?: string;
}

const ripenessApi = {
  predictRipeness: async (imageUri: string): Promise<RipenessResult> => {
    try {
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

      const response = await fetch(`${API_URL}/api/ripeness/predict`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      // Handle errors with more detail
      if (!response.ok) {
        console.error('API Error:', result);
        return { 
          success: false, 
          error: result.error || `Server error: ${response.status}` 
        };
      }

      return result;
    } catch (error) {
      console.error('Network error:', error);
      return { success: false, error: String(error) };
    }
  },

  checkHealth: async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/ripeness/health`);
      const data = await response.json();
      return data.status === 'healthy' && data.model_loaded === true;
    } catch (error) {
      console.error('Ripeness API health check failed:', error);
      return false;
    }
  },

  getClasses: async () => {
    try {
      const response = await fetch(`${API_URL}/api/ripeness/classes`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch ripeness classes:', error);
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