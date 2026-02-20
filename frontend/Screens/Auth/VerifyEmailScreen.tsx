// Screens/Auth/VerifyEmailScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../config/api';

const API_URL = `${API_BASE_URL}/api/users`;

// Define navigation types
type RootStackParamList = {
  AuthScreen: {
    emailVerified?: boolean;
    message?: string;
  } | undefined;
  VerifyEmail: {
    token: string;
  };
  ResendVerification: {
    email?: string;
  } | undefined;
};

type VerifyEmailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'VerifyEmail'
>;

type VerifyEmailScreenRouteProp = RouteProp<
  RootStackParamList,
  'VerifyEmail'
>;

interface Props {
  navigation: VerifyEmailScreenNavigationProp;
  route: VerifyEmailScreenRouteProp;
}

const VerifyEmailScreen: React.FC<Props> = ({ navigation, route }) => {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [alreadyVerified, setAlreadyVerified] = useState(false);

  useEffect(() => {
    verifyEmail();
  }, []);

  const verifyEmail = async () => {
    try {
      // Get token from route params
      const { token } = route.params;
      
      console.log('🔍 Token from params:', token);
      
      if (!token) {
        setError('No verification token provided');
        setLoading(false);
        return;
      }

      console.log('🔐 Verifying email with token:', token.substring(0, 20) + '...');
      console.log('📡 API URL:', `${API_URL}/verify-email-mobile`);

      // Use the mobile-specific endpoint with POST
      const response = await fetch(`${API_URL}/verify-email-mobile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ token })
      });

      console.log('📊 Response status:', response.status);
      
      const data = await response.json();
      console.log('✅ Verification response:', data);

      if (data.success) {
        setSuccess(true);
        setAlreadyVerified(data.already_verified || false);
        
        // Optionally store user data
        if (data.user) {
          await AsyncStorage.setItem('user', JSON.stringify(data.user));
        }
        
        // Show success message and navigate to AuthScreen after delay
        setTimeout(() => {
          navigation.navigate('AuthScreen', {
            emailVerified: true,
            message: data.already_verified 
              ? 'Your email was already verified! You can sign in now.'
              : 'Email verified successfully! You can now sign in.'
          });
        }, 2000);
        
      } else {
        // Handle different error types
        handleVerificationError(data.error, data.message);
      }

    } catch (error) {
      console.error('❌ Verification error:', error);
      setError('Unable to verify email. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationError = (errorType: string, errorMessage: string) => {
    switch (errorType) {
      case 'invalid_token':
        setError('Invalid verification link. Please try again.');
        break;
      case 'expired':
        setError('Verification link has expired.');
        // Show option to resend
        Alert.alert(
          'Link Expired',
          'Your verification link has expired. Would you like to request a new one?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Resend', 
              onPress: () => navigation.navigate('ResendVerification')
            }
          ]
        );
        break;
      case 'no_token':
        setError('No verification token found.');
        break;
      case 'server_error':
        setError('Server error. Please try again later.');
        break;
      default:
        setError(errorMessage || 'Verification failed. Please try again.');
    }
  };

  const handleRetry = () => {
    setLoading(true);
    setError('');
    verifyEmail();
  };

  const handleGoToAuth = () => {
    navigation.navigate('AuthScreen');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.title}>Verifying your email...</Text>
          <Text style={styles.subtitle}>Please wait while we confirm your email address.</Text>
        </View>
      </View>
    );
  }

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconSuccess}>
            <Text style={styles.iconText}>✓</Text>
          </View>
          <Text style={styles.title}>Email Verified!</Text>
          <Text style={styles.subtitle}>
            {alreadyVerified 
              ? 'Your email was already verified.'
              : 'Your email has been successfully verified.'
            }
          </Text>
          <Text style={styles.successMessage}>
            You can now sign in to AvoCare.
          </Text>
          <TouchableOpacity 
            style={styles.buttonPrimary}
            onPress={handleGoToAuth}
          >
            <Text style={styles.buttonText}>Continue to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconError}>
            <Text style={styles.iconText}>✕</Text>
          </View>
          <Text style={styles.title}>Verification Failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={handleRetry}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.buttonSecondary}
            onPress={handleGoToAuth}
          >
            <Text style={styles.buttonTextSecondary}>Go to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconSuccess: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconError: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconText: {
    fontSize: 50,
    color: 'white',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
    lineHeight: 24,
  },
  successMessage: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 30,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#f44336',
    fontWeight: '500',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#667eea',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginTop: 10,
    width: '100%',
    maxWidth: 300,
  },
  buttonPrimary: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginTop: 10,
    width: '100%',
    maxWidth: 300,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666',
    marginTop: 10,
    width: '100%',
    maxWidth: 300,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonTextSecondary: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default VerifyEmailScreen;