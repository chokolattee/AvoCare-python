import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Yup from 'yup';
import { API_BASE_URL as BASE_URL } from '../../config/api';
import { styles } from '../../Styles/CommunityScreen.styles';

type CommunityStackParamList = {
  Community: undefined;
  PostDetail: { postId: string };
  CreatePost: undefined;
  EditPost: { postId: string; title: string; content: string; category: string; imageUrls?: string[] };
};

type RootStackParamList = {
  MainTabs: undefined;
  AuthScreen: undefined;
  // Chatbot: undefined;
};

type CommunityScreenNavigationProp = StackNavigationProp<CommunityStackParamList, 'Community'>;
type CommunityScreenRouteProp = RouteProp<CommunityStackParamList, 'Community'>;

interface Props {
  navigation: CommunityScreenNavigationProp;
  route: CommunityScreenRouteProp;
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  username: string;
  user_id?: string;
  author_image?: string;
  category: string;
  imageUrls?: string[];
  likes: number;
  comments_count: number;
  created_at: string;
  updated_at?: string;
  archived?: boolean;
  comments: {
    content: string;
    author_name: string;
    created_at: string;
  }[];
}

const FORUM_URL = `${BASE_URL}/api/forum`;

const categories = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'pest', label: 'Pests', icon: 'bug-outline' },
  { key: 'health', label: 'Health', icon: 'heart-outline' },
  { key: 'growing', label: 'Growing', icon: 'leaf-outline' },
  { key: 'harvest', label: 'Harvest', icon: 'nutrition-outline' },
];

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
          message: `Title contains inappropriate language: "${profanityWords.join('", "')}"`,
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
          message: `Content contains inappropriate language: "${profanityWords.join('", "')}"`,
        });
      }
      return true;
    }),
  category: Yup.string()
    .required('Category is required')
    .oneOf(['pest', 'health', 'growing', 'harvest', 'general'], 'Invalid category'),
});

function timeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'recently';
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 0) return 'just now';
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return days === 1 ? '1 day ago' : `${days} days ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    if (days < 365) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getMonth()]} ${date.getDate()}`;
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  } catch (error) {
    return 'recently';
  }
}

function wasEdited(createdAt: string, updatedAt?: string): boolean {
  if (!updatedAt) return false;
  try {
    const created = new Date(createdAt).getTime();
    const updated = new Date(updatedAt).getTime();
    return Math.abs(updated - created) > 1000;
  } catch {
    return false;
  }
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CommunityScreen: React.FC<Props> = ({ navigation }) => {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [archivedPosts, setArchivedPosts] = useState<ForumPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'archived'>('all');
  
  // CREATE POST STATE
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState<string>('general');
  const [imageUris, setImageUris] = useState<string[]>([]);  // Multiple images
  const [posting, setPosting] = useState(false);
  const [postValidationErrors, setPostValidationErrors] = useState<{ [key: string]: string }>({});
  
  // ARCHIVE CONFIRMATION MODAL STATE
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [postToArchive, setPostToArchive] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    const getUserId = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        const token = await AsyncStorage.getItem('token');
        const isUserLoggedIn = !!token && !!userId;
        
        setCurrentUserId(userId);
        setIsLoggedIn(isUserLoggedIn);
        
        if (!isUserLoggedIn) {
          setCurrentUserId(null);
        }
      } catch (err) {
        console.error('Failed to get user ID:', err);
        setIsLoggedIn(false);
        setCurrentUserId(null);
      }
    };
    getUserId();
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(FORUM_URL, {
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ForumPost[] = await res.json();
      
      setPosts(data.filter(p => !p.archived));
      
      // Fetch archived posts if logged in
      if (isLoggedIn) {
        const token = await AsyncStorage.getItem('token');
        const archivedRes = await fetch(`${FORUM_URL}/archived`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true',
          },
        });
        if (archivedRes.ok) {
          const archivedData = await archivedRes.json();
          setArchivedPosts(archivedData);
        }
      }
      
      const counts: Record<string, number> = {};
      data.forEach((p) => { counts[p.id] = p.likes; });
      setLikeCounts(counts);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      Alert.alert('Error', 'Failed to load posts.');
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => { 
      fetchPosts();
      const checkLoginStatus = async () => {
        try {
          const token = await AsyncStorage.getItem('token');
          const userId = await AsyncStorage.getItem('userId');
          const isUserLoggedIn = !!token && !!userId;
          
          setIsLoggedIn(isUserLoggedIn);
          setCurrentUserId(userId);
          
          if (!isUserLoggedIn) {
            setLikedSet(new Set());
          }
        } catch (error) {
          console.error('Error checking login status:', error);
          setIsLoggedIn(false);
          setCurrentUserId(null);
        }
      };
      checkLoginStatus();
    });
    return unsubscribe;
  }, [navigation, fetchPosts]);

  const pickImages = async () => {
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
      setImageUris(prev => [...prev, ...newImages].slice(0, 5)); // Max 5 images
    }
  };

  const removeImage = (index: number) => {
    setImageUris(prev => prev.filter((_, i) => i !== index));
  };

  const clearPostFieldError = (fieldName: string) => {
    setPostValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const handleCreatePost = async () => {
    // Validate using Yup schema
    try {
      await postValidationSchema.validate(
        {
          title: newPostTitle.trim(),
          content: newPostContent.trim(),
          category: newPostCategory,
        },
        { abortEarly: false }
      );
      
      // Clear validation errors if validation passes
      setPostValidationErrors({});
    } catch (validationError) {
      if (validationError instanceof Yup.ValidationError) {
        const errors: { [key: string]: string } = {};
        validationError.inner.forEach((err: any) => {
          if (err.path) {
            errors[err.path] = err.message;
          }
        });
        setPostValidationErrors(errors);
        return; // Stop submission if validation fails
      }
    }

    const token = await AsyncStorage.getItem('token');
    if (!token) {
      Alert.alert('Authentication Required', 'You must be logged in to create a post.');
      return;
    }

    setPosting(true);
    
    try {
      const formData = new FormData();
      formData.append('title', newPostTitle.trim());
      formData.append('content', newPostContent.trim());
      formData.append('category', newPostCategory);
      
      // Append multiple images
      for (const imageUri of imageUris) {
        const imageResponse = await fetch(imageUri);
        const imageBlob = await imageResponse.blob();
        formData.append('images', imageBlob, `post-${Date.now()}.jpg`);
      }

      const res = await fetch(FORUM_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Server error: ${res.status}`);
      }

      setNewPostTitle('');
      setNewPostContent('');
      setNewPostCategory('general');
      setImageUris([]);
      setPostValidationErrors({});
      setShowCreatePost(false);
      
      await fetchPosts();
      
      Alert.alert(
        '✅ Success!', 
        'Your post has been published to the community.',
        [{ text: 'OK' }]
      );
      
    } catch (err) {
      console.error('Post creation error:', err);
      
      if (err instanceof TypeError) {
        Alert.alert(
          'Connection Error', 
          'Could not connect to the server. Please check your network connection.'
        );
      } else {
        Alert.alert(
          'Error', 
          err instanceof Error ? err.message : 'Failed to create post. Please try again.'
        );
      }
    } finally {
      setPosting(false);
    }
  };

  const handleArchivePost = async (postId: string, postTitle: string) => {
    if (!isLoggedIn) {
      Alert.alert('Login Required', 'Please login to archive posts.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${FORUM_URL}/${postId}/archive`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });

      if (!res.ok) throw new Error('Failed to archive post');

      await fetchPosts();
      Alert.alert('Success', 'Post archived successfully');
    } catch (err) {
      console.error('Archive failed:', err);
      Alert.alert('Error', 'Failed to archive post');
    }
  };

  const handleUnarchivePost = async (postId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${FORUM_URL}/${postId}/unarchive`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });

      if (!res.ok) throw new Error('Failed to unarchive post');

      await fetchPosts();
      Alert.alert('Success', 'Post unarchived successfully');
    } catch (err) {
      console.error('Unarchive failed:', err);
      Alert.alert('Error', 'Failed to unarchive post');
    }
  };

  const handleLike = async (postId: string) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      Alert.alert('Login Required', 'Please login to like posts.');
      return;
    }
    const alreadyLiked = likedSet.has(postId);
    setLikedSet((prev) => {
      const next = new Set(prev);
      alreadyLiked ? next.delete(postId) : next.add(postId);
      return next;
    });
    setLikeCounts((prev) => ({
      ...prev,
      [postId]: (prev[postId] ?? 0) + (alreadyLiked ? -1 : 1),
    }));
    try {
      const res = await fetch(`${FORUM_URL}/${postId}/like`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });
      const data = await res.json();
      setLikeCounts((prev) => ({ ...prev, [postId]: data.likes }));
    } catch (err) {
      setLikedSet((prev) => {
        const next = new Set(prev);
        alreadyLiked ? next.add(postId) : next.delete(postId);
        return next;
      });
      setLikeCounts((prev) => ({
        ...prev,
        [postId]: (prev[postId] ?? 0) + (alreadyLiked ? 1 : -1),
      }));
      console.error('Like request failed:', err);
    }
  };

  const toggleCreatePost = () => {
    if (!isLoggedIn) {
      Alert.alert(
        'Login Required', 
        'Please login to create posts.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Login', 
            onPress: () => navigation.getParent()?.navigate('AuthScreen' as never)
          }
        ]
      );
      return;
    }
    setShowCreatePost(!showCreatePost);
  };

  const getFilteredPosts = () => {
    let postsToFilter: ForumPost[] = [];
    
    if (activeTab === 'all') {
      postsToFilter = posts;
    } else if (activeTab === 'my') {
      postsToFilter = posts.filter(post => post.user_id === currentUserId);
    } else if (activeTab === 'archived') {
      postsToFilter = archivedPosts;
    }
    
    return postsToFilter.filter((post) => {
      const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
      const matchesSearch =
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  };

  const filteredPosts = getFilteredPosts();

  // const handleChatbotPress = () => {
  //   navigation.getParent()?.navigate('Chatbot' as never);
  // };

  const renderPost = (post: ForumPost, showActions: boolean = false) => {
    const edited = wasEdited(post.created_at, post.updated_at);
    const images = post.imageUrls || [];
    
    return (
      <View key={post.id} style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.userAvatar}>
            {post.author_image ? (
              <Image source={{ uri: post.author_image }} style={styles.userAvatarImage} />
            ) : (
              <Ionicons name="person" size={22} color="#5d873e" />
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.username}>{post.username}</Text>
            <View style={styles.timeContainer}>
              <Text style={styles.timeAgo}>
                {timeAgo(edited && post.updated_at ? post.updated_at : post.created_at)}
              </Text>
              {edited && (
                <Text style={styles.editedBadge}>• edited</Text>
              )}
            </View>
          </View>

          {showActions && (
            <View style={styles.postActionsIcons}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() =>
                  navigation.navigate('EditPost', {
                    postId: post.id,
                    title: post.title,
                    content: post.content,
                    category: post.category,
                    imageUrls: images,
                  })
                }
              >
                <Ionicons name="create-outline" size={18} color="#5d873e" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => handleArchivePost(post.id, post.title)}
              >
                <Ionicons name="archive-outline" size={18} color="#ff9800" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
        >
          <View style={styles.postContent}>
            <Text style={styles.postTitle}>{post.title}</Text>
            
            {/* Multiple Images Display */}
            {images.length > 0 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.imagesContainer}
              >
                {images.map((imgUrl, idx) => (
                  <Image 
                    key={idx} 
                    source={{ uri: imgUrl }} 
                    style={[
                      styles.postCardImage,
                      images.length > 1 && styles.postCardImageMultiple
                    ]} 
                  />
                ))}
              </ScrollView>
            )}
            
            <Text style={styles.postText} numberOfLines={3}>
              {post.content}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.postFooter}>
          <TouchableOpacity 
            style={styles.actionItem} 
            onPress={() => handleLike(post.id)}
            disabled={!isLoggedIn}
          >
            <Ionicons
              name={likedSet.has(post.id) ? 'thumbs-up' : 'thumbs-up-outline'}
              size={18}
              color={likedSet.has(post.id) ? '#e74c3c' : '#5d873e'}
              style={!isLoggedIn && styles.disabledIcon}
            />
            <Text style={[styles.actionText, !isLoggedIn && styles.disabledText]}>
              {likeCounts[post.id] ?? post.likes}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
          >
            <Ionicons name="chatbubble-outline" size={18} color="#5d873e" />
            <Text style={styles.actionText}>{post.comments_count}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community Forum</Text>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Ionicons 
            name="globe-outline" 
            size={20} 
            color={activeTab === 'all' ? '#5d873e' : '#999'} 
          />
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All Posts
          </Text>
        </TouchableOpacity>

        {isLoggedIn && (
          <>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'my' && styles.tabActive]}
              onPress={() => setActiveTab('my')}
            >
              <Ionicons 
                name="person-outline" 
                size={20} 
                color={activeTab === 'my' ? '#5d873e' : '#999'} 
              />
              <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>
                My Posts
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'archived' && styles.tabActive]}
              onPress={() => setActiveTab('archived')}
            >
              <Ionicons 
                name="archive-outline" 
                size={20} 
                color={activeTab === 'archived' ? '#ff9800' : '#999'} 
              />
              <Text style={[
                styles.tabText, 
                activeTab === 'archived' && styles.tabTextActive,
                activeTab === 'archived' && styles.tabTextArchived
              ]}>
                Archived
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <ScrollView 
        style={styles.mainContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.centerColumn}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#5d873e" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search posts..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesRow}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryButton,
                  selectedCategory === cat.key && styles.categoryButtonActive,
                ]}
                onPress={() => setSelectedCategory(cat.key)}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={14}
                  color={selectedCategory === cat.key ? '#fff' : '#5d873e'}
                />
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === cat.key && styles.categoryTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {(activeTab === 'all' || activeTab === 'my') && (
            <TouchableOpacity
              style={styles.createPostToggle}
              onPress={toggleCreatePost}
            >
              <View style={styles.createPostToggleContent}>
                <Ionicons name="add-circle" size={20} color="#5d873e" />
                <Text style={styles.createPostPlaceholder}>
                  {showCreatePost ? 'Cancel' : 'Create New Post'}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {showCreatePost && (activeTab === 'all' || activeTab === 'my') && (
            <View style={styles.createPostForm}>
              <View style={styles.createPostHeader}>
                <Text style={styles.createPostHeaderText}>New Post</Text>
                <TouchableOpacity onPress={() => setShowCreatePost(false)}>
                  <Ionicons name="close" size={22} color="#666" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.postTitleInput}
                placeholder="Post title..."
                placeholderTextColor="#999"
                value={newPostTitle}
                onChangeText={(text) => {
                  setNewPostTitle(text);
                  clearPostFieldError('title');
                }}
                maxLength={120}
                editable={!posting}
              />
              {postValidationErrors.title && (
                <Text style={styles.postErrorText}>{postValidationErrors.title}</Text>
              )}

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.postCategoryRow}
              >
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.postCategoryChip,
                      newPostCategory === cat.key && styles.postCategoryChipActive,
                    ]}
                    onPress={() => !posting && setNewPostCategory(cat.key)}
                    disabled={posting}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={12}
                      color={newPostCategory === cat.key ? '#fff' : '#5d873e'}
                    />
                    <Text
                      style={[
                        styles.postCategoryChipText,
                        newPostCategory === cat.key && styles.postCategoryChipTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {postValidationErrors.category && (
                <Text style={styles.postErrorText}>{postValidationErrors.category}</Text>
              )}

              <TextInput
                style={styles.postContentInput}
                placeholder="Share your thoughts..."
                placeholderTextColor="#999"
                value={newPostContent}
                onChangeText={(text) => {
                  setNewPostContent(text);
                  clearPostFieldError('content');
                }}
                multiline
                textAlignVertical="top"
                editable={!posting}
              />
              {postValidationErrors.content && (
                <Text style={styles.postErrorText}>{postValidationErrors.content}</Text>
              )}

              {/* Multiple Images Preview */}
              {imageUris.length > 0 && (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.imagePreviewsContainer}
                >
                  {imageUris.map((uri, index) => (
                    <View key={index} style={styles.imagePreviewWrapper}>
                      <Image source={{ uri }} style={styles.imagePreviewSmall} />
                      <TouchableOpacity
                        style={styles.imageRemoveButton}
                        onPress={() => removeImage(index)}
                      >
                        <Ionicons name="close-circle" size={22} color="#e74c3c" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}

              <View style={styles.postActions}>
                <TouchableOpacity
                  style={styles.addPhotoButton}
                  onPress={pickImages}
                  disabled={posting || imageUris.length >= 5}
                >
                  <Ionicons name="image-outline" size={18} color="#5d873e" />
                  <Text style={styles.addPhotoText}>
                    {imageUris.length}/5
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.postSubmitButton, posting && styles.postSubmitButtonDisabled]}
                  onPress={handleCreatePost}
                  disabled={posting}
                >
                  {posting ? (
                    <>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={[styles.postSubmitText, { marginLeft: 8 }]}>Posting...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="send" size={16} color="#fff" />
                      <Text style={styles.postSubmitText}>Post</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#5d873e" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.postsContainer}>
              {!isLoggedIn && (activeTab === 'my' || activeTab === 'archived') ? (
                <View style={styles.loginPrompt}>
                  <Ionicons name="information-circle-outline" size={28} color="#5d873e" />
                  <Text style={styles.loginPromptText}>
                    Login to view your posts
                  </Text>
                  <TouchableOpacity
                    style={styles.loginPromptButton}
                    onPress={() => navigation.getParent()?.navigate('AuthScreen' as never)}
                  >
                    <Text style={styles.loginPromptButtonText}>Login Now</Text>
                  </TouchableOpacity>
                </View>
              ) : filteredPosts.length === 0 ? (
                <Text style={styles.emptyText}>
                  {activeTab === 'archived' 
                    ? 'No archived posts.' 
                    : activeTab === 'my'
                    ? "You haven't created any posts yet."
                    : 'No posts found.'}
                </Text>
              ) : (
                filteredPosts.map((post) => {
                  const showActions = activeTab === 'my';
                  const showUnarchive = activeTab === 'archived';
                  
                  return (
                    <View key={post.id}>
                      {renderPost(post, showActions)}
                      {showUnarchive && (
                        <TouchableOpacity
                          style={styles.unarchiveButton}
                          onPress={() => handleUnarchivePost(post.id)}
                        >
                          <Ionicons name="arrow-undo" size={16} color="#fff" />
                          <Text style={styles.unarchiveButtonText}>Unarchive</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* <TouchableOpacity style={styles.chatbotButton} onPress={handleChatbotPress}>
        <Ionicons name="chatbubbles" size={28} color="#fff" />
        <View style={styles.chatbotBadge}>
          <Ionicons name="sparkles" size={12} color="#5d873e" />
        </View>
      </TouchableOpacity> */}
    </SafeAreaView>
  );
};

export default CommunityScreen;