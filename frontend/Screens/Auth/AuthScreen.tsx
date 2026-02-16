import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Yup from 'yup';
import { API_BASE_URL } from '../../config/api';
import { signInWithGoogle, createUserWithEmail } from '../../Firebase/auth';
import { auth } from '../../Firebase/firebase';
import { styles } from '../../Styles/AuthScreen.styles';

const API_URL = `${API_BASE_URL}/api/users/`;

// Define navigation types
type RootStackParamList = {
  MainTabs: {
    screen?: string;
  } | undefined;
  Admin: undefined;
  AuthScreen: {
    emailVerified?: boolean;
    message?: string;
  } | undefined;
};

type AuthScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AuthScreen'>;
type AuthScreenRouteProp = RouteProp<RootStackParamList, 'AuthScreen'>;

// Validation Schemas
const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

const registerSchema = Yup.object().shape({
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
});

interface ValidationErrors {
  [key: string]: string;
}

const AuthScreen: React.FC = () => {
  const navigation = useNavigation<AuthScreenNavigationProp>();
  const route = useRoute<AuthScreenRouteProp>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [formActive, setFormActive] = useState<'login' | 'register'>('login');
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register fields
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

  // Check for email verification success message
  useEffect(() => {
    if (route.params?.emailVerified && route.params?.message) {
      setSuccessMessage(route.params.message);
      setFormActive('login');
      
      // Clear message after showing
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    }
  }, [route.params]);

  // Clear validation error for specific field
  const clearFieldError = (fieldName: string) => {
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  // Store auth data helper
  const storeAuthData = async (userData: any, token: string) => {
    await AsyncStorage.multiSet([
      ['token', token],
      ['jwt', token],
      ['user', JSON.stringify(userData)],
      ['userId', userData.id],
      ['username', userData.name]
    ]);

    console.log('✅ Stored auth data:', {
      userId: userData.id,
      username: userData.name,
      email: userData.email,
      role: userData.role
    });
  };

  // Navigate after login helper - FIXED to use proper nested navigation
  const navigateAfterLogin = (userData: any) => {
    if (userData.role === 'admin') {
      // Navigate to Admin screen for admin users
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Admin' }],
        })
      );
      setTimeout(() => {
        Alert.alert('Success', `Welcome back, Admin ${userData.name}!`);
      }, 300);
    } else {
      // Navigate to Home screen (nested inside MainTabs) for regular users
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'MainTabs',
              params: { screen: 'Home' },
            },
          ],
        })
      );
      setTimeout(() => {
        Alert.alert('Success', `Welcome back, ${userData.name}!`);
      }, 300);
    }
  };

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    
    try {
      console.log('🔐 Starting Google Sign-In...');
      
      // Sign in with Firebase
      const firebaseUser = await signInWithGoogle();
      
      if (!firebaseUser) {
        setError('Google sign-in was cancelled');
        setLoading(false);
        return;
      }
      
      console.log('✅ Firebase user:', firebaseUser.email);
      
      // Get Firebase ID token
      const idToken = await firebaseUser.getIdToken();
      
      // Login/Register in backend
      const response = await axios.post(`${API_URL}login`, {
        email: firebaseUser.email,
        firebase_uid: firebaseUser.uid,
        id_token: idToken,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
        photo_url: firebaseUser.photoURL || '',
      });
      
      console.log('✅ Backend response:', response.data);
      
      if (response.data.success && response.data.token) {
        const userData = response.data.user;
        const token = response.data.token;
        
        await storeAuthData(userData, token);
        navigateAfterLogin(userData);
      } else {
        setError('Google sign-in failed. Please try again.');
      }
    } catch (err: any) {
      console.error('❌ Google Sign-In error:', err);
      
      let errorMsg = 'Google sign-in failed. Please try again.';
      
      if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.code === 'auth/popup-closed-by-user') {
        errorMsg = 'Sign-in was cancelled';
      } else if (err.code === 'ERR_NETWORK') {
        errorMsg = 'Cannot connect to server';
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Login handler with validation
  const handleLogin = async () => {
    setError('');
    setSuccessMessage('');
    setValidationErrors({});

    try {
      // Validate form
      await loginSchema.validate(
        {
          email: loginEmail,
          password: loginPassword,
        },
        { abortEarly: false }
      );

      setLoading(true);

      console.log('🔐 Logging in to:', `${API_URL}login`);
      
      const response = await axios.post(`${API_URL}login`, {
        email: loginEmail.toLowerCase().trim(),
        password: loginPassword,
      });

      console.log('✅ Login response:', response.data);

      if (response.data.success && response.data.token) {
        const userData = response.data.user;
        const token = response.data.token;

        await storeAuthData(userData, token);
        navigateAfterLogin(userData);
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err: any) {
      console.error('❌ Login error:', err);
      
      // Handle validation errors
      if (err.name === 'ValidationError') {
        const errors: ValidationErrors = {};
        err.inner.forEach((error: any) => {
          if (error.path) {
            errors[error.path] = error.message;
          }
        });
        setValidationErrors(errors);
        return;
      }
      
      // Handle API errors
      let errorMsg = 'Login failed. Please try again.';
      if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
        
        // Special handling for email verification
        if (err.response?.data?.needs_verification) {
          Alert.alert(
            'Email Not Verified',
            'Please verify your email before logging in. Check your inbox for the verification link.',
            [
              { text: 'OK' },
              {
                text: 'Resend Email',
                onPress: () => handleResendVerification(loginEmail)
              }
            ]
          );
          setLoading(false);
          return;
        }
      } else if (err.code === 'ERR_NETWORK') {
        errorMsg = 'Cannot connect to server. Please check your connection.';
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Register handler with Firebase
  const handleRegister = async () => {
    setError('');
    setSuccessMessage('');
    setValidationErrors({});

    try {
      // Validate form
      await registerSchema.validate(
        {
          email: registerEmail,
          password: registerPassword,
          confirmPassword: registerConfirmPassword,
        },
        { abortEarly: false }
      );

      setLoading(true);

      // Create user in Firebase
      console.log('🔐 Creating Firebase user...');
      const firebaseUser = await createUserWithEmail(registerEmail, registerPassword);
      
      if (!firebaseUser) {
        setError('Registration failed. Please try again.');
        setLoading(false);
        return;
      }
      
      console.log('✅ Firebase user created:', firebaseUser.uid);

      // Register in backend
      const response = await axios.post(`${API_URL}register`, {
        email: registerEmail.toLowerCase().trim(),
        password: registerPassword,
        firebase_uid: firebaseUser.uid,
        auth_provider: 'email',
        role: 'user',
      });

      console.log('✅ Backend registration response:', response.data);

      if (response.data.success) {
        // Clear form and switch to login
        setFormActive('login');
        setLoginEmail(registerEmail);
        setRegisterEmail('');
        setRegisterPassword('');
        setRegisterConfirmPassword('');
        setError('');
        setValidationErrors({});
        
        Alert.alert(
          '✅ Success!',
          'Registration successful! Please check your email to verify your account before logging in.',
          [{ text: 'OK' }]
        );
      } else {
        setError(response.data.message || 'Registration failed.');
      }
    } catch (err: any) {
      console.error('❌ Register error:', err);
      
      if (err.name === 'ValidationError') {
        const errors: ValidationErrors = {};
        err.inner.forEach((error: any) => {
          if (error.path) {
            errors[error.path] = error.message;
          }
        });
        setValidationErrors(errors);
        return;
      }
      
      let errorMsg = 'Registration failed. Please try again.';
      
      if (err.code === 'auth/email-already-in-use') {
        errorMsg = 'Email is already registered';
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Resend verification email
  const handleResendVerification = async (email: string) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}resend-verification`, {
        email: email.toLowerCase().trim(),
      });

      if (response.data.success) {
        Alert.alert('Success', 'Verification email sent! Please check your inbox.');
      } else {
        Alert.alert('Error', response.data.message || 'Failed to send verification email.');
      }
    } catch (err: any) {
      console.error('❌ Resend verification error:', err);
      Alert.alert('Error', 'Failed to send verification email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setLoginEmail('');
    setLoginPassword('');
    setRegisterEmail('');
    setRegisterPassword('');
    setRegisterConfirmPassword('');
    setError('');
    setSuccessMessage('');
    setValidationErrors({});
  };

  const handleFormSwitch = (formType: 'login' | 'register') => {
    setFormActive(formType);
    resetForm();
  };

  return (
    <Modal visible={true} animationType="fade" transparent={true}>
      <Pressable style={styles.modalBackground} onPress={() => navigation.goBack()}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <KeyboardAwareScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View>
              {/* Logo */}
              <View style={styles.logoContainer}>
                <Image
                  source={require('../../assets/logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.divider} />

              {/* Success message */}
              {successMessage ? (
                <View style={styles.successContainer}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={{ marginRight: 8 }} />
                  <Text style={styles.successText}>{successMessage}</Text>
                </View>
              ) : null}

              {/* Error message */}
              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color="#c33" style={{ marginRight: 8 }} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Form switcher */}
              <View style={styles.formSelection}>
                <TouchableOpacity
                  style={[
                    styles.selectionButton,
                    formActive === 'login' && styles.selectionButtonActive,
                  ]}
                  onPress={() => handleFormSwitch('login')}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.selectionButtonText,
                      formActive === 'login' && styles.selectionButtonTextActive,
                    ]}
                  >
                    Sign In
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.selectionButton,
                    formActive === 'register' && styles.selectionButtonActive,
                  ]}
                  onPress={() => handleFormSwitch('register')}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.selectionButtonText,
                      formActive === 'register' && styles.selectionButtonTextActive,
                    ]}
                  >
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Login Form */}
              {formActive === 'login' ? (
                <View style={styles.formPanel}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={[
                        styles.input,
                        validationErrors.email && styles.inputError
                      ]}
                      placeholder="Enter your email"
                      value={loginEmail}
                      onChangeText={(text) => {
                        setLoginEmail(text);
                        clearFieldError('email');
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!loading}
                    />
                    {validationErrors.email ? (
                      <Text style={styles.errorTextSmall}>{validationErrors.email}</Text>
                    ) : null}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <TextInput
                      style={[
                        styles.input,
                        validationErrors.password && styles.inputError
                      ]}
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChangeText={(text) => {
                        setLoginPassword(text);
                        clearFieldError('password');
                      }}
                      secureTextEntry
                      editable={!loading}
                    />
                    {validationErrors.password ? (
                      <Text style={styles.errorTextSmall}>{validationErrors.password}</Text>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    style={[styles.submitButton, loading && styles.buttonDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText}>Login</Text>
                    )}
                  </TouchableOpacity>

                  {/* Divider */}
                  <View style={styles.orDivider}>
                    <View style={styles.orDividerLine} />
                    <Text style={styles.orDividerText}>OR</Text>
                    <View style={styles.orDividerLine} />
                  </View>

                  {/* Google Sign-In Button */}
                  <TouchableOpacity
                    style={[styles.googleButton, loading && styles.buttonDisabled]}
                    onPress={handleGoogleSignIn}
                    disabled={loading}
                  >
                    <Ionicons name="logo-google" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.googleButtonText}>Sign in with Google</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Register Form */}
              {formActive === 'register' ? (
                <View style={styles.formPanel}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={[
                        styles.input,
                        validationErrors.email && styles.inputError
                      ]}
                      placeholder="Enter your email"
                      value={registerEmail}
                      onChangeText={(text) => {
                        setRegisterEmail(text);
                        clearFieldError('email');
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!loading}
                    />
                    {validationErrors.email ? (
                      <Text style={styles.errorTextSmall}>{validationErrors.email}</Text>
                    ) : null}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <TextInput
                      style={[
                        styles.input,
                        validationErrors.password && styles.inputError
                      ]}
                      placeholder="Enter your password"
                      value={registerPassword}
                      onChangeText={(text) => {
                        setRegisterPassword(text);
                        clearFieldError('password');
                      }}
                      secureTextEntry
                      editable={!loading}
                    />
                    {validationErrors.password ? (
                      <Text style={styles.errorTextSmall}>{validationErrors.password}</Text>
                    ) : null}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Confirm Password</Text>
                    <TextInput
                      style={[
                        styles.input,
                        validationErrors.confirmPassword && styles.inputError
                      ]}
                      placeholder="Confirm your password"
                      value={registerConfirmPassword}
                      onChangeText={(text) => {
                        setRegisterConfirmPassword(text);
                        clearFieldError('confirmPassword');
                      }}
                      secureTextEntry
                      editable={!loading}
                    />
                    {validationErrors.confirmPassword ? (
                      <Text style={styles.errorTextSmall}>{validationErrors.confirmPassword}</Text>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    style={[styles.submitButton, loading && styles.buttonDisabled]}
                    onPress={handleRegister}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText}>Sign Up</Text>
                    )}
                  </TouchableOpacity>

                  {/* Divider */}
                  <View style={styles.orDivider}>
                    <View style={styles.orDividerLine} />
                    <Text style={styles.orDividerText}>OR</Text>
                    <View style={styles.orDividerLine} />
                  </View>

                  {/* Google Sign-In Button */}
                  <TouchableOpacity
                    style={[styles.googleButton, loading && styles.buttonDisabled]}
                    onPress={handleGoogleSignIn}
                    disabled={loading}
                  >
                    <Ionicons name="logo-google" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.googleButtonText}>Sign up with Google</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </KeyboardAwareScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default AuthScreen;