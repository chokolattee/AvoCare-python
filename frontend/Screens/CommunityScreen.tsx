import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

type RootStackParamList = {
  Home: undefined;
  Community: undefined;
  Chatbot: undefined;
  Scan: undefined;
  Market: undefined;
  Profile: undefined;
};

type CommunityScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Community'>;
type CommunityScreenRouteProp = RouteProp<RootStackParamList, 'Community'>;

interface Props {
  navigation: CommunityScreenNavigationProp;
  route: CommunityScreenRouteProp;
}

interface ForumPost {
  id: number;
  username: string;
  timeAgo: string;
  title: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  category: 'pest' | 'health' | 'growing' | 'harvest' | 'general';
}

const CommunityScreen: React.FC<Props> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const forumPosts: ForumPost[] = [
    {
      id: 1,
      username: 'User12345',
      timeAgo: '2 hours ago',
      title: 'Pest Identification Help',
      content: 'What is this pest in my avocado?',
      image: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=400&h=300&fit=crop',
      likes: 10,
      comments: 5,
      category: 'pest',
    },
    {
      id: 2,
      username: 'UserABC',
      timeAgo: '6 hours ago',
      title: 'Avocado Ripeness',
      content: 'Is my avocado ripe enough?',
      image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&h=300&fit=crop',
      likes: 23,
      comments: 3,
      category: 'harvest',
    },
    {
      id: 3,
      username: 'FarmLife99',
      timeAgo: '12 hours ago',
      title: 'Yellow Leaves Problem',
      content: 'My avocado tree leaves are turning yellow. What could be the issue?',
      image: 'https://images.unsplash.com/photo-1574856344991-aaa31b6f4ce3?w=400&h=300&fit=crop',
      likes: 15,
      comments: 8,
      category: 'health',
    },
    {
      id: 4,
      username: 'GreenThumb',
      timeAgo: '1 day ago',
      title: 'Best Fertilizer for Avocados',
      content: 'What fertilizer do you recommend for avocado trees?',
      likes: 31,
      comments: 12,
      category: 'growing',
    },
    {
      id: 5,
      username: 'AvocadoLover',
      timeAgo: '1 day ago',
      title: 'Root Rot Treatment',
      content: 'How do I treat root rot in my avocado tree? Noticed wilting recently.',
      image: 'https://images.unsplash.com/photo-1551334787-21e6bd3ab135?w=400&h=300&fit=crop',
      likes: 42,
      comments: 15,
      category: 'health',
    },
    {
      id: 6,
      username: 'OrganicFarmer',
      timeAgo: '2 days ago',
      title: 'Organic Pest Control',
      content: 'Looking for organic solutions to control thrips on my avocado farm.',
      likes: 28,
      comments: 9,
      category: 'pest',
    },
  ];

  const categories = [
    { key: 'all', label: 'All', icon: 'grid-outline' },
    { key: 'pest', label: 'Pests', icon: 'bug-outline' },
    { key: 'health', label: 'Health', icon: 'heart-outline' },
    { key: 'growing', label: 'Growing', icon: 'leaf-outline' },
    { key: 'harvest', label: 'Harvest', icon: 'nutrition-outline' },
  ];

  const filteredPosts = forumPosts.filter(post => {
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Community Forum</Text>
          <Text style={styles.headerSubtitle}>Connect with fellow avocado farmers</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Forum"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Category Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.key}
              style={[
                styles.categoryButton,
                selectedCategory === category.key && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(category.key)}
            >
              <Ionicons 
                name={category.icon as any} 
                size={18} 
                color={selectedCategory === category.key ? '#fff' : '#5d873e'} 
              />
              <Text style={[
                styles.categoryText,
                selectedCategory === category.key && styles.categoryTextActive,
              ]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Create Post Button */}
        <View style={styles.createPostContainer}>
          <TouchableOpacity style={styles.createPostButton}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.createPostText}>Create New Post</Text>
          </TouchableOpacity>
        </View>

        {/* Forum Posts */}
        <View style={styles.postsContainer}>
          {filteredPosts.map((post) => (
            <TouchableOpacity key={post.id} style={styles.postCard}>
              {/* User Info */}
              <View style={styles.postHeader}>
                <View style={styles.userAvatar}>
                  <Ionicons name="person" size={24} color="#5d873e" />
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.username}>{post.username}</Text>
                  <Text style={styles.timeAgo}>({post.timeAgo})</Text>
                </View>
              </View>

              {/* Post Content */}
              <View style={styles.postContent}>
                <Text style={styles.postTitle}>{post.title}</Text>
                <Text style={styles.postText}>{post.content}</Text>
                
                {/* Post Image */}
                {post.image && (
                  <Image source={{ uri: post.image }} style={styles.postImage} />
                )}
              </View>

              {/* Post Actions */}
              <View style={styles.postActions}>
                <View style={styles.actionItem}>
                  <Ionicons name="thumbs-up-outline" size={20} color="#5d873e" />
                  <Text style={styles.actionText}>{post.likes}</Text>
                </View>
                <View style={styles.actionItem}>
                  <Ionicons name="chatbubble-outline" size={20} color="#5d873e" />
                  <Text style={styles.actionText}>{post.comments}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Floating Chatbot Button */}
      <TouchableOpacity
        style={styles.chatbotButton}
        onPress={() => navigation.navigate('Chatbot')}
      >
        <Ionicons name="chatbubbles" size={28} color="#fff" />
        <View style={styles.chatbotBadge}>
          <Ionicons name="sparkles" size={12} color="#5d873e" />
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#5d873e',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#d4e5cc',
  },
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
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  categoriesContainer: {
    marginTop: 8,
    backgroundColor: '#fff',
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
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
  categoryButtonActive: {
    backgroundColor: '#5d873e',
    borderColor: '#5d873e',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5d873e',
    marginLeft: 6,
  },
  categoryTextActive: {
    color: '#fff',
  },
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
  createPostText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  postsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
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
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
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
  userInfo: {
    marginLeft: 12,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5d873e',
    marginRight: 6,
  },
  timeAgo: {
    fontSize: 13,
    color: '#666',
  },
  postContent: {
    marginBottom: 12,
  },
  postTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2d3e2d',
    marginBottom: 8,
  },
  postText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 8,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    fontSize: 14,
    color: '#5d873e',
    fontWeight: '600',
    marginLeft: 6,
  },
  bottomSpacer: {
    height: 100,
  },
  // Chatbot Button Styles
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
});

export default CommunityScreen;