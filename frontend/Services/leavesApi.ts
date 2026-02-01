import { API_BASE_URL as API_URL }  from '../config/api';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export interface LeavesResult {
  success: boolean;
  prediction?: {
    class: string;
    confidence: number;
    all_probabilities: { [key: string]: number };
  };
  error?: string;
}

const leavesApi = {
  predictLeaves: async (imageUri: string): Promise<LeavesResult> => {
    try {
      // Resize image to 512x512 before sending
      const resizedImage = await manipulateAsync(
        imageUri,
        [{ resize: { width: 512, height: 512 } }],
        { compress: 0.8, format: SaveFormat.JPEG }
      );
      
      const formData = new FormData();
      
      if (resizedImage.uri.startsWith('blob:')) {
        const blob = await fetch(resizedImage.uri).then(r => r.blob());
        formData.append('image', blob, 'leaf.jpg');
      } else {
        formData.append('image', {
          uri: resizedImage.uri,
          type: 'image/jpeg',
          name: 'leaf.jpg',
        } as any);
      }

      const response = await fetch(`${API_URL}/api/leaves/predict`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      // Handle 400 errors with more detail
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
      const response = await fetch(`${API_URL}/api/leaves/health`);
      const data = await response.json();
      return data.status === 'ok' && data.model_loaded === true;
    } catch (error) {
      console.error('Leaves API health check failed:', error);
      return false;
    }
  },
};

export default leavesApi;