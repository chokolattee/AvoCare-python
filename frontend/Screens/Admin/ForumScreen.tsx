import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  SafeAreaView,
  RefreshControl,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../config/api';

interface Post {
  id: string;
  title: string;
  content: string;
  username: string;
  user_id: string;
  author_image?: string;
  category: string;
  imageUrls?: string[];
  likes: number;
  comments_count: number;
  created_at: string;
  archived: boolean;
}

const ForumScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [filterType, setFilterType] = useState('All');
  const [archiving, setArchiving] = useState(false);
  const { width } = dimensions;
  const isDesktop = width >= 768;

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    filterPosts();
  }, [searchQuery, posts, filterType]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('jwt') || await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert('Error', 'Authentication required');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/forum/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (Array.isArray(data)) {
        setPosts(data);
      } else {
        Alert.alert('Error', 'Failed to fetch posts');
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      Alert.alert('Error', 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  const filterPosts = () => {
    let filtered = posts;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (post) =>
          post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (filterType !== 'All') {
      filtered = filtered.filter((post) => post.category === filterType.toLowerCase());
    }

    setFilteredPosts(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const openDetailModal = (post: Post) => {
    setSelectedPost(post);
    setDetailModalVisible(true);
  };

  const archivePost = async (postId: string) => {
    try {
      setArchiving(true);
      const token = await AsyncStorage.getItem('jwt') || await AsyncStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/api/forum/${postId}/archive`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Post archived successfully');
        setDetailModalVisible(false);
        fetchPosts();
      } else {
        Alert.alert('Error', data.error || 'Failed to archive post');
      }
    } catch (error) {
      console.error('Error archiving post:', error);
      Alert.alert('Error', 'Failed to archive post');
    } finally {
      setArchiving(false);
    }
  };

  const confirmArchive = (postId: string) => {
    Alert.alert(
      'Archive Post',
      'Are you sure you want to archive this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: () => archivePost(postId) },
      ]
    );
  };

  const getStats = () => {
    const total = posts.length;
    const totalLikes = posts.reduce((sum, post) => sum + post.likes, 0);
    const totalComments = posts.reduce((sum, post) => sum + post.comments_count, 0);
    return { total, totalLikes, totalComments };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const stats = getStats();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5d873e" />
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#5d873e']} />
        }
      >
        {/* Stats Overview */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Posts</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalLikes}</Text>
            <Text style={styles.statLabel}>Total Likes</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalComments}</Text>
            <Text style={styles.statLabel}>Total Comments</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search posts..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Buttons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterButton, filterType === 'All' && styles.filterButtonActive]}
              onPress={() => setFilterType('All')}
            >
              <Text style={[styles.filterText, filterType === 'All' && styles.filterTextActive]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filterType === 'General' && styles.filterButtonActive]}
              onPress={() => setFilterType('General')}
            >
              <Text style={[styles.filterText, filterType === 'General' && styles.filterTextActive]}>General</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filterType === 'Tips' && styles.filterButtonActive]}
              onPress={() => setFilterType('Tips')}
            >
              <Text style={[styles.filterText, filterType === 'Tips' && styles.filterTextActive]}>Tips</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filterType === 'Diseases' && styles.filterButtonActive]}
              onPress={() => setFilterType('Diseases')}
            >
              <Text style={[styles.filterText, filterType === 'Diseases' && styles.filterTextActive]}>Diseases</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filterType === 'Care' && styles.filterButtonActive]}
              onPress={() => setFilterType('Care')}
            >
              <Text style={[styles.filterText, filterType === 'Care' && styles.filterTextActive]}>Care</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Posts List/Table */}
        {isDesktop ? (
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colAuthor]}>Author</Text>
              <Text style={[styles.tableHeaderText, styles.colTitle]}>Title</Text>
              <Text style={[styles.tableHeaderText, styles.colCategory]}>Category</Text>
              <Text style={[styles.tableHeaderText, styles.colStats]}>Stats</Text>
              <Text style={[styles.tableHeaderText, styles.colDate]}>Date</Text>
              <Text style={[styles.tableHeaderText, styles.colActions]}>Actions</Text>
            </View>
            {filteredPosts.map((post) => (
              <View key={post.id} style={styles.tableRow}>
                <View style={styles.colAuthor}>
                  {post.author_image ? (
                    <Image source={{ uri: post.author_image }} style={styles.authorImageTable} />
                  ) : (
                    <View style={styles.authorAvatarTable}>
                      <Text style={styles.authorAvatarTextTable}>{post.username.charAt(0)}</Text>
                    </View>
                  )}
                  <Text style={styles.authorNameTable}>{post.username}</Text>
                </View>
                <Text style={[styles.tableCell, styles.colTitle]} numberOfLines={2}>
                  {post.title}
                </Text>
                <View style={styles.colCategory}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{post.category.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.colStats}>
                  <View style={styles.statItem}>
                    <Ionicons name="heart" size={14} color="#ef4444" />
                    <Text style={styles.statText}>{post.likes}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="chatbubble" size={14} color="#3b82f6" />
                    <Text style={styles.statText}>{post.comments_count}</Text>
                  </View>
                </View>
                <Text style={[styles.tableCell, styles.colDate]}>{formatDate(post.created_at)}</Text>
                <View style={styles.colActions}>
                  <TouchableOpacity style={styles.viewButton} onPress={() => openDetailModal(post)}>
                    <Ionicons name="eye-outline" size={18} color="#5d873e" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.archiveButton} onPress={() => confirmArchive(post.id)}>
                    <Ionicons name="archive-outline" size={18} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.postsList}>
            {filteredPosts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.postCard}
                onPress={() => openDetailModal(post)}
              >
                <View style={styles.postHeader}>
                  {post.author_image ? (
                    <Image source={{ uri: post.author_image }} style={styles.authorImage} />
                  ) : (
                    <View style={styles.authorAvatar}>
                      <Text style={styles.authorAvatarText}>{post.username.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={styles.postHeaderInfo}>
                    <Text style={styles.authorName}>{post.username}</Text>
                    <Text style={styles.postDate}>{formatDate(post.created_at)}</Text>
                  </View>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{post.category}</Text>
                  </View>
                </View>
                <Text style={styles.postTitle}>{post.title}</Text>
                <Text style={styles.postContent} numberOfLines={2}>
                  {post.content}
                </Text>
                <View style={styles.postFooter}>
                  <View style={styles.statItem}>
                    <Ionicons name="heart" size={16} color="#ef4444" />
                    <Text style={styles.statText}>{post.likes}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="chatbubble" size={16} color="#3b82f6" />
                    <Text style={styles.statText}>{post.comments_count}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.archiveButtonMobile}
                    onPress={() => confirmArchive(post.id)}
                  >
                    <Ionicons name="archive-outline" size={18} color="#dc2626" />
                    <Text style={styles.archiveButtonText}>Archive</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {filteredPosts.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No posts found</Text>
          </View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Post Details</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {selectedPost && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.authorInfoModal}>
                  {selectedPost.author_image ? (
                    <Image source={{ uri: selectedPost.author_image }} style={styles.authorImageModal} />
                  ) : (
                    <View style={styles.authorAvatarModal}>
                      <Text style={styles.authorAvatarTextModal}>{selectedPost.username.charAt(0)}</Text>
                    </View>
                  )}
                  <View>
                    <Text style={styles.authorNameModal}>{selectedPost.username}</Text>
                    <Text style={styles.postDateModal}>{formatDate(selectedPost.created_at)}</Text>
                  </View>
                  <View style={[styles.categoryBadge, { marginLeft: 'auto' }]}>
                    <Text style={styles.categoryText}>{selectedPost.category.toUpperCase()}</Text>
                  </View>
                </View>

                <Text style={styles.postTitleModal}>{selectedPost.title}</Text>
                <Text style={styles.postContentModal}>{selectedPost.content}</Text>

                {selectedPost.imageUrls && selectedPost.imageUrls.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
                    {selectedPost.imageUrls.map((url, index) => (
                      <Image key={index} source={{ uri: url }} style={styles.postImage} />
                    ))}
                  </ScrollView>
                )}

                <View style={styles.statsRowModal}>
                  <View style={styles.statItemModal}>
                    <Ionicons name="heart" size={20} color="#ef4444" />
                    <Text style={styles.statTextModal}>{selectedPost.likes} Likes</Text>
                  </View>
                  <View style={styles.statItemModal}>
                    <Ionicons name="chatbubble" size={20} color="#3b82f6" />
                    <Text style={styles.statTextModal}>{selectedPost.comments_count} Comments</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.archiveButtonModal}
                  onPress={() => confirmArchive(selectedPost.id)}
                  disabled={archiving}
                >
                  {archiving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="archive-outline" size={20} color="#fff" />
                      <Text style={styles.archiveButtonTextModal}>Archive Post</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#5d873e',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#2d3e2d',
  },
  filterScroll: {
    marginBottom: 20,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#5d873e',
    borderColor: '#5d873e',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#fff',
  },
  // Mobile card view
  postsList: {
    gap: 12,
  },
  postCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5d873e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authorAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  postHeaderInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3e2d',
  },
  postDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d3e2d',
    marginBottom: 8,
  },
  postContent: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#ede9fe',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7c3aed',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  archiveButtonMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
  },
  archiveButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
  },
  // Desktop table view
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#5d873e',
    padding: 16,
    alignItems: 'center',
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 14,
    color: '#2d3e2d',
  },
  colAuthor: {
    width: 180,
    flexDirection: 'row',
    alignItems: 'center',
  },
  colTitle: {
    flex: 2,
  },
  colCategory: {
    width: 120,
  },
  colStats: {
    width: 100,
    flexDirection: 'row',
    gap: 12,
  },
  colDate: {
    width: 120,
  },
  colActions: {
    width: 100,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  authorImageTable: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  authorAvatarTable: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#5d873e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  authorAvatarTextTable: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  authorNameTable: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3e2d',
    flex: 1,
  },
  viewButton: {
    padding: 8,
    backgroundColor: '#f0f4ed',
    borderRadius: 6,
  },
  archiveButton: {
    padding: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d3e2d',
  },
  modalBody: {
    padding: 20,
  },
  authorInfoModal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  authorImageModal: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  authorAvatarModal: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#5d873e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authorAvatarTextModal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  authorNameModal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d3e2d',
    marginBottom: 4,
  },
  postDateModal: {
    fontSize: 13,
    color: '#6b7280',
  },
  postTitleModal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d3e2d',
    marginBottom: 12,
  },
  postContentModal: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 24,
    marginBottom: 16,
  },
  imagesContainer: {
    marginBottom: 16,
  },
  postImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginRight: 12,
  },
  statsRowModal: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  statItemModal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statTextModal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2d3e2d',
  },
  archiveButtonModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  archiveButtonTextModal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ForumScreen;
