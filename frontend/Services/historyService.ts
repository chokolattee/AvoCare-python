import { API_BASE_URL }  from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedAnalysis {
  id: string;
  analysis_type: 'ripeness' | 'leaf' | 'fruit_disease';
  confidence: number;
  detection_count: number;
  image_size?: { width: number; height: number };
  image_path?: string;
  bbox?: number[];
  all_probabilities?: { [key: string]: number };
  detections?: any[];
  notes?: string;
  recommendation?: string;
  created_at: string;
  updated_at: string;
  
  // Ripeness-specific
  ripeness?: string;
  ripeness_level?: number;
  color?: string;
  texture?: string;
  days_to_ripe?: string;
  color_metrics?: {
    avg_hue: number;
    avg_saturation: number;
    avg_value: number;
  };
  
  // Leaf-specific
  leaf_class?: string;
  
  // Disease-specific
  disease_class?: string;
}

export interface HistoryListResponse {
  success: boolean;
  analyses?: SavedAnalysis[];
  total?: number;
  limit?: number;
  offset?: number;
  counts?: {
    ripeness: number;
    leaf: number;
    fruit_disease: number;
    total: number;
  };
  message?: string;
}

export interface HistorySaveResponse {
  success: boolean;
  message?: string;
  analysis?: SavedAnalysis;
}

export interface StatisticsResponse {
  success: boolean;
  statistics?: {
    total_analyses: number;
    by_type: {
      ripeness: number;
      leaf: number;
      fruit_disease: number;
    };
    ripeness_distribution: { [key: string]: number };
    leaf_distribution: { [key: string]: number };
    disease_distribution: { [key: string]: number };
    recent_activity: {
      last_7_days: number;
    };
  };
  message?: string;
}

class HistoryService {
  /**
   * Get authorization token from storage
   */
  private async getToken(): Promise<string | null> {
    try {
      // Check for token (matches the key used in AuthScreen.tsx)
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('jwt');
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Get authorization headers
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await this.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  /**
   * Save ripeness analysis
   */
  public async saveRipenessAnalysis(analysisData: any): Promise<HistorySaveResponse> {
    try {
      const token = await this.getToken();
      const headers = await this.getAuthHeaders();
      
      console.log('🔑 Sending ripeness analysis with auth:', {
        url: `${API_BASE_URL}/api/history/ripeness/save`,
        hasToken: !!token,
        dataKeys: Object.keys(analysisData)
      });
      
      const response = await fetch(`${API_BASE_URL}/api/history/ripeness/save`, {
        method: 'POST',
        headers,
        body: JSON.stringify(analysisData),
      });

      const data: HistorySaveResponse = await response.json();
      
      console.log('📥 Ripeness save response:', { 
        status: response.status, 
        success: data.success,
        message: data.message 
      });
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save ripeness analysis');
      }
      
      return data;
    } catch (error) {
      console.error('❌ Save ripeness analysis error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to save analysis',
      };
    }
  }

  /**
   * Save leaf analysis
   */
  public async saveLeafAnalysis(analysisData: any): Promise<HistorySaveResponse> {
    try {
      const token = await this.getToken();
      const headers = await this.getAuthHeaders();
      
      console.log('🔑 Sending leaf analysis with auth:', {
        url: `${API_BASE_URL}/api/history/leaves/save`,
        hasToken: !!token,
        dataKeys: Object.keys(analysisData)
      });
      
      const response = await fetch(`${API_BASE_URL}/api/history/leaves/save`, {
        method: 'POST',
        headers,
        body: JSON.stringify(analysisData),
      });

      const data: HistorySaveResponse = await response.json();
      
      console.log('📥 Leaf save response:', { 
        status: response.status, 
        success: data.success,
        message: data.message 
      });
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save leaf analysis');
      }
      
      return data;
    } catch (error) {
      console.error('❌ Save leaf analysis error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to save analysis',
      };
    }
  }

  /**
   * Save fruit disease analysis
   */
  public async saveFruitDiseaseAnalysis(analysisData: any): Promise<HistorySaveResponse> {
    try {
      const token = await this.getToken();
      const headers = await this.getAuthHeaders();
      
      console.log('🔑 Sending fruit disease analysis with auth:', {
        url: `${API_BASE_URL}/api/history/fruitdisease/save`,
        hasToken: !!token,
        dataKeys: Object.keys(analysisData)
      });
      
      const response = await fetch(`${API_BASE_URL}/api/history/fruitdisease/save`, {
        method: 'POST',
        headers,
        body: JSON.stringify(analysisData),
      });

      const data: HistorySaveResponse = await response.json();
      
      console.log('📥 Fruit disease save response:', { 
        status: response.status, 
        success: data.success,
        message: data.message 
      });
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save fruit disease analysis');
      }
      
      return data;
    } catch (error) {
      console.error('❌ Save fruit disease analysis error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to save analysis',
      };
    }
  }

  /**
   * Get all analyses (combined)
   */
  public async getAllAnalyses(
    limit = 50,
    offset = 0,
    type?: 'ripeness' | 'leaf' | 'fruit_disease'
  ): Promise<HistoryListResponse> {
    try {
      let url = `${API_BASE_URL}/api/history/all?limit=${limit}&offset=${offset}`;
      if (type) {
        url += `&type=${type}`;
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const data: HistoryListResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get analyses');
      }
      
      return data;
    } catch (error) {
      console.error('Get all analyses error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get analyses',
      };
    }
  }

  /**
   * Get ripeness analyses only
   */
  public async getRipenessAnalyses(limit = 50, offset = 0): Promise<HistoryListResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/history/ripeness?limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          headers,
        }
      );

      const data: HistoryListResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get ripeness analyses');
      }
      
      return data;
    } catch (error) {
      console.error('Get ripeness analyses error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get analyses',
      };
    }
  }

  /**
   * Get leaf analyses only
   */
  public async getLeafAnalyses(limit = 50, offset = 0): Promise<HistoryListResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/history/leaves?limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          headers,
        }
      );

      const data: HistoryListResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get leaf analyses');
      }
      
      return data;
    } catch (error) {
      console.error('Get leaf analyses error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get analyses',
      };
    }
  }

  /**
   * Get fruit disease analyses only
   */
  public async getFruitDiseaseAnalyses(limit = 50, offset = 0): Promise<HistoryListResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/history/fruitdisease?limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          headers,
        }
      );

      const data: HistoryListResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get fruit disease analyses');
      }
      
      return data;
    } catch (error) {
      console.error('Get fruit disease analyses error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get analyses',
      };
    }
  }

  /**
   * Get specific analysis by ID
   */
  public async getAnalysis(analysisId: string): Promise<HistorySaveResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/history/${analysisId}`, {
        method: 'GET',
        headers,
      });

      const data: HistorySaveResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get analysis');
      }
      
      return data;
    } catch (error) {
      console.error('Get analysis error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get analysis',
      };
    }
  }

  /**
   * Update notes for an analysis
   */
  public async updateNotes(analysisId: string, notes: string): Promise<HistorySaveResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/history/${analysisId}/notes`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ notes }),
      });

      const data: HistorySaveResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update notes');
      }
      
      return data;
    } catch (error) {
      console.error('Update notes error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update notes',
      };
    }
  }

  /**
   * Delete an analysis
   */
  public async deleteAnalysis(analysisId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/history/${analysisId}`, {
        method: 'DELETE',
        headers,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete analysis');
      }
      
      return data;
    } catch (error) {
      console.error('Delete analysis error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete analysis',
      };
    }
  }

  /**
   * Get user statistics
   */
  public async getStatistics(): Promise<StatisticsResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/history/statistics`, {
        method: 'GET',
        headers,
      });

      const data: StatisticsResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get statistics');
      }
      
      return data;
    } catch (error) {
      console.error('Get statistics error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get statistics',
      };
    }
  }
}

// Export singleton instance
const historyService = new HistoryService();
export default historyService;