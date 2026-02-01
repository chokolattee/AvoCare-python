import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL as BASE_URL } from '../../config/api';

type CommunityStackParamList = {
  Community: undefined;
  PostDetail: { postId: string };
  CreatePost: undefined;
  EditPost: { postId: string; title: string; content: string; category: string; imageUrl?: string };
};

type RootStackParamList = {
  MainTabs: undefined;
  AuthScreen: undefined;
  Chatbot: undefined;
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
  category: string;
  imageUrl?: string;
  likes: number;
  comments_count: number;
  created_at: string;
  updated_at?: string;
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

const CommunityScreen: React.FC<Props> = ({ navigation }) => {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // DELETE CONFIRMATION MODAL STATE
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    const getUserId = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        setCurrentUserId(userId);
      } catch (err) {
        console.error('Failed to get user ID:', err);
      }
    };
    getUserId();
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(FORUM_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ForumPost[] = await res.json();
      setPosts(data);
      const counts: Record<string, number> = {};
      data.forEach((p) => { counts[p.id] = p.likes; });
      setLikeCounts(counts);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      Alert.alert('Error', 'Failed to load posts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => { fetchPosts(); });
    return unsubscribe;
  }, [navigation, fetchPosts]);

  // Show the delete confirmation modal
  const handleDeletePost = (postId: string, postTitle: string) => {
    setPostToDelete({ id: postId, title: postTitle });
    setShowDeleteModal(true);
  };

  // Actually delete the post
  const confirmDelete = async () => {
    if (!postToDelete) return;

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setShowDeleteModal(false);
        Alert.alert('Error', 'You must be logged in to delete posts.');
        return;
      }

      const res = await fetch(`${FORUM_URL}/${postToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = 'Failed to delete post';
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.message || error.error || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      setPosts((prev) => prev.filter((p) => p.id !== postToDelete.id));
      setShowDeleteModal(false);
      setPostToDelete(null);
      Alert.alert('Success', 'Post deleted successfully');
    } catch (err) {
      console.error('Delete failed:', err);
      setShowDeleteModal(false);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete post');
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setPostToDelete(null);
  };

  const handleLike = async (postId: string) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      console.warn('Not logged in – cannot like.');
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

  const filteredPosts = posts.filter((post) => {
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleChatbotPress = () => {
    navigation.getParent()?.navigate('Chatbot' as never);
  };

  const isOwnPost = (post: ForumPost): boolean => {
    return currentUserId !== null && post.user_id === currentUserId;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Community Forum</Text>
          <Text style={styles.headerSubtitle}>Connect with fellow avocado farmers</Text>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#5d873e" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search posts..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <View style={styles.categoriesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContent}>
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
                  size={18}
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
        </View>

        <View style={styles.createPostContainer}>
          <TouchableOpacity
            style={styles.createPostButton}
            onPress={() => navigation.navigate('CreatePost')}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.createPostText}>Create New Post</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#5d873e" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.postsContainer}>
            {filteredPosts.length === 0 ? (
              <Text style={styles.emptyText}>No posts found.</Text>
            ) : (
              filteredPosts.map((post) => {
                const edited = wasEdited(post.created_at, post.updated_at);
                
                return (
                  <View key={post.id} style={styles.postCard}>
                    <View style={styles.postHeader}>
                      <View style={styles.userAvatar}>
                        <Ionicons name="person" size={24} color="#5d873e" />
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

                      {isOwnPost(post) && (
                        <View style={styles.postActions}>
                          <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() =>
                              navigation.navigate('EditPost', {
                                postId: post.id,
                                title: post.title,
                                content: post.content,
                                category: post.category,
                                imageUrl: post.imageUrl,
                              })
                            }
                          >
                            <Ionicons name="create-outline" size={20} color="#5d873e" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => handleDeletePost(post.id, post.title)}
                          >
                            <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    <TouchableOpacity
                      onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
                    >
                      <View style={styles.postContent}>
                        <Text style={styles.postTitle}>{post.title}</Text>
                        {post.imageUrl && (
                          <Image source={{ uri: post.imageUrl }} style={styles.postCardImage} />
                        )}
                        <Text style={styles.postText} numberOfLines={2}>
                          {post.content}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.postFooter}>
                      <TouchableOpacity style={styles.actionItem} onPress={() => handleLike(post.id)}>
                        <Ionicons
                          name={likedSet.has(post.id) ? 'thumbs-up' : 'thumbs-up-outline'}
                          size={20}
                          color={likedSet.has(post.id) ? '#e74c3c' : '#5d873e'}
                        />
                        <Text style={styles.actionText}>{likeCounts[post.id] ?? post.likes}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionItem}
                        onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
                      >
                        <Ionicons name="chatbubble-outline" size={20} color="#5d873e" />
                        <Text style={styles.actionText}>{post.comments_count}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <TouchableOpacity style={styles.chatbotButton} onPress={handleChatbotPress}>
        <Ionicons name="chatbubbles" size={28} color="#fff" />
        <View style={styles.chatbotBadge}>
          <Ionicons name="sparkles" size={12} color="#5d873e" />
        </View>
      </TouchableOpacity>

      {/* CUSTOM DELETE CONFIRMATION MODAL - ALWAYS ON TOP */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={48} color="#e74c3c" />
              <Text style={styles.modalTitle}>Delete Post</Text>
            </View>
            
            <Text style={styles.modalMessage}>
              Are you sure you want to delete "{postToDelete?.title}"?
            </Text>
            <Text style={styles.modalWarning}>
              This action cannot be undone.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelDelete}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#5d873e',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: '#d4e5cc' },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#e8e8e8',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },
  categoriesContainer: { marginTop: 8, backgroundColor: '#fff' },
  categoriesContent: { paddingHorizontal: 16, paddingVertical: 12 },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#5d873e',
  },
  categoryButtonActive: { backgroundColor: '#5d873e', borderColor: '#5d873e' },
  categoryText: { fontSize: 14, fontWeight: '600', color: '#5d873e', marginLeft: 6 },
  categoryTextActive: { color: '#fff' },
  createPostContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5d873e',
    paddingVertical: 14,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  createPostText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  postsContainer: { paddingHorizontal: 16, paddingTop: 16 },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#5d873e',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#5d873e',
  },
  userInfo: { marginLeft: 12, flex: 1 },
  username: { fontSize: 15, fontWeight: '600', color: '#5d873e', marginBottom: 2 },
  timeContainer: { flexDirection: 'row', alignItems: 'center' },
  timeAgo: { fontSize: 13, color: '#666' },
  editedBadge: { fontSize: 12, color: '#999', marginLeft: 4, fontStyle: 'italic' },
  postActions: { flexDirection: 'row', gap: 8 },
  iconButton: { padding: 4 },
  postContent: { marginBottom: 12 },
  postTitle: { fontSize: 17, fontWeight: 'bold', color: '#2d3e2d', marginBottom: 8 },
  postCardImage: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    objectFit: 'cover',
    marginBottom: 8,
  },
  postText: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 12 },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  actionItem: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  actionText: { fontSize: 14, color: '#5d873e', fontWeight: '600', marginLeft: 6 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
  bottomSpacer: { height: 100 },
  chatbotButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#5d873e',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  chatbotBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#5d873e',
  },
  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3e2d',
    marginTop: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  modalWarning: {
    fontSize: 14,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#5d873e',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5d873e',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default CommunityScreen;