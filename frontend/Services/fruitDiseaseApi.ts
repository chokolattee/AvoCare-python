import { API_BASE_URL, API_BASE_URL as API_URL }  from '../config/api';

export interface FruitDetection {
  id: number;
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height] normalized (0-1)
  bbox_absolute?: [number, number, number, number]; // [x, y, width, height] in pixels
  all_probabilities: { [key: string]: number };
}

export interface FruitDiseaseResult {
  success: boolean;
  prediction?: {
    class: string;
    confidence: number;
    bbox?: [number, number, number, number];
    all_probabilities?: { [key: string]: number };
  };
  detections?: FruitDetection[];
  count?: number;
  image_size?: {
    width: number;
    height: number;
  };
  error?: string;
}

/**
 * Check if the fruit disease API is healthy and responsive
 */
const checkHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/api/fruitdisease/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('❌ Fruit disease API health check failed:', response.status);
      return false;
    }

    const data = await response.json();
    console.log('✅ Fruit disease API health check:', data);
    return data.status === 'ok' && data.model_loaded === true;
  } catch (error) {
    console.error('❌ Fruit disease API health check error:', error);
    return false;
  }
};

/**
 * Predict fruit disease from an image
 * @param imageUri - Local URI of the image to analyze
 * @returns FruitDiseaseResult containing predictions and detections
 */
const predictFruitDisease = async (imageUri: string): Promise<FruitDiseaseResult> => {
  try {
    console.log('🍊 Starting fruit disease detection with image:', imageUri);
    
    // Don't resize - send full resolution for better detection
    const formData = new FormData();
    
    if (imageUri.startsWith('blob:')) {
      const blob = await fetch(imageUri).then(r => r.blob());
      formData.append('image', blob, 'fruit.jpg');
    } else {
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'fruit.jpg',
      } as any);
    }

    console.log('📤 Sending to backend...');
    const response = await fetch(`${API_URL}/api/fruitdisease/predict`, {
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

    // Return result with detections
    console.log(`✅ Detected ${result.count || 0} fruits`);
    return result;
  } catch (error) {
    console.error('❌ Network error:', error);
    return { success: false, error: String(error) };
  }
};

/**
 * Save analysis results to the backend
 * @param analysisData - The analysis data to save
 */
const saveAnalysis = async (analysisData: any): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/api/fruitdisease/save-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(analysisData),
    });

    if (!response.ok) {
      console.error('Failed to save fruit disease analysis:', response.status);
      return false;
    }

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Error saving fruit disease analysis:', error);
    return false;
  }
};

// Export API methods
const fruitDiseaseApi = {
  checkHealth,
  predictFruitDisease,
  saveAnalysis,
};

export default fruitDiseaseApi;