import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Linking,
  Image,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Footer from '../Components/Footer';
import { styles } from '../Styles/HomeScreen.styles';
import { BASE_URL } from '../config/api';

type RootStackParamList = {
  Home: undefined;
  Community: undefined;
  CommunityStack: undefined;
  Scan: undefined;
  Market: undefined;
  Profile: undefined;
  Notifications: undefined;
  Login: undefined;
  About: undefined;
  AvocadoInfo: undefined;
  Chat: undefined;
  Analytics: undefined;
  Chatbot: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;
type HomeScreenRouteProp = RouteProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
  route: HomeScreenRouteProp;
}

interface NewsItem {
  id: number;
  title: string;
  source: string;
  url: string;
}

interface ActionButton {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  screen: keyof RootStackParamList;
  gradient: [string, string];
}

interface ForumPost {
  id: string;
  title: string;
  content: string;
  username: string;
  author_image?: string;
  category: string;
  likes: number;
  comments_count: number;
  created_at: string;
  archived?: boolean;
  imageUrls?: string[];
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [recentPosts, setRecentPosts] = useState<ForumPost[]>([]);
  
  // ============================================
  // RESPONSIVE STATE - Updates on window resize
  // ============================================
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const { width, height } = dimensions;
  const isTablet = width >= 768;
  
  // Update dimensions on resize
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    
    return () => subscription?.remove();
  }, []);
  // ============================================

  // Local image imports
  const carouselImages = [
    require('../assets/home/avo1.jpg'),
    require('../assets/home/avocado.avif'),
    require('../assets/home/avofarm.jpeg'),
    require('../assets/home/avotree.jpg'),
  ];

  const actionButtons: ActionButton[] = [
    {
      icon: 'scan',
      title: 'SCAN PLANT',
      subtitle: 'Scan and identify plant parts',
      screen: 'Scan',
      gradient: ['#90b481', '#5d873e'],
    },
    {
      icon: 'chatbubbles',
      title: 'CHATBOT',
      subtitle: 'Ask questions in real-time',
      screen: 'Chatbot',
      gradient: ['#5d873e', '#4a5f37'],
    },
    {
      icon: 'analytics',
      title: 'CHECK ANALYTICS',
      subtitle: 'See insights and trends',
      screen: 'Analytics',
      gradient: ['#90b481', '#5d873e'],
    },
    {
      icon: 'book',
      title: 'ABOUT AVOCADO',
      subtitle: 'Learn more about avocado',
      screen: 'AvocadoInfo',
      gradient: ['#5d873e', '#4a5f37'],
    },
    {
      icon: 'cart',
      title: 'AVOCADO PRODUCTS',
      subtitle: 'Market and product list',
      screen: 'Market',
      gradient: ['#90b481', '#5d873e'],
    },
    {
      icon: 'people',
      title: 'COMMUNITY FORUM',
      subtitle: 'Join the discussion',
      screen: 'CommunityStack',
      gradient: ['#5d873e', '#4a5f37'],
    },
  ];

  const newsItems: NewsItem[] = [
    {
      id: 1,
      title: 'Demand and Supply of Avocado in the Philippines',
      source: 'Philippine News Agency',
      url: 'https://www.philstar.com/business/2026/02/06/2506009/avocados',
    },
    {
      id: 2,
        title: 'DA pushes exports of more high-value crops',
        source: 'Business Inquirer',
      url: 'https://business.inquirer.net/572253/da-pushes-exports-of-more-high-value-crops',
    },
    {
      id: 3,
      title: 'Avocado Price Philippines 2025 & Farm Trends in Agriculture',
      source: 'Farmonaut',
      url: 'https://farmonaut.com/asia/avocado-price-philippines-2025-farm-trends-in-agriculture',
    },
    {
      id: 4,
      title: "Tropical fruits drive Philippines' export gains",
      source: 'Daily Tribune',
      url: 'https://tribune.net.ph/2026/02/07/tropical-fruits-drive-philippines-export-gains',
    },
  ];

  const avocadoBenefits = [
    {
      icon: 'heart',
      title: 'Heart Health',
      description: 'Rich in monounsaturated fats that support cardiovascular health',
      color: '#e74c3c',
      url: 'https://www.scripps.org/news_items/7924-are-avocados-good-for-your-heart-health',
    },
    {
      icon: 'fitness',
      title: 'Nutrient Dense',
      description: 'Packed with 20+ vitamins and minerals including potassium and folate',
      color: '#5d873e',
      url: 'https://www.health.harvard.edu/nutrition/avocado-nutrition-health-benefits-and-easy-recipes',
    },
    {
      icon: 'eye',
      title: 'Eye Protection',
      description: 'Contains lutein and zeaxanthin for maintaining healthy vision',
      color: '#3498db',
      url: 'https://sunrisehealthfoods.com/tips/avocado-for-eye-and-mind/',
    },
    {
      icon: 'shield-checkmark',
      title: 'Antioxidant Power',
      description: 'High in antioxidants that help protect cells from damage',
      color: '#9b59b6',
      url: 'https://www.manipalcigna.com/health-benefits/health-benefits-of-avocado',
    },
  ];

  // Fetch recent forum posts
  useEffect(() => {
    const fetchRecentPosts = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/forum`);
        if (response.ok) {
          const data: ForumPost[] = await response.json();
          // Get 5 most recent posts (not archived)
          const recent = data
            .filter(post => !post.archived)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5);
          setRecentPosts(recent);
        }
      } catch (error) {
        console.error('Failed to fetch recent posts:', error);
      }
    };
    fetchRecentPosts();
  }, []);

  // Auto-slide carousel
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setActiveSlide((prev) => (prev + 1) % carouselImages.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [carouselImages.length]);

  const openURL = (url: string) => {
    Linking.openURL(url).catch((err) => console.error('Failed to open URL:', err));
  };

  const handleAction = (screen: keyof RootStackParamList) => {
    navigation.navigate(screen);
  };

  // ============================================
  // DYNAMIC STYLES based on current dimensions
  // ============================================
  const dynamicStyles = StyleSheet.create({
    heroSection: {
      minHeight: isTablet ? 500 : 400,
      height: height - (Platform.OS === 'ios' ? 110 : 90),
      position: 'relative',
      marginTop: 0,
    },
    mainContent: {
      paddingVertical: 24,
      paddingHorizontal: isTablet ? 28 : 16,
    },
    contentGrid: {
      flexDirection: isTablet ? 'row' : 'column',
      gap: isTablet ? 24 : 20,
    },
    leftColumn: {
      flex: isTablet ? 0.45 : 1,
      paddingHorizontal: isTablet ? 12 : 8,
      paddingRight: isTablet ? 16 : 8,
    },
    rightColumn: {
      flex: isTablet ? 0.55 : 1,
      gap: 16,
      paddingHorizontal: isTablet ? 12 : 8,
      paddingLeft: isTablet ? 16 : 8,
    },
    actionButton: {
      width: isTablet ? '31%' : '47%',
      borderRadius: 12,
      overflow: 'hidden',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      marginBottom: 0,
    },
    actionButtonGradient: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isTablet ? 20 : 16,
      gap: 10,
      minHeight: isTablet ? 140 : 120,
    },
  });
  // ============================================

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Hero Section with Carousel */}
        <View style={dynamicStyles.heroSection}>
          <LinearGradient
            colors={['#5d873e', '#90b481']}
            style={styles.heroGradient}
          >
            {/* Carousel Image - Full Cover */}
            <View style={styles.carouselContainer}>
              <Animated.Image
                source={carouselImages[activeSlide]}
                style={[styles.carouselImage, { opacity: fadeAnim }]}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['rgba(0,0,0,0.2)', 'rgba(93,135,62,0.8)']}
                style={styles.carouselOverlay} 
              />
            </View>

            {/* Hero Content */}
            <View style={styles.heroContent}>
              <Text style={[styles.welcomeText, { fontSize: isTablet ? 14 : 12 }]}>
                Welcome to AvoCare
              </Text>
              <Text style={[styles.heroTitle, { 
                fontSize: isTablet ? 38 : 28,
                lineHeight: isTablet ? 48 : 36 
              }]}>
                Cultivate Excellence,{'\n'}
                <Text style={styles.highlight}>Harvest Success</Text>
              </Text>
              <Text style={[styles.heroSubtitle, { 
                fontSize: isTablet ? 15 : 13,
                maxWidth: isTablet ? 600 : '90%' 
              }]}>
                Your comprehensive platform for sustainable avocado farming and community-driven agricultural innovation
              </Text>
            </View>

            {/* Carousel Dots */}
            <View style={styles.carouselDots}>
              {carouselImages.map((_, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.carouselDot,
                    idx === activeSlide && styles.carouselDotActive,
                  ]}
                  onPress={() => {
                    Animated.timing(fadeAnim, {
                      toValue: 0,
                      duration: 200,
                      useNativeDriver: true,
                    }).start(() => {
                      setActiveSlide(idx);
                      Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 200,
                        useNativeDriver: true,
                      }).start();
                    });
                  }}
                />
              ))}
            </View>
          </LinearGradient>
        </View>

        {/* Main Content Section */}
        <View style={dynamicStyles.mainContent}>
          {/* Two Column Layout for Tablet/Desktop */}
          <View style={dynamicStyles.contentGrid}>
            {/* Left Column - Action Buttons */}
            <View style={dynamicStyles.leftColumn}>
              <View style={styles.actionButtonsContainer}>
                {actionButtons.map((button, index) => (
                  <TouchableOpacity
                    key={index}
                    style={dynamicStyles.actionButton}
                    onPress={() => handleAction(button.screen)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={button.gradient}
                      style={dynamicStyles.actionButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={[styles.actionButtonIcon, {
                        width: isTablet ? 50 : 44,
                        height: isTablet ? 50 : 44,
                        borderRadius: isTablet ? 25 : 22,
                      }]}>
                        <Ionicons name={button.icon} size={isTablet ? 26 : 24} color="#fff" />
                      </View>
                      <View style={styles.actionButtonText}>
                        <Text style={[styles.actionButtonTitle, { fontSize: isTablet ? 14 : 13 }]}>
                          {button.title}
                        </Text>
                        <Text style={[styles.actionButtonSubtitle, { fontSize: isTablet ? 11 : 10 }]}>
                          {button.subtitle}
                        </Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Avocado Benefits Section */}
              <View style={[styles.benefitsSection, { marginTop: 24, padding: isTablet ? 20 : 16 }]}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.avocadoIcon}>🥑</Text>
                  <Text style={[styles.sectionTitle, { fontSize: isTablet ? 20 : 18 }]}>
                    Avocado Benefits
                  </Text>
                </View>
                <View style={styles.benefitsGrid}>
                  {avocadoBenefits.map((benefit, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.benefitCard}
                      onPress={() => openURL(benefit.url)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.benefitIcon, { backgroundColor: benefit.color + '20' }]}>
                        <Ionicons name={benefit.icon as any} size={24} color={benefit.color} />
                      </View>
                      <Text style={styles.benefitTitle}>{benefit.title}</Text>
                      <Text style={styles.benefitDescription}>{benefit.description}</Text>
                      <Text style={styles.readMoreText}>Read more →</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Right Column - News & Community */}
            <View style={dynamicStyles.rightColumn}>
              {/* News Section */}
              <View style={[styles.newsSection, { padding: isTablet ? 20 : 16 }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="newspaper" size={24} color="#5d873e" />
                  <Text style={[styles.sectionTitle, { fontSize: isTablet ? 20 : 18 }]}>
                    News & Updates
                  </Text>
                </View>
                <View style={styles.newsList}>
                  {newsItems.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.newsItem}
                      onPress={() => openURL(item.url)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.newsItemContent}>
                        <Text style={styles.newsItemTitle} numberOfLines={2}>
                          {item.title}
                        </Text>
                        <Text style={styles.newsItemSource}>{item.source}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Community Forum Preview */}
              <View style={[styles.communitySection, { padding: isTablet ? 20 : 16 }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="people" size={24} color="#5d873e" />
                  <Text style={[styles.sectionTitle, { fontSize: isTablet ? 20 : 18 }]}>
                    Community Forum
                  </Text>
                </View>
                <View style={styles.communityPreview}>
                  {recentPosts.length > 0 ? (
                    recentPosts.map((post) => (
                      <TouchableOpacity
                        key={post.id}
                        style={styles.forumPostCard}
                        onPress={() => (navigation as any).navigate('CommunityStack', {
                          screen: 'PostDetail',
                          params: { postId: post.id }
                        })}
                        activeOpacity={0.7}
                      >
                        <View style={styles.forumPostHeader}>
                          <View style={styles.forumPostUserInfo}>
                            <View style={styles.forumPostAvatar}>
                              {post.author_image ? (
                                <Image source={{ uri: post.author_image }} style={styles.userAvatarImage} />
                              ) : (
                                <Ionicons name="person" size={16} color="#5d873e" />
                              )}
                            </View>
                            <Text style={styles.forumPostAuthor}>{post.username}</Text>
                          </View>
                          <View style={styles.forumCategoryBadge}>
                            <Text style={styles.forumCategoryText}>{post.category}</Text>
                          </View>
                        </View>
                        
                        <Text style={styles.forumPostTitle} numberOfLines={2}>
                          {post.title}
                        </Text>
                        
                        <Text style={styles.forumPostContent} numberOfLines={3}>
                          {post.content}
                        </Text>
                        
                        {post.imageUrls && post.imageUrls.length > 0 && (
                          <View style={styles.forumPostImageContainer}>
                            <Image
                              source={{ uri: post.imageUrls[0] }}
                              style={styles.forumPostImage}
                              resizeMode="cover"
                            />
                            {post.imageUrls.length > 1 && (
                              <View style={styles.moreImagesOverlay}>
                                <Text style={styles.moreImagesText}>+{post.imageUrls.length - 1}</Text>
                              </View>
                            )}
                          </View>
                        )}
                        
                        <View style={styles.forumPostFooter}>
                          <View style={styles.forumPostStats}>
                            <Ionicons name="heart" size={16} color="#e74c3c" />
                            <Text style={styles.forumPostStatText}>{post.likes}</Text>
                            <Ionicons name="chatbubble" size={16} color="#5d873e" style={{ marginLeft: 12 }} />
                            <Text style={styles.forumPostStatText}>{post.comments_count}</Text>
                          </View>
                          <Text style={styles.readMoreText}>Read more →</Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.communityText}>
                      Join our growing community of avocado farmers and enthusiasts.
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>

        <Footer />
      </ScrollView>
    </View>
  );
};

export default HomeScreen;