import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Yup from 'yup';
import { API_BASE_URL as BASE_URL } from '../../config/api';

// ---------------------------------------------------------------------------
// Navigation types
// ---------------------------------------------------------------------------
type CommunityStackParamList = {
  Community: undefined;
  PostDetail: { postId: string };
  CreatePost: undefined;
  EditPost: { postId: string; title: string; content: string; category: string; imageUrls?: string[] };
};

type EditPostScreenNavigationProp = StackNavigationProp<CommunityStackParamList, 'EditPost'>;
type EditPostScreenRouteProp = RouteProp<CommunityStackParamList, 'EditPost'>;

interface Props {
  navigation: EditPostScreenNavigationProp;
  route: EditPostScreenRouteProp;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const FORUM_URL = `${BASE_URL}/api/forum`;

const CATEGORIES = [
  { key: 'pest', label: 'Pests', icon: 'bug-outline' },
  { key: 'health', label: 'Health', icon: 'heart-outline' },
  { key: 'growing', label: 'Growing', icon: 'leaf-outline' },
  { key: 'harvest', label: 'Harvest', icon: 'nutrition-outline' },
  { key: 'general', label: 'General', icon: 'grid-outline' },
];

// Profanity word list (matches backend)
const BAD_WORDS = [
  'fuck', 'shit', 'damn', 'ass', 'bitch', 'bastard', 'hell', 'crap',
  'piss', 'dick', 'cock', 'pussy', 'slut', 'whore', 'fag', 'nigger',
  'puta', 'gago', 'putangina', 'tangina', 'tarantado', 'bobo', 'tanga',
  'ulol', 'leche', 'hayop', 'animal', 'peste', 'putang ina', 'tang ina',
  'gago ka', 'tanga ka', 'bobo ka', 'yawa', 'buang', 'ukinam'
];

function containsProfanity(text: string): boolean {
  const lowerText = text.toLowerCase();
  return BAD_WORDS.some(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(lowerText);
  });
}

function findProfanityWords(text: string): string[] {
  const lowerText = text.toLowerCase();
  const foundWords: string[] = [];
  
  BAD_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lowerText)) {
      foundWords.push(word);
    }
  });
  
  return foundWords;
}

// Yup validation schema with profanity checking
const postValidationSchema = Yup.object().shape({
  title: Yup.string()
    .required('Title is required')
    .min(3, 'Title must be at least 3 characters')
    .max(120, 'Title must not exceed 120 characters')
    .test('no-profanity', function(value) {
      if (!value) return true;
      const profanityWords = findProfanityWords(value);
      if (profanityWords.length > 0) {
        return this.createError({
          message: `Title contains inappropriate language: "${profanityWords.join('", ')}"`,
        });
      }
      return true;
    }),
  content: Yup.string()
    .required('Content is required')
    .min(10, 'Content must be at least 10 characters')
    .test('no-profanity', function(value) {
      if (!value) return true;
      const profanityWords = findProfanityWords(value);
      if (profanityWords.length > 0) {
        return this.createError({
          message: `Content contains inappropriate language: "${profanityWords.join('", ')}"`,
        });
      }
      return true;
    }),
  category: Yup.string()
    .required('Category is required')
    .oneOf(['pest', 'health', 'growing', 'harvest', 'general'], 'Invalid category'),
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
const EditPostScreen: React.FC<Props> = ({ navigation, route }) => {
  const { postId, title: initialTitle, content: initialContent, category: initialCategory, imageUrls: initialImageUrls } = route.params;

  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [imageUris, setImageUris] = useState<string[]>([]);  // Multiple new images
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(initialImageUrls || []);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  const clearFieldError = (fieldName: string) => {
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  // -----------------------------------------------------------------------
  // Pick Images (Multiple)
  // -----------------------------------------------------------------------
  const pickImages = async () => {
    const totalImages = imageUris.length + existingImageUrls.length;
    if (totalImages >= 5) {
      Alert.alert('Limit Reached', 'You can only have up to 5 images per post.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'You need to allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      allowsMultipleSelection: true,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map(asset => asset.uri);
      const availableSlots = 5 - totalImages;
      const imagesToAdd = newImages.slice(0, availableSlots);
      setImageUris(prev => [...prev, ...imagesToAdd]);
    }
  };

  const removeNewImage = (index: number) => {
    setImageUris(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  // -----------------------------------------------------------------------
  // Submit Edit with Yup Validation
  // -----------------------------------------------------------------------
  const handleSubmit = async () => {
    // Validate using Yup schema
    try {
      await postValidationSchema.validate(
        {
          title: title.trim(),
          content: content.trim(),
          category: selectedCategory,
        },
        { abortEarly: false }
      );
      
      // Clear validation errors if validation passes
      setValidationErrors({});
    } catch (validationError) {
      if (validationError instanceof Yup.ValidationError) {
        const errors: { [key: string]: string } = {};
        validationError.inner.forEach((err: any) => {
          if (err.path) {
            errors[err.path] = err.message;
          }
        });
        setValidationErrors(errors);
        return; // Stop submission if validation fails
      }
    }

    // Check token
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      Alert.alert('Authentication Required', 'You must be logged in to edit posts.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('content', content.trim());
      formData.append('category', selectedCategory);
      
      // Append new images
      for (const imageUri of imageUris) {
        const imageResponse = await fetch(imageUri);
        const imageBlob = await imageResponse.blob();
        formData.append('images', imageBlob, `post-${Date.now()}.jpg`);
      }
      
      // If all images were removed, tell backend to clear
      if (existingImageUrls.length === 0 && imageUris.length === 0) {
        formData.append('removeImage', 'true');
      }

      const res = await fetch(`${FORUM_URL}/${postId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Server error: ${res.status}`);
      }

      const responseData = await res.json();

      // Success! Navigate back
      navigation.goBack();

      // Show success message
      setTimeout(() => {
        Alert.alert(
          '✅ Success!', 
          'Your post has been updated.',
          [{ text: 'OK' }]
        );
      }, 300);
    } catch (err) {
      console.error('Post update error:', err);

      if (err instanceof TypeError) {
        Alert.alert(
          'Connection Error',
          'Could not connect to the server. Please check your connection.'
        );
      } else {
        Alert.alert(
          'Error',
          err instanceof Error ? err.message : 'Failed to update post. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  const totalImages = imageUris.length + existingImageUrls.length;
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Post</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.formContainer}>
          {/* Title */}
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={[styles.input, validationErrors.title && styles.inputError]}
            placeholder="e.g. Pest Identification Help"
            placeholderTextColor="#999"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              clearFieldError('title');
            }}
            maxLength={120}
            editable={!loading}
          />
          {validationErrors.title && (
            <Text style={styles.errorText}>{validationErrors.title}</Text>
          )}

          {/* Category */}
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat.key && styles.categoryChipActive,
                ]}
                onPress={() => {
                  if (!loading) {
                    setSelectedCategory(cat.key);
                    clearFieldError('category');
                  }
                }}
                disabled={loading}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={16}
                  color={selectedCategory === cat.key ? '#fff' : '#5d873e'}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === cat.key && styles.categoryChipTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {validationErrors.category && (
            <Text style={styles.errorText}>{validationErrors.category}</Text>
          )}

          {/* Content */}
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.contentInput, validationErrors.content && styles.inputError]}
            placeholder="Describe your question or share your experience…"
            placeholderTextColor="#999"
            value={content}
            onChangeText={(text) => {
              setContent(text);
              clearFieldError('content');
            }}
            multiline
            textAlignVertical="top"
            editable={!loading}
          />
          {validationErrors.content && (
            <Text style={styles.errorText}>{validationErrors.content}</Text>
          )}

          {/* Images Section */}
          <Text style={styles.label}>Photos ({totalImages}/5)</Text>
          
          {/* Existing Images */}
          {existingImageUrls.length > 0 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.imagesScrollView}
            >
              {existingImageUrls.map((url, index) => (
                <View key={`existing-${index}`} style={styles.imagePreviewWrapper}>
                  <Image source={{ uri: url }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.imageRemoveButton}
                    onPress={() => removeExistingImage(index)}
                    disabled={loading}
                  >
                    <Ionicons name="close-circle" size={24} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {/* New Images */}
          {imageUris.length > 0 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.imagesScrollView}
            >
              {imageUris.map((uri, index) => (
                <View key={`new-${index}`} style={styles.imagePreviewWrapper}>
                  <Image source={{ uri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.imageRemoveButton}
                    onPress={() => removeNewImage(index)}
                    disabled={loading}
                  >
                    <Ionicons name="close-circle" size={24} color="#e74c3c" />
                  </TouchableOpacity>
                  <View style={styles.newImageBadge}>
                    <Text style={styles.newImageBadgeText}>NEW</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Add Photo Button */}
          {totalImages < 5 && (
            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={pickImages}
              disabled={loading}
            >
              <Ionicons name="camera-outline" size={24} color="#5d873e" />
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </TouchableOpacity>
          )}

          {/* Update Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={[styles.submitText, { marginLeft: 10 }]}>Updating...</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.submitText}>Update Post</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  header: {
    backgroundColor: '#5d873e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },

  scrollView: { flex: 1 },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  formContainer: {
    width: '100%',
    maxWidth: 600,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5d873e',
    marginBottom: 8,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  inputError: {
    borderColor: '#c33',
    borderWidth: 1.5,
  },
  errorText: {
    color: '#c33',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
    marginLeft: 4,
  },
  contentInput: {
    minHeight: 100,
    lineHeight: 20,
    textAlignVertical: 'top',
  },

  categoryRow: { 
    marginBottom: 4,
    flexGrow: 0,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    borderWidth: 1.5,
    borderColor: '#5d873e',
    marginRight: 8,
  },
  categoryChipActive: { backgroundColor: '#5d873e' },
  categoryChipText: { fontSize: 12, fontWeight: '600', color: '#5d873e', marginLeft: 4 },
  categoryChipTextActive: { color: '#fff' },

  // Images
  imagesScrollView: {
    marginBottom: 12,
    flexGrow: 0,
  },
  imagePreviewWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 10,
  },
  imageRemoveButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  newImageBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: '#5d873e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newImageBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8f0',
    borderWidth: 1.5,
    borderColor: '#5d873e',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    marginBottom: 16,
  },
  addPhotoText: {
    fontSize: 14,
    color: '#5d873e',
    fontWeight: '600',
    marginLeft: 8,
  },

  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5d873e',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 10,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '600', marginLeft: 8 },

  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  cancelText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default EditPostScreen;