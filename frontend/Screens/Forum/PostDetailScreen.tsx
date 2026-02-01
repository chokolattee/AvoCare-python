import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
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

type PostDetailScreenNavigationProp = StackNavigationProp<CommunityStackParamList, 'PostDetail'>;
type PostDetailScreenRouteProp = RouteProp<CommunityStackParamList, 'PostDetail'>;

interface Props {
  navigation: PostDetailScreenNavigationProp;
  route: PostDetailScreenRouteProp;
}

// ---------------------------------------------------------------------------
// Data shapes
// ---------------------------------------------------------------------------
interface CommentData {
  id?: string;
  content: string;
  author_name: string;
  author_id?: string;
  created_at: string;
}

interface PostData {
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
  comments: CommentData[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const FORUM_URL = `${BASE_URL}/api/forum`;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
const PostDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { postId } = route.params;

  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Edit comment state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');

  // Get current user ID
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

  // -----------------------------------------------------------------------
  // Fetch the single post
  // -----------------------------------------------------------------------
  const fetchPost = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(FORUM_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const allPosts: PostData[] = await res.json();
      const found = allPosts.find((p) => p.id === postId);
      if (found) {
        setPost(found);
        setLikeCount(found.likes);
      } else {
        Alert.alert('Error', 'Post not found.');
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load post.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [postId, navigation]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  // Re-fetch when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPost();
    });
    return unsubscribe;
  }, [navigation, fetchPost]);

  // -----------------------------------------------------------------------
  // Delete Post
  // -----------------------------------------------------------------------
  const handleDeletePost = async () => {
    if (!post) return;

    Alert.alert(
      'Delete Post',
      `Are you sure you want to delete "${post.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const token = await AsyncStorage.getItem('token');
            if (!token) return;

            try {
              const res = await fetch(`${FORUM_URL}/${postId}`, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              if (!res.ok) {
                const error = await res.json().catch(() => ({}));
                throw new Error(error.message || 'Failed to delete post');
              }

              Alert.alert('Success', 'Post deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.navigate('Community'),
                },
              ]);
            } catch (err) {
              console.error('Delete failed:', err);
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete post');
            }
          },
        },
      ]
    );
  };

  // -----------------------------------------------------------------------
  // Like / Unlike
  // -----------------------------------------------------------------------
  const handleLike = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      Alert.alert('Auth', 'You must be logged in to like a post.');
      return;
    }

    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((prev) => prev + (wasLiked ? -1 : 1));

    try {
      const res = await fetch(`${FORUM_URL}/${postId}/like`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setLikeCount(data.likes);
      setLiked(data.message === 'liked');
    } catch (err) {
      setLiked(wasLiked);
      setLikeCount((prev) => prev + (wasLiked ? 1 : -1));
      console.error('Like failed:', err);
    }
  };

  // -----------------------------------------------------------------------
  // Add Comment
  // -----------------------------------------------------------------------
  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    const token = await AsyncStorage.getItem('token');
    if (!token) {
      Alert.alert('Auth', 'You must be logged in to comment.');
      return;
    }

    setSubmittingComment(true);
    try {
      const res = await fetch(`${FORUM_URL}/${postId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: commentText.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Failed to post comment.');
        return;
      }

      setCommentText('');
      await fetchPost();
    } catch (err) {
      Alert.alert('Network Error', 'Could not connect to the server.');
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // -----------------------------------------------------------------------
  // Edit Comment
  // -----------------------------------------------------------------------
  const handleEditComment = (commentId: string, currentContent: string) => {
    setEditingCommentId(commentId);
    setEditCommentText(currentContent);
  };

  const handleSaveEditComment = async (commentId: string) => {
    if (!editCommentText.trim()) return;

    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${FORUM_URL}/${postId}/comment/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: editCommentText.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Failed to update comment.');
        return;
      }

      setEditingCommentId(null);
      setEditCommentText('');
      await fetchPost();
    } catch (err) {
      Alert.alert('Error', 'Failed to update comment.');
      console.error(err);
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditCommentText('');
  };

  // -----------------------------------------------------------------------
  // Delete Comment
  // -----------------------------------------------------------------------
  const handleDeleteComment = async (commentId: string) => {
    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const token = await AsyncStorage.getItem('token');
          if (!token) return;

          try {
            const res = await fetch(`${FORUM_URL}/${postId}/comment/${commentId}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (!res.ok) {
              const err = await res.json();
              Alert.alert('Error', err.error || 'Failed to delete comment.');
              return;
            }

            await fetchPost();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete comment.');
            console.error(err);
          }
        },
      },
    ]);
  };

  // -----------------------------------------------------------------------
  // Check ownership
  // -----------------------------------------------------------------------
  const isOwnPost = post && currentUserId !== null && post.user_id === currentUserId;
  const isOwnComment = (comment: CommentData): boolean => {
    return currentUserId !== null && comment.author_id === currentUserId;
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#5d873e" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (!post) return null;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {post.title}
          </Text>
          {/* Edit/Delete for own posts */}
          {isOwnPost ? (
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('EditPost', {
                    postId: post.id,
                    title: post.title,
                    content: post.content,
                    category: post.category,
                    imageUrl: post.imageUrl,
                  })
                }
                style={styles.headerButton}
              >
                <Ionicons name="create-outline" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeletePost} style={styles.headerButton}>
                <Ionicons name="trash-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: 26 }} />
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
          {/* Author row */}
          <View style={styles.authorRow}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={22} color="#5d873e" />
            </View>
            <View>
              <Text style={styles.authorName}>{post.username}</Text>
              <Text style={styles.authorTime}>{timeAgo(post.created_at)}</Text>
            </View>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>
                {post.category.charAt(0).toUpperCase() + post.category.slice(1)}
              </Text>
            </View>
          </View>

          {/* Post image */}
          {post.imageUrl && (
            <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
          )}

          {/* Post body */}
          <Text style={styles.postContent}>{post.content}</Text>

          {/* Like button */}
          <TouchableOpacity style={styles.likeRow} onPress={handleLike}>
            <Ionicons
              name={liked ? 'thumbs-up' : 'thumbs-up-outline'}
              size={22}
              color={liked ? '#e74c3c' : '#5d873e'}
            />
            <Text style={[styles.likeText, liked && styles.likeTextActive]}>
              {likeCount} {likeCount === 1 ? 'Like' : 'Likes'}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Comments heading */}
          <Text style={styles.commentsHeading}>Comments ({post.comments.length})</Text>

          {/* Comment list */}
          {post.comments.length === 0 ? (
            <Text style={styles.noComments}>Be the first to comment!</Text>
          ) : (
            post.comments.map((comment, index) => {
              const commentId = comment.id || `${index}`;
              const isEditing = editingCommentId === commentId;

              return (
                <View key={index} style={styles.commentCard}>
                  <View style={styles.commentHeader}>
                    <View style={styles.commentAvatar}>
                      <Ionicons name="person" size={16} color="#5d873e" />
                    </View>
                    <Text style={styles.commentAuthor}>{comment.author_name}</Text>
                    <Text style={styles.commentTime}>{timeAgo(comment.created_at)}</Text>

                    {/* Edit/Delete for own comments */}
                    {isOwnComment(comment) && !isEditing && (
                      <View style={styles.commentActions}>
                        <TouchableOpacity
                          onPress={() => handleEditComment(commentId, comment.content)}
                          style={styles.commentActionButton}
                        >
                          <Ionicons name="create-outline" size={16} color="#5d873e" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteComment(commentId)}
                          style={styles.commentActionButton}
                        >
                          <Ionicons name="trash-outline" size={16} color="#e74c3c" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Comment body or edit field */}
                  {isEditing ? (
                    <View>
                      <TextInput
                        style={styles.editCommentInput}
                        value={editCommentText}
                        onChangeText={setEditCommentText}
                        multiline
                        autoFocus
                      />
                      <View style={styles.editActions}>
                        <TouchableOpacity
                          style={styles.saveButton}
                          onPress={() => handleSaveEditComment(commentId)}
                        >
                          <Text style={styles.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelEditButton} onPress={handleCancelEdit}>
                          <Text style={styles.cancelEditButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.commentBody}>{comment.content}</Text>
                  )}
                </View>
              );
            })
          )}

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* Add Comment Input */}
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Write a comment…"
            placeholderTextColor="#999"
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, submittingComment && styles.sendButtonDisabled]}
            onPress={handleAddComment}
            disabled={submittingComment || !commentText.trim()}
          >
            {submittingComment ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerButton: { padding: 4 },

  scrollView: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },

  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#5d873e',
    marginRight: 10,
  },
  authorName: { fontSize: 15, fontWeight: '600', color: '#5d873e' },
  authorTime: { fontSize: 12, color: '#888' },
  categoryBadge: {
    marginLeft: 'auto',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#5d873e',
  },
  categoryBadgeText: { fontSize: 12, fontWeight: '600', color: '#5d873e' },

  postImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    objectFit: 'cover',
    marginBottom: 16,
  },
  postContent: { fontSize: 15, color: '#444', lineHeight: 22, marginBottom: 20 },
  likeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  likeText: { fontSize: 15, color: '#5d873e', fontWeight: '600', marginLeft: 8 },
  likeTextActive: { color: '#e74c3c' },

  divider: { height: 1, backgroundColor: '#e8e8e8', marginBottom: 20 },

  commentsHeading: { fontSize: 17, fontWeight: 'bold', color: '#2d3e2d', marginBottom: 12 },
  noComments: { fontSize: 14, color: '#999', textAlign: 'center', marginVertical: 16 },

  commentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  commentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  commentAuthor: { fontSize: 13, fontWeight: '600', color: '#5d873e', marginRight: 6 },
  commentTime: { fontSize: 11, color: '#999', flex: 1 },
  commentActions: { flexDirection: 'row', gap: 6 },
  commentActionButton: { padding: 2 },
  commentBody: { fontSize: 14, color: '#555', lineHeight: 20 },

  editCommentInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#5d873e',
    marginBottom: 8,
    minHeight: 60,
  },
  editActions: { flexDirection: 'row', gap: 8 },
  saveButton: {
    backgroundColor: '#5d873e',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  cancelEditButton: {
    backgroundColor: '#e8e8e8',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelEditButtonText: { color: '#666', fontSize: 13, fontWeight: '600' },

  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
commentInput: {
  flex: 1,
  backgroundColor: '#f5f5f5',
  borderRadius: 20,
  paddingHorizontal: 16,
  paddingVertical: 10,
  fontSize: 14,
  color: '#333',
  borderWidth: 1,
  borderColor: '#e8e8e8',
  marginRight: 10,
  maxHeight: 100,
},
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#5d873e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: { opacity: 0.4 },
});

export default PostDetailScreen;