import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
  Linking,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Footer from '../Components/Footer';

type RootStackParamList = {
  Home: undefined;
  Community: undefined;
  Scan: undefined;
  Market: undefined;
  Profile: undefined;
  Notifications: undefined;
  Login: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;
type HomeScreenRouteProp = RouteProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
  route: HomeScreenRouteProp;
}

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width > 768 ? (width - 80) / 3 : (width - 48) / 2;

interface NewsItem {
  id: number;
  title: string;
  source: string;
  url: string;
  image?: string;
  date: string;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  // ── Carousel state ──
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const heroImages = [
    {
      uri: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=1200&h=800&fit=crop',
      title: 'Premium Avocados',
      subtitle: 'Farm-fresh quality, delivered to your doorstep',
    },
    {
      uri: 'https://images.unsplash.com/photo-1601039641847-7857b994d704?w=1200&h=800&fit=crop',
      title: 'Sustainable Farming',
      subtitle: 'Growing a greener future, one avocado at a time',
    },
    {
      uri: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=1200&h=800&fit=crop',
      title: 'Healthy Growth',
      subtitle: 'Expert care for the perfect harvest',
    },
    {
      uri: 'https://images.unsplash.com/photo-1583663848850-46af132dc08e?w=1200&h=800&fit=crop',
      title: 'Peak Freshness',
      subtitle: 'Perfectly ripe, perfectly delicious',
    },
  ];

  // ── News & Updates ──
  const newsItems: NewsItem[] = [
    {
      id: 1,
      title: 'Philippine avocado exports hit record high in 2025',
      source: 'Philippine News Agency',
      url: 'https://www.pna.gov.ph',
      date: '2025-01-20',
    },
    {
      id: 2,
      title: 'Local brand champions health-conscious living through avocado products',
      source: 'GMA Network',
      url: 'https://www.gmanetwork.com',
      date: '2025-01-15',
    },
    {
      id: 3,
      title: 'Avocado farming gains traction as sustainable livelihood in rural PH',
      source: 'Business Inquirer',
      url: 'https://business.inquirer.net',
      date: '2025-01-12',
    },
    {
      id: 4,
      title: 'Avocado to boost PH economy and wellness industry',
      source: 'ABS-CBN Lifestyle',
      url: 'https://www.abs-cbn.com',
      date: '2025-01-08',
    },
  ];

  // ── Auto-slide with fade ──
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // ── Data ──
  const benefits = [
    {
      id: 1,
      title: 'Rich in Nutrients',
      description: 'Loaded with vitamins K, E, C, and essential B vitamins for optimal health',
      image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=500&h=400&fit=crop',
      icon: '🥑',
    },
    {
      id: 2,
      title: 'Heart Healthy',
      description: 'Monounsaturated fats support cardiovascular wellness',
      image: require('../assets/avoheart.jpg'),
      icon: '❤️',
    },
    {
      id: 3,
      title: 'Aids Digestion',
      description: 'High fiber content promotes digestive health',
      image: require('../assets/avodigest.jpg'),
      icon: '🌿',
    },
    {
      id: 4,
      title: 'Boosts Immunity',
      description: 'Antioxidants strengthen your immune system',
      image: require('../assets/avoimmune.jpg'),
      icon: '💪',
    },
  ];

  const diseases = [
    {
      id: 1,
      name: 'Anthracnose',
      description: 'Fungal disease causing dark lesions on fruit and leaves',
      image: require('../assets/avo anthrac.jpg'),
    },
    {
      id: 2,
      name: 'Root Rot',
      description: 'Phytophthora fungus affecting root systems',
      image: require('../assets/rootrot.jpg'),
    },
    {
      id: 3,
      name: 'Avocado Scab',
      description: 'Creates raised, corky lesions on fruit',
      image: require('../assets/scab.jpg'),
    },
  ];

  const pests = [
    {
      id: 1,
      name: 'Avocado Thrips',
      description: 'Tiny insects causing surface scarring',
      image: require('../assets/thrips.avif'),
    },
    {
      id: 2,
      name: 'Lace Bug',
      description: 'Sap-sucking pest causing discoloration',
      image: require('../assets/lace bug.webp'),
    },
    {
      id: 3,
      name: 'Spider Mites',
      description: 'Arachnids that feed on plant sap',
      image: require('../assets/spider.jpg'),
    },
  ];

  // ── Handlers ──
  const openNewsArticle = (url: string) => {
    Linking.openURL(url).catch((err) => console.error('Failed to open article:', err));
  };

  // ── Render helpers ──
  const renderNewsItem = (item: NewsItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.newsItem}
      onPress={() => openNewsArticle(item.url)}
      activeOpacity={0.7}
    >
      <View style={styles.newsIconContainer}>
        <Ionicons name="newspaper-outline" size={22} color="#5d873e" />
      </View>
      <View style={styles.newsContent}>
        <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.newsSource}>{item.source}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#5d873e" />
    </TouchableOpacity>
  );

  const renderCard = (item: any, type: 'benefit' | 'disease' | 'pest') => (
    <TouchableOpacity
      key={item.id}
      style={[styles.card, { width: CARD_WIDTH }]}
      activeOpacity={0.9}
    >
      <View style={styles.cardImageWrapper}>
        {/* Handle both local and remote images */}
        {typeof item.image === 'string' ? (
          <Image source={{ uri: item.image }} style={styles.cardImage} />
        ) : (
          <Image source={item.image} style={styles.cardImage} />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.cardGradient}
        />
        {type === 'benefit' && (
          <View style={styles.cardIconBadge}>
            <Text style={styles.cardIcon}>{item.icon}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>
          {type === 'benefit' ? item.title : item.name}
        </Text>
        <Text style={styles.cardDescription} numberOfLines={3}>
          {item.description}
        </Text>
        <TouchableOpacity style={styles.learnMoreBtn}>
          <Text style={styles.learnMoreText}>Learn More</Text>
          <Ionicons name="arrow-forward" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderSection = (
    items: any[],
    type: 'benefit' | 'disease' | 'pest',
    icon: any,
    title: string,
    subtitle: string
  ) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconContainer}>
          <Ionicons name={icon} size={32} color="#5d873e" />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalCardsContainer}
      >
        {items.map((item) => renderCard(item, type))}
      </ScrollView>
    </View>
  );

  // ── Main Render ──
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* ─── Hero Carousel ─── */}
        <View style={styles.hero}>
          <Animated.View
            style={[
              styles.heroImageContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            <Image
              source={{ uri: heroImages[currentImageIndex].uri }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </Animated.View>

          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.heroOverlay}
          />

          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Ionicons name="leaf" size={16} color="#8BC34A" />
              <Text style={styles.heroSubheading}>AVOCARE</Text>
            </View>
            <Animated.Text style={[styles.heroTitle, { opacity: fadeAnim }]}>
              {heroImages[currentImageIndex].title}
            </Animated.Text>
            <Animated.Text style={[styles.heroDescription, { opacity: fadeAnim }]}>
              {heroImages[currentImageIndex].subtitle}
            </Animated.Text>
            <TouchableOpacity style={styles.learnMoreButton} activeOpacity={0.8}>
              <Text style={styles.learnMoreButtonText}>Explore Now</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Dot indicators */}
          <View style={styles.carouselIndicators}>
            {heroImages.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.indicator,
                  currentImageIndex === index && styles.activeIndicator,
                ]}
                onPress={() => {
                  Animated.parallel([
                    Animated.timing(fadeAnim, {
                      toValue: 0,
                      duration: 300,
                      useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                      toValue: 1.1,
                      duration: 300,
                      useNativeDriver: true,
                    }),
                  ]).start(() => {
                    setCurrentImageIndex(index);
                    Animated.parallel([
                      Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                      }),
                      Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                      }),
                    ]).start();
                  });
                }}
              />
            ))}
          </View>
        </View>

        {/* ─── News & Updates ─── */}
        <View style={styles.newsSection}>
          <View style={styles.newsSectionHeader}>
            <View style={styles.newsHeaderIcon}>
              <Ionicons name="megaphone" size={28} color="#5d873e" />
            </View>
            <View>
              <Text style={styles.newsSectionTitle}>Latest News</Text>
              <Text style={styles.newsSectionSubtitle}>
                Stay updated with avocado industry trends
              </Text>
            </View>
          </View>
          <View style={styles.newsContainer}>
            {newsItems.map((item) => renderNewsItem(item))}
          </View>
          <TouchableOpacity style={styles.viewAllNewsButton} activeOpacity={0.7}>
            <Text style={styles.viewAllNewsText}>View All Articles</Text>
            <Ionicons name="arrow-forward" size={16} color="#5d873e" />
          </TouchableOpacity>
        </View>

        {/* ─── Health Benefits ─── */}
        {renderSection(
          benefits,
          'benefit',
          'fitness',
          'Health Benefits',
          'Discover why avocados are a superfood'
        )}

        {/* ─── Diseases ─── */}
        {renderSection(
          diseases,
          'disease',
          'alert-circle',
          'Common Diseases',
          'Identify and prevent plant diseases'
        )}

        {/* ─── Pests ─── */}
        {renderSection(
          pests,
          'pest',
          'bug',
          'Pest Management',
          'Protect your avocado trees'
        )}

        {/* ─── Footer ─── */}
        <Footer />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─────────────────── STYLES ───────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingBottom: 0,
  },

  // ── Hero ──
  hero: {
    height: height * 0.7,
    minHeight: 500,
    maxHeight: 700,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#1a2e1a',
  },
  heroImageContainer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 50,
    zIndex: 1,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroSubheading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 2,
  },
  heroTitle: {
    fontSize: width < 375 ? 32 : 42,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: width < 375 ? 40 : 50,
    paddingHorizontal: 10,
  },
  heroDescription: {
    fontSize: width < 375 ? 15 : 17,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 28,
    opacity: 0.95,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5d873e',
    paddingHorizontal: width < 375 ? 28 : 36,
    paddingVertical: width < 375 ? 14 : 16,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    gap: 8,
  },
  learnMoreButtonText: {
    color: '#fff',
    fontSize: width < 375 ? 14 : 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  carouselIndicators: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    zIndex: 2,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  activeIndicator: {
    backgroundColor: '#fff',
    width: 28,
    borderRadius: 4,
  },

  // ── News ──
  newsSection: {
    marginTop: 40,
    marginBottom: 20,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  newsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  newsHeaderIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f7ed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newsSectionTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2d3e2d',
    marginBottom: 4,
  },
  newsSectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  newsContainer: {
    gap: 12,
  },
  newsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#5d873e',
  },
  newsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f7ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  newsContent: {
    flex: 1,
    marginRight: 12,
  },
  newsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2d3e2d',
    marginBottom: 4,
    lineHeight: 21,
  },
  newsSource: {
    fontSize: 12,
    color: '#888',
  },
  viewAllNewsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 14,
    gap: 8,
    backgroundColor: '#f0f7ed',
    borderRadius: 10,
  },
  viewAllNewsText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5d873e',
  },

  // ── Sections ──
  section: {
    marginVertical: 20,
    paddingVertical: 30,
  },
  sectionHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  sectionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0f7ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2d3e2d',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
  horizontalCardsContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },

  // ── Cards ──
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    marginBottom: 8,
  },
  cardImageWrapper: {
    position: 'relative',
    height: 180,
    width: '100%',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  cardIconBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cardIcon: {
    fontSize: 24,
  },
  cardBody: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3e2d',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 13,
    color: '#5a5a5a',
    lineHeight: 20,
    marginBottom: 16,
  },
  learnMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5d873e',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  learnMoreText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default HomeScreen;