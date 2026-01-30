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
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

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

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 64) / 3 - 20;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  // Carousel state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  const heroImages = [
    {
      uri: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=1200&h=500&fit=crop',
      title: 'Fresh Avocados',
      subtitle: 'Premium quality fruit'
    },
    {
      uri: 'https://images.unsplash.com/photo-1601039641847-7857b994d704?w=1200&h=500&fit=crop',
      title: 'Avocado Farms',
      subtitle: 'Sustainable farming practices'
    },
    {
      uri: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=1200&h=500&fit=crop',
      title: 'Avocado Trees',
      subtitle: 'Healthy growth and care'
    },
    {
      uri: 'https://images.unsplash.com/photo-1583663848850-46af132dc08e?w=1200&h=500&fit=crop',
      title: 'Ripe Avocados',
      subtitle: 'Ready for harvest'
    }
  ];

  // Auto-slide effect - faster transitions
  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        // Change image
        setCurrentImageIndex((prevIndex) => 
          (prevIndex + 1) % heroImages.length
        );
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });
    }, 3500); // Change image every 3.5 seconds for more dynamic feel

    return () => clearInterval(interval);
  }, []);

  const benefits = [
    {
      id: 1,
      title: "Rich in Nutrients",
      description: "Packed with vitamins K, E, C and B vitamins essential for body functions",
      image: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=500&h=400&fit=crop"
    },
    {
      id: 2,
      title: "Heart Healthy",
      description: "Contains monounsaturated fats that support cardiovascular health",
      image: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=500&h=400&fit=crop"
    },
    {
      id: 3,
      title: "Improves Digestion",
      description: "High fiber content promotes healthy digestive system",
      image: "https://images.unsplash.com/photo-1604084849824-64e96c376dbd?w=500&h=400&fit=crop"
    }
  ];

  const diseases = [
    {
      id: 1,
      name: "Anthracnose",
      description: "Fungal disease causing dark lesions on fruit and leaves",
      image: "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=500&h=400&fit=crop"
    },
    {
      id: 2,
      name: "Root Rot",
      description: "Caused by Phytophthora fungus affecting roots",
      image: "https://images.unsplash.com/photo-1574856344991-aaa31b6f4ce3?w=500&h=400&fit=crop"
    },
    {
      id: 3,
      name: "Avocado Scab",
      description: "Fungal disease creating raised scabby lesions",
      image: "https://images.unsplash.com/photo-1551334787-21e6bd3ab135?w=500&h=400&fit=crop"
    }
  ];

  const pests = [
    {
      id: 1,
      name: "Avocado Thrips",
      description: "Tiny insects causing scarring on fruit surface",
      image: "https://images.unsplash.com/photo-1576685801446-1cb49e93e75d?w=500&h=400&fit=crop"
    },
    {
      id: 2,
      name: "Avocado Lace Bug",
      description: "Sap-sucking insects causing leaf discoloration",
      image: "https://images.unsplash.com/photo-1582048928148-43b0a1b6b7b4?w=500&h=400&fit=crop"
    },
    {
      id: 3,
      name: "Spider Mites",
      description: "Small arachnids that feed on plant sap",
      image: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=500&h=400&fit=crop"
    }
  ];

  const renderCard = (
    item: any,
    type: 'benefit' | 'disease' | 'pest',
  ) => {
    return (
      <View key={item.id} style={[styles.card, { width: CARD_WIDTH }]}>
        <View style={styles.cardImageWrapper}>
          <Image source={{ uri: item.image }} style={styles.cardImage} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {type === 'benefit' ? 'HEALTH' : type === 'disease' ? 'DISEASE' : 'PEST'}
            </Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>
            {type === 'benefit' ? item.title : item.name}
          </Text>
          <Text style={styles.cardDescription}>
            {item.description}
          </Text>
          <TouchableOpacity style={styles.learnMoreBtn}>
            <Text style={styles.learnMoreText}>Learn More</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSection = (
    items: any[],
    type: 'benefit' | 'disease' | 'pest',
    icon: string,
    title: string,
    subtitle: string
  ) => {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>{icon}</Text>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
        
        <View style={styles.horizontalCardsContainer}>
          {items.map((item) => renderCard(item, type))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={true}
      >
        {/* Hero Section with Sliding Images */}
        <View style={styles.hero}>
          {/* Animated Image */}
          <Animated.View style={[styles.heroImageContainer, { opacity: fadeAnim }]}>
            <Image
              source={{ uri: heroImages[currentImageIndex].uri }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </Animated.View>
          
          {/* Animated overlay */}
          <LinearGradient
            colors={['rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0.3)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroOverlay}
          />
          
          <View style={styles.heroContent}>
            <Text style={styles.heroSubheading}>CALIFORNIA AVOCADOS</Text>
            <Animated.Text style={[styles.heroTitle, { opacity: fadeAnim }]}>
              {heroImages[currentImageIndex].title}
            </Animated.Text>
            <Animated.Text style={[styles.heroDescription, { opacity: fadeAnim }]}>
              {heroImages[currentImageIndex].subtitle}
            </Animated.Text>
            <TouchableOpacity style={styles.learnMoreButton}>
              <Text style={styles.learnMoreButtonText}>LEARN MORE</Text>
            </TouchableOpacity>
          </View>
          
          {/* Carousel Indicators */}
          <View style={styles.carouselIndicators}>
            {heroImages.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.indicator,
                  currentImageIndex === index && styles.activeIndicator
                ]}
                onPress={() => {
                  Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                  }).start(() => {
                    setCurrentImageIndex(index);
                    Animated.timing(fadeAnim, {
                      toValue: 1,
                      duration: 300,
                      useNativeDriver: true,
                    }).start();
                  });
                }}
              />
            ))}
          </View>
        </View>

        {/* Health Benefits Section */}
        {renderSection(
          benefits, 
          'benefit', 
          '❤️', 
          'Avocado Health Benefits',
          'Discover the amazing nutritional advantages'
        )}

        {/* Diseases Section */}
        {renderSection(
          diseases, 
          'disease', 
          '⚠️', 
          'Common Avocado Diseases',
          'Learn to identify and prevent plant diseases'
        )}

        {/* Pests Section */}
        {renderSection(
          pests, 
          'pest', 
          '🐛', 
          'Pests & Insects',
          'Identify common pests affecting avocado trees'
        )}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 20 : 20,
  },
  hero: {
    height: Dimensions.get('window').height * 0.65, // 65% of screen height
    minHeight: 400,
    maxHeight: 600,
    position: 'relative',
    overflow: 'hidden',
    marginTop: 0,
  },
  heroImageContainer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    zIndex: 1,
  },
  heroSubheading: {
    fontSize: Platform.OS === 'ios' ? 13 : 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 2,
  },
  heroTitle: {
    fontSize: width < 375 ? 28 : 34,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: width < 375 ? 36 : 42,
    paddingHorizontal: 10,
  },
  heroDescription: {
    fontSize: width < 375 ? 14 : 15,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.95,
    paddingHorizontal: 20,
  },
  learnMoreButton: {
    backgroundColor: '#D4A574',
    paddingHorizontal: width < 375 ? 28 : 36,
    paddingVertical: width < 375 ? 12 : 14,
    borderRadius: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  learnMoreButtonText: {
    color: '#fff',
    fontSize: width < 375 ? 13 : 14,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  carouselIndicators: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 2,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeIndicator: {
    backgroundColor: '#fff',
    width: 24,
    borderRadius: 5,
  },
  section: {
    marginTop: 32,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  sectionHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3d4d3d',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  horizontalCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 16,
    flexWrap: 'wrap',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 8,
  },
  cardImageWrapper: {
    position: 'relative',
    height: 140,
    width: '100%',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cardBody: {
    padding: 12,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3e2d',
    marginBottom: 6,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 12,
    color: '#5a5a5a',
    lineHeight: 18,
    marginBottom: 12,
    textAlign: 'center',
    flex: 1,
  },
  learnMoreBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    marginTop: 'auto',
  },
  learnMoreText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  bottomSpacer: {
    height: 20,
  },
});

export default HomeScreen;