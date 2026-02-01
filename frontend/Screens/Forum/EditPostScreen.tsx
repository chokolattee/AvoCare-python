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
import { API_BASE_URL as BASE_URL } from '../../config/api';

// ---------------------------------------------------------------------------
// Navigation types
// ---------------------------------------------------------------------------
type CommunityStackParamList = {
  Community: undefined;
  PostDetail: { postId: string };
  CreatePost: undefined;
  EditPost: { postId: string; title: string; content: string; category: string; imageUrl?: string };
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

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
const EditPostScreen: React.FC<Props> = ({ navigation, route }) => {
  const { postId, title: initialTitle, content: initialContent, category: initialCategory, imageUrl: initialImageUrl } = route.params;

  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  // imageUri: a newly picked local image; imageUrl: existing remote image from the server
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(initialImageUrl ?? null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [loading, setLoading] = useState(false);

  // -----------------------------------------------------------------------
  // Pick Image
  // -----------------------------------------------------------------------
  const pickImage = async () => {
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
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
      // A new pick replaces any existing server image
      setExistingImageUrl(null);
      setRemoveExistingImage(false);
    }
  };

  // -----------------------------------------------------------------------
  // Submit Edit
  // -----------------------------------------------------------------------
  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your post.');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Missing Content', 'Please enter some content for your post.');
      return;
    }

    // Check token
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      Alert.alert('Authentication Required', 'You must be logged in to edit posts.');
      return;
    }

    setLoading(true);

    try {
      let res: Response;

      if (imageUri) {
        // --- new image selected → multipart ---
        // Fetch the local URI into a real Blob so it works on react-native-web
        const imageResponse = await fetch(imageUri);
        const imageBlob = await imageResponse.blob();

        const formData = new FormData();
        formData.append('title', title.trim());
        formData.append('content', content.trim());
        formData.append('category', selectedCategory);
        formData.append('image', imageBlob, 'post.jpg');

        res = await fetch(`${FORUM_URL}/${postId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
      } else {
        // --- JSON (no new image, or explicitly removing it) ---
        const body: Record<string, any> = {
          title: title.trim(),
          content: content.trim(),
          category: selectedCategory,
        };
        // Tell backend to clear the image when the user tapped "Remove"
        if (removeExistingImage) {
          body.removeImage = true;
        }

        res = await fetch(`${FORUM_URL}/${postId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Server error: ${res.status}`);
      }

      // Success! Navigate back
      navigation.goBack();

      // Show success message
      setTimeout(() => {
        Alert.alert('✅ Success!', 'Your post has been updated.', [{ text: 'OK' }]);
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

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Title */}
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Pest Identification Help"
          placeholderTextColor="#999"
          value={title}
          onChangeText={setTitle}
          maxLength={120}
          editable={!loading}
        />

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
              onPress={() => !loading && setSelectedCategory(cat.key)}
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

        {/* Image Upload */}
        <Text style={styles.label}>Photo (optional)</Text>
        {/* Priority: new pick > existing server image > empty placeholder */}
        {imageUri ? (
          <View style={styles.imagePreviewWrapper}>
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            <TouchableOpacity
              style={styles.imageRemoveButton}
              onPress={() => setImageUri(null)}
            >
              <Ionicons name="close-circle" size={26} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        ) : existingImageUrl && !removeExistingImage ? (
          <View style={styles.imagePreviewWrapper}>
            <Image source={{ uri: existingImageUrl }} style={styles.imagePreview} />
            <TouchableOpacity
              style={styles.imageRemoveButton}
              onPress={() => {
                setExistingImageUrl(null);
                setRemoveExistingImage(true);
              }}
            >
              <Ionicons name="close-circle" size={26} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.imagePlaceholder}
            onPress={pickImage}
            disabled={loading}
          >
            <Ionicons name="camera-outline" size={32} color="#5d873e" />
            <Text style={styles.imagePlaceholderText}>Tap to add a photo</Text>
          </TouchableOpacity>
        )}

        {/* Content */}
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.contentInput]}
          placeholder="Describe your question or share your experience…"
          placeholderTextColor="#999"
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          editable={!loading}
        />

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

  scrollView: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5d873e',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e8e8e8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    marginBottom: 20,
  },
  contentInput: {
    minHeight: 160,
    lineHeight: 22,
  },

  categoryRow: { marginBottom: 20 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#5d873e',
    marginRight: 8,
  },
  categoryChipActive: { backgroundColor: '#5d873e' },
  categoryChipText: { fontSize: 13, fontWeight: '600', color: '#5d873e', marginLeft: 5 },
  categoryChipTextActive: { color: '#fff' },

  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5d873e',
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    marginBottom: 12,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },

  cancelButton: {
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 40,
  },
  cancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },

  // --- image picker ---
  imagePlaceholder: {
    borderWidth: 2,
    borderColor: '#5d873e',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8f0',
    marginBottom: 20,
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: '#5d873e',
    fontWeight: '600',
    marginTop: 6,
  },
  imagePreviewWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    objectFit: 'cover',
  },
  imageRemoveButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 13,
  },
});

export default EditPostScreen;