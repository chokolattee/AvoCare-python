import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getBaseUrl = (): string => {
  return 'http://192.168.0.120:8081';  // ✅ Port 8081 matches backend config
};

export const BASE_URL = getBaseUrl();
export const API_BASE_URL = BASE_URL;

// Log for debugging - helps verify correct URL is being used
console.log('🌐 API Base URL:', API_BASE_URL);