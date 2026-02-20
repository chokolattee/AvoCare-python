import Constants from 'expo-constants';

const getBaseUrl = (): string => {
  const url =
    process.env.EXPO_PUBLIC_API_URL ||
    Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL;

  if (!url) {
    throw new Error('❌ EXPO_PUBLIC_API_URL is not defined');
  }

  return url;
};

export const BASE_URL = getBaseUrl();
export const API_BASE_URL = BASE_URL;

console.log('🌐 API Base URL:', API_BASE_URL);