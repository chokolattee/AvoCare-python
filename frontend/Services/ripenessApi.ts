import { API_BASE_URL as API_URL } from '../config/api';

// ─────────────────────────────────────────────────────────────
// Types matching ripeness_routes.py response exactly
// ─────────────────────────────────────────────────────────────

export interface AvocadoDetection {
  id: number;
  // bounding boxes
  bbox: [number, number, number, number];          // [x,y,w,h] normalised 0-1
  bbox_abs: [number, number, number, number];      // [x1,y1,x2,y2] pixels
  bbox_absolute: [number, number, number, number]; // alias for bbox_abs
  // detection stage
  detection_confidence: number;
  // ripeness stage
  class: string;           // 'underripe' | 'ripe' | 'overripe'
  ripeness: string;
  ripeness_level: number;  // 0 | 1 | 2
  ripeness_confidence: number;
  confidence: number;      // alias for ripeness_confidence
  all_probabilities: { [key: string]: number };
  // metadata
  texture: string;
  days_to_ripe: string;
  recommendation: string;
}

export interface RipenessResult {
  success: boolean;
  count?: number;
  image_size?: { width: number; height: number };

  // Primary avocado summary (largest detected)
  prediction?: {
    type: string;
    ripeness: string;
    ripeness_level: number;
    color: string;
    texture: string;
    confidence: number;
    days_to_ripe: string;
    recommendation: string;
    bbox: [number, number, number, number];
    bbox_absolute: [number, number, number, number];
  };

  all_probabilities?: { [key: string]: number };

  // All detected avocados with per-avocado ripeness
  detections?: AvocadoDetection[];

  // Base64 annotated image drawn by the server
  annotated_image?: string;

  error?: string;
}

// ─────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────

const ripenessApi = {

  predictRipeness: async (imageUri: string): Promise<RipenessResult> => {
    try {
      console.log('🥑 Ripeness API: Starting prediction...');

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

      console.log('📤 Sending request to:', `${API_URL}/api/ripeness/predict`);

      const response = await fetch(`${API_URL}/api/ripeness/predict`, {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
        body: formData,
      });

      const result: RipenessResult = await response.json();

      if (!response.ok) {
        console.error('❌ API Error:', result);
        return { success: false, error: result.error || `Server error: ${response.status}` };
      }

      console.log('📥 Response received:', {
        success: result.success,
        count: result.count,
        detections: result.detections?.length ?? 0,
        has_annotated_image: !!result.annotated_image,
      });

      if (result.detections?.length) {
        console.log(`✅ Detected ${result.detections.length} avocado(s):`);
        result.detections.forEach(d => {
          console.log(
            `   #${d.id}: ${d.class}  ripeness_conf=${(d.ripeness_confidence * 100).toFixed(1)}%` +
            `  det_conf=${(d.detection_confidence * 100).toFixed(1)}%`
          );
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
      const response = await fetch(`${API_URL}/api/ripeness/health`, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      const data = await response.json();
      // New route returns detector_loaded + classifier_loaded
      const isHealthy =
        data.status === 'healthy' &&
        (data.classifier_loaded === true || data.model_loaded === true);

      console.log('🏥 Ripeness API health:', isHealthy ? '✅ Healthy' : '❌ Unhealthy');
      console.log('   detector_loaded:', data.detector_loaded);
      console.log('   classifier_loaded:', data.classifier_loaded);
      return isHealthy;
    } catch (error) {
      console.error('❌ Ripeness health check failed:', error);
      return false;
    }
  },

  getClasses: async () => {
    try {
      const response = await fetch(`${API_URL}/api/ripeness/classes`, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      const data = await response.json();
      console.log('📚 Ripeness classes:', data.classes);
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch ripeness classes:', error);
      return null;
    }
  },
};

export default ripenessApi;