import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
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
import * as Yup from 'yup';
import { API_BASE_URL as BASE_URL } from '../../config/api';
import { styles } from '../../Styles/PostDetailScreen.styles';

// ---------------------------------------------------------------------------
// Navigation types
// ---------------------------------------------------------------------------
type CommunityStackParamList = {
  Community: undefined;
  PostDetail: { postId: string };
  CreatePost: undefined;
  EditPost: { postId: string; title: string; content: string; category: string; imageUrls?: string[] };
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
  reply_to?: string | null;
  likes?: number;
  liked_by?: string[];
  created_at: string;
}

interface PostData {
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
  comments: CommentData[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const FORUM_URL = `${BASE_URL}/api/forum`;

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

// Yup validation schema for comments
const commentValidationSchema = Yup.object().shape({
  content: Yup.string()
    .required('Comment is required')
    .min(1, 'Comment cannot be empty')
    .test('no-profanity', function(value) {
      if (!value) return true;
      const profanityWords = findProfanityWords(value);
      if (profanityWords.length > 0) {
        return this.createError({
          message: `Comment contains inappropriate language: "${profanityWords.join('", "')}"`,
        });
      }
      return true;
    }),
});

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------
function timeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'recently';
    
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 0) return 'just now';
    if (seconds < 60) return 'just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    }
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    }
    
    const days = Math.floor(hours / 24);
    if (days < 7) {
      return days === 1 ? '1 day ago' : `${days} days ago`;
    }
    
    const weeks = Math.floor(days / 7);
    if (weeks < 4) {
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    }
    
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
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string>('');

  // Edit comment state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  
  // Reply comment state
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyingToAuthorName, setReplyingToAuthorName] = useState<string>('');
  
  // Comment likes state
  const [commentLikes, setCommentLikes] = useState<Record<string, { count: number; isLiked: boolean }>>({});

  // Get current user ID and login status
  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        const token = await AsyncStorage.getItem('token');
        const isUserLoggedIn = !!token && !!userId;
        
        setCurrentUserId(userId);
        setIsLoggedIn(isUserLoggedIn);
        
        // Clear any stale state if not logged in
        if (!isUserLoggedIn) {
          setCurrentUserId(null);
          setLiked(false);
        }
      } catch (err) {
        console.error('Failed to get user info:', err);
        setIsLoggedIn(false);
        setCurrentUserId(null);
      }
    };
    getUserInfo();
  }, []);

  // Re-check login status when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const checkLoginStatus = async () => {
        try {
          const token = await AsyncStorage.getItem('token');
          const userId = await AsyncStorage.getItem('userId');
          const isUserLoggedIn = !!token && !!userId;
          
          setIsLoggedIn(isUserLoggedIn);
          setCurrentUserId(userId);
          
          // Clear any local state if logged out
          if (!isUserLoggedIn) {
            setCurrentUserId(null);
            setLiked(false);
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
  }, [navigation]);

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
        
        // Initialize comment likes
        const likes: Record<string, { count: number; isLiked: boolean }> = {};
        found.comments.forEach((comment, index) => {
          const commentId = comment.id || String(index);
          likes[commentId] = {
            count: comment.likes || 0,
            isLiked: currentUserId ? (comment.liked_by?.includes(currentUserId) || false) : false,
          };
        });
        setCommentLikes(likes);
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
  }, [postId, navigation, currentUserId]);

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
    if (!post || !isLoggedIn) {
      Alert.alert('Login Required', 'Please login to delete posts.');
      return;
    }

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
                  'ngrok-skip-browser-warning': 'true',
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
    if (!isLoggedIn) {
      Alert.alert('Login Required', 'Please login to like posts.');
      return;
    }

    const token = await AsyncStorage.getItem('token');
    if (!token) {
      Alert.alert('Login Required', 'Please login to like posts.');
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
          'ngrok-skip-browser-warning': 'true',
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
    if (!isLoggedIn) {
      Alert.alert('Login Required', 'Please login to add comments.');
      return;
    }

    if (!commentText.trim()) {
      setCommentError('Comment cannot be empty');
      return;
    }

    // Validate using Yup schema
    try {
      await commentValidationSchema.validate({ content: commentText.trim() });
      setCommentError(''); // Clear any previous errors
    } catch (validationError) {
      if (validationError instanceof Yup.ValidationError) {
        setCommentError(validationError.message);
        return;
      }
    }

    const token = await AsyncStorage.getItem('token');
    if (!token) {
      Alert.alert('Login Required', 'Please login to add comments.');
      return;
    }

    setSubmittingComment(true);
    try {
      const res = await fetch(`${FORUM_URL}/${postId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ 
          content: commentText.trim(),
          reply_to: replyingToCommentId 
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setCommentError(err.error || 'Failed to post comment.');
        return;
      }

      setCommentText('');
      setCommentError('');
      setReplyingToCommentId(null);
      setReplyingToAuthorName('');
      await fetchPost();
    } catch (err) {
      setCommentError('Could not connect to the server.');
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // -----------------------------------------------------------------------
  // Edit Comment
  // -----------------------------------------------------------------------
  const handleEditComment = (commentId: string, currentContent: string) => {
    if (!isLoggedIn) {
      Alert.alert('Login Required', 'Please login to edit comments.');
      return;
    }
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
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ content: editCommentText.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Failed to update comment.');
        return;
      }

      const responseData = await res.json();
      
      // Show censorship notification if comment was censored
      if (responseData.censored) {
        Alert.alert('Notice', responseData.message || 'Comment updated with inappropriate words censored');
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
  // Reply to Comment
  // -----------------------------------------------------------------------
  const handleReplyToComment = (commentId: string, authorName: string) => {
    if (!isLoggedIn) {
      Alert.alert('Login Required', 'Please login to reply to comments.');
      return;
    }
    setReplyingToCommentId(commentId);
    setReplyingToAuthorName(authorName);
  };

  const handleCancelReply = () => {
    setReplyingToCommentId(null);
    setReplyingToAuthorName('');
  };

  // -----------------------------------------------------------------------
  // Like / Unlike Comment
  // -----------------------------------------------------------------------
  const handleLikeComment = async (commentId: string, commentIndex: number) => {
    if (!isLoggedIn) {
      Alert.alert('Login Required', 'Please login to like comments.');
      return;
    }

    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    const currentState = commentLikes[commentId] || { count: 0, isLiked: false };
    const wasLiked = currentState.isLiked;

    // Optimistic update
    setCommentLikes(prev => ({
      ...prev,
      [commentId]: {
        count: currentState.count + (wasLiked ? -1 : 1),
        isLiked: !wasLiked,
      },
    }));

    try {
      const res = await fetch(`${FORUM_URL}/${postId}/comment/${commentIndex}/like`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });

      if (!res.ok) throw new Error('Failed to like comment');

      const data = await res.json();
      setCommentLikes(prev => ({
        ...prev,
        [commentId]: {
          count: data.likes,
          isLiked: data.message === 'liked',
        },
      }));
    } catch (err) {
      // Revert on error
      setCommentLikes(prev => ({
        ...prev,
        [commentId]: currentState,
      }));
      console.error('Comment like failed:', err);
    }
  };

  // -----------------------------------------------------------------------
  // Delete Comment
  // -----------------------------------------------------------------------
  const handleDeleteComment = async (commentId: string) => {
    if (!isLoggedIn) {
      Alert.alert('Login Required', 'Please login to delete comments.');
      return;
    }

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
                'ngrok-skip-browser-warning': 'true',
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
  const isOwnPost = isLoggedIn && post && currentUserId !== null && post.user_id === currentUserId;
  const isOwnComment = (comment: CommentData): boolean => {
    return isLoggedIn && currentUserId !== null && comment.author_id === currentUserId;
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

  const edited = wasEdited(post.created_at, post.updated_at);

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
          {/* Edit/Delete for own posts - ONLY IF LOGGED IN */}
          {isOwnPost ? (
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('EditPost', {
                    postId: post.id,
                    title: post.title,
                    content: post.content,
                    category: post.category,
                    imageUrls: post.imageUrls,
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

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Author row */}
          <View style={styles.authorRow}>
            <View style={styles.avatar}>
              {post.author_image ? (
                <Image source={{ uri: post.author_image }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={22} color="#5d873e" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.authorName}>{post.username}</Text>
              <View style={styles.timeContainer}>
                <Text style={styles.authorTime}>
                  {timeAgo(edited && post.updated_at ? post.updated_at : post.created_at)}
                </Text>
                {edited && (
                  <Text style={styles.editedBadge}>• edited</Text>
                )}
              </View>
            </View>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>
                {post.category.charAt(0).toUpperCase() + post.category.slice(1)}
              </Text>
            </View>
          </View>

          {/* Post images */}
          {post.imageUrls && post.imageUrls.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imageScrollContainer}
              contentContainerStyle={styles.imageScrollContent}
            >
              {post.imageUrls.map((uri, idx) => (
                <Image
                  key={idx}
                  source={{ uri }}
                  style={[
                    styles.postImage,
                    idx > 0 && { marginLeft: 8 }
                  ]}
                />
              ))}
            </ScrollView>
          )}

          {/* Post body */}
          <Text style={styles.postContent}>{post.content}</Text>

          {/* Like button */}
          <TouchableOpacity 
            style={styles.likeRow} 
            onPress={handleLike}
            disabled={!isLoggedIn}
          >
            <Ionicons
              name={liked ? 'thumbs-up' : 'thumbs-up-outline'}
              size={22}
              color={liked ? '#e74c3c' : '#5d873e'}
              style={!isLoggedIn && styles.disabledIcon}
            />
            <Text style={[
              styles.likeText, 
              liked && styles.likeTextActive,
              !isLoggedIn && styles.disabledText
            ]}>
              {likeCount} {likeCount === 1 ? 'Like' : 'Likes'}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Comments heading */}
          <Text style={styles.commentsHeading}>Comments ({post.comments.length})</Text>

          {/* Comment list */}
          {post.comments.length === 0 ? (
            <Text style={styles.noComments}>
              {isLoggedIn ? 'Be the first to comment!' : 'No comments yet. Login to add one!'}
            </Text>
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

                    {/* Edit/Delete for own comments - ONLY IF LOGGED IN */}
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
                    <>
                      {/* Show reply indicator if this is a reply */}
                      {comment.reply_to && (
                        <View style={styles.replyBadgeContainer}>
                          <Ionicons name="return-down-forward-outline" size={12} color="#5d873e" />
                          <Text style={styles.replyBadgeText}>Reply</Text>
                        </View>
                      )}
                      <Text style={styles.commentBody}>{comment.content}</Text>
                      
                      {/* Like and Reply buttons */}
                      <View style={styles.commentActionBar}>
                        <TouchableOpacity
                          style={styles.commentLikeButton}
                          onPress={() => handleLikeComment(commentId, index)}
                          disabled={!isLoggedIn}
                        >
                          <Ionicons
                            name={commentLikes[commentId]?.isLiked ? 'heart' : 'heart-outline'}
                            size={16}
                            color={commentLikes[commentId]?.isLiked ? '#e74c3c' : '#5d873e'}
                          />
                          <Text
                            style={[
                              styles.commentLikeText,
                              commentLikes[commentId]?.isLiked && styles.commentLikeTextActive
                            ]}
                          >
                            {commentLikes[commentId]?.count || 0}
                          </Text>
                        </TouchableOpacity>
                        
                        {isLoggedIn && (
                          <TouchableOpacity
                            style={styles.commentReplyButton}
                            onPress={() => handleReplyToComment(commentId, comment.author_name)}
                          >
                            <Ionicons name="chatbubble-outline" size={14} color="#5d873e" />
                            <Text style={styles.commentReplyText}>Reply</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </>
                  )}
                </View>
              );
            })
          )}

          {/* Login prompt if not logged in */}
          {!isLoggedIn && (
            <View style={styles.loginPrompt}>
              <Ionicons name="lock-closed-outline" size={32} color="#5d873e" />
              <Text style={styles.loginPromptText}>
                Login to like and comment on posts
              </Text>
              <TouchableOpacity
                style={styles.loginPromptButton}
                onPress={() => navigation.getParent()?.navigate('AuthScreen' as never)}
              >
                <Text style={styles.loginPromptButtonText}>Login Now</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* Add Comment Input - ONLY IF LOGGED IN */}
        {isLoggedIn && (
          <View style={styles.commentInputContainer}>
            <View style={styles.commentInputWrapper}>
              {/* Reply indicator */}
              {replyingToCommentId && (
                <View style={styles.replyIndicator}>
                  <Ionicons name="return-down-forward-outline" size={16} color="#5d873e" />
                  <Text style={styles.replyIndicatorText}>
                    Replying to {replyingToAuthorName}
                  </Text>
                  <TouchableOpacity onPress={handleCancelReply}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.commentInputRow}>
                <TextInput
                  style={styles.commentInput}
                  placeholder={replyingToCommentId ? "Write a reply…" : "Write a comment…"}
                  placeholderTextColor="#999"
                  value={commentText}
                  onChangeText={(text) => {
                    setCommentText(text);
                    if (commentError) setCommentError(''); // Clear error on typing
                  }}
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
              {/* Show validation error */}
              {commentError ? (
                <Text style={styles.commentErrorText}>{commentError}</Text>
              ) : null}
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default PostDetailScreen;