import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

// Define your navigation stack parameter list
export type RootStackParamList = {
  Home: undefined;
  Community: undefined;
  Scan: undefined;
  Market: undefined;
  Profile: undefined;
  Notifications: undefined;
  AuthScreen: undefined;
  MainTabs: undefined;
};

// Navigation prop type
export type NavigationProp = StackNavigationProp<RootStackParamList>;

// Route prop types for each screen
export type HomeScreenRouteProp = RouteProp<RootStackParamList, 'Home'>;
export type CommunityScreenRouteProp = RouteProp<RootStackParamList, 'Community'>;
export type ScanScreenRouteProp = RouteProp<RootStackParamList, 'Scan'>;
export type MarketScreenRouteProp = RouteProp<RootStackParamList, 'Market'>;
export type ProfileScreenRouteProp = RouteProp<RootStackParamList, 'Profile'>;
export type NotificationsScreenRouteProp = RouteProp<RootStackParamList, 'Notifications'>;
export type AuthScreenRouteProp = RouteProp<RootStackParamList, 'AuthScreen'>;

// User types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Notification types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  createdAt: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}