import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Image,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Yup from 'yup';
import { API_BASE_URL } from '../../config/api';

const API_URL = `${API_BASE_URL}/api/users/`;
const PRIMARY_COLOR = '#3d4d3d';

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
  name: Yup.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .required('Full name is required'),
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
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [formActive, setFormActive] = useState<'login' | 'register'>('login');
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register fields
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [image, setImage] = useState<string | null>(null);

  // Clear validation error for specific field
  const clearFieldError = (fieldName: string) => {
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  // Pick image from gallery
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // Login handler with validation
  const handleLogin = async () => {
    setError('');
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

        // ============================================
        // CRITICAL FIX: Store auth data and trigger event
        // ============================================
        // Store all variations to ensure compatibility
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
          email: userData.email
        });

        // Dispatch event to notify Header and other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('authChange'));
        }
        // ============================================
        
        // Close modal and navigate to home
        navigation.goBack();
        
        // Show success message after a short delay
        setTimeout(() => {
          Alert.alert('Success', `Welcome back, ${userData.name}!`);
        }, 300);
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
      } else if (err.code === 'ERR_NETWORK') {
        errorMsg = 'Cannot connect to server. Please check your connection.';
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Register handler with validation
  const handleRegister = async () => {
    setError('');
    setValidationErrors({});

    try {
      // Validate form
      await registerSchema.validate(
        {
          name: registerName,
          email: registerEmail,
          password: registerPassword,
          confirmPassword: registerConfirmPassword,
        },
        { abortEarly: false }
      );

      setLoading(true);

      console.log('📝 Registering to:', `${API_URL}register`);
      
      const formData = new FormData();
      formData.append('name', registerName.trim());
      formData.append('email', registerEmail.toLowerCase().trim());
      formData.append('password', registerPassword);
      formData.append('role', 'user');
      
      if (image) {
        console.log('📸 Processing image:', image);
        
        let fileName: string;
        let fileType: string;
        
        if (Platform.OS === 'web' || image.startsWith('blob:')) {
          fileName = `photo_${Date.now()}.jpg`;
          fileType = 'jpg';
          console.log('🌐 Web platform - using default jpg extension');
        } else {
          const uriParts = image.split('.');
          fileType = uriParts[uriParts.length - 1];
          fileName = `photo_${Date.now()}.${fileType}`;
          console.log('📱 Mobile platform - extracted extension:', fileType);
        }
        
        const mimeType = `image/${fileType === 'jpg' ? 'jpeg' : fileType}`;
        console.log('File details:', { fileName, fileType, mimeType });
        
        if (Platform.OS === 'web' || image.startsWith('blob:')) {
          console.log('Converting blob to File object...');
          
          try {
            const response = await fetch(image);
            const blob = await response.blob();
            const file = new File([blob], fileName, { type: mimeType });
            formData.append('image', file);
            console.log('✅ Web: File appended', { name: file.name, type: file.type, size: file.size });
          } catch (blobError) {
            console.error('❌ Blob conversion error:', blobError);
            throw new Error('Failed to process image');
          }
        } else {
          console.log('Using React Native FormData format...');
          formData.append('image', {
            uri: image,
            type: mimeType,
            name: fileName,
          } as any);
          console.log('✅ Mobile: Image appended');
        }
      }

      console.log('📤 Sending registration request...');

      const response = await fetch(`${API_URL}register`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();
      console.log('📥 Registration response:', data);

      if (data.success) {
        // Switch to login form
        setFormActive('login');
        
        // Pre-fill login email
        setLoginEmail(registerEmail);
        
        // Clear register form
        setRegisterEmail('');
        setRegisterName('');
        setRegisterPassword('');
        setRegisterConfirmPassword('');
        setImage(null);
        setError('');
        setValidationErrors({});
        
        // Show success message
        Alert.alert(
          '✅ Success!',
          'Registration successful! Please log in with your credentials.',
          [{ text: 'OK' }]
        );
      } else {
        setError(data.message || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      console.error('❌ Register error:', err);
      
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
      let errorMsg = 'Registration failed. Please try again.';
      if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setLoginEmail('');
    setLoginPassword('');
    setRegisterEmail('');
    setRegisterName('');
    setRegisterPassword('');
    setRegisterConfirmPassword('');
    setImage(null);
    setError('');
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
              </View>
            ) : null}

            {/* Register Form */}
            {formActive === 'register' ? (
              <View style={styles.formPanel}>
                {/* Image picker */}
                <View style={styles.imageOuterContainer}>
                  <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
                    {image ? (
                      <Image source={{ uri: image }} style={styles.image} />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Ionicons name="camera" size={40} color="#999" />
                        <Text style={styles.imagePlaceholderText}>Add Photo</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={[
                      styles.input,
                      validationErrors.name && styles.inputError
                    ]}
                    placeholder="Enter your full name"
                    value={registerName}
                    onChangeText={(text) => {
                      setRegisterName(text);
                      clearFieldError('name');
                    }}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                  {validationErrors.name ? (
                    <Text style={styles.errorTextSmall}>{validationErrors.name}</Text>
                  ) : null}
                </View>

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
              </View>
            ) : null}
            </View>
          </KeyboardAwareScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 450,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  scrollContent: {
    padding: 40,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 0,
  },
  logo: {
    width: 250,
    height: 100,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
  errorContainer: {
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#c33',
  },
  errorText: {
    color: '#c33',
    fontSize: 14,
    flex: 1,
  },
  errorTextSmall: {
    color: '#c33',
    fontSize: 12,
    marginTop: 4,
  },
  formSelection: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 30,
  },
  selectionButton: {
    flex: 1,
    padding: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
  },
  selectionButtonActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  selectionButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  selectionButtonTextActive: {
    color: '#fff',
  },
  formPanel: {
    marginBottom: 20,
  },
  imageOuterContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: PRIMARY_COLOR,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: '#999',
    fontSize: 12,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: PRIMARY_COLOR,
    marginBottom: 8,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: PRIMARY_COLOR,
    paddingVertical: 8,
    paddingHorizontal: 0,
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  inputError: {
    borderBottomColor: '#c33',
  },
  submitButton: {
    backgroundColor: PRIMARY_COLOR,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default AuthScreen;