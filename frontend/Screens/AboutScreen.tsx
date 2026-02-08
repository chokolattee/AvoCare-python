import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import Footer from '../Components/Footer';
import { styles } from '../Styles/AboutScreen.styles';

const avocadoLogo = require('../assets/avocado.png');

// Import team member images
const calungsodImage = require('../assets/team/calungsod.png');
const mateoImage = require('../assets/team/mateo.png');
const talabaImage = require('../assets/team/talaba.png');
const yagoImage = require('../assets/team/yago.png');

type RootStackParamList = {
  Home: undefined;
  About: undefined;
  Community: undefined;
  CommunityStack: undefined;
  Scan: undefined;
  Market: undefined;
  Profile: undefined;
  MainTabs: undefined;
};

type AboutScreenNavigationProp = StackNavigationProp<RootStackParamList, 'About'>;
type AboutScreenRouteProp = RouteProp<RootStackParamList, 'About'>;

interface Props {
  navigation: AboutScreenNavigationProp;
  route: AboutScreenRouteProp;
}

interface TeamMember {
  name: string;
  image?: any;
  bio: string;
  linkedin?: string;
  email?: string;
}

const AboutScreen: React.FC<Props> = ({ navigation }) => {
  // Responsive state
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const { width } = dimensions;
  const isMobile = width < 768;

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    
    return () => subscription?.remove();
  }, []);

  const teamMembers: TeamMember[] = [
    {
      name: 'Mary Pauline Calungsod',
      image: calungsodImage,
      bio: 'Full-stack developer passionate about sustainable agriculture technology',
      email: 'marypauline.calungsod@tup.edu.ph',
      linkedin: 'https://linkedin.com/in/juandelacruz',
    },
    {
      name: 'Xyrvi Mateo',
      image: mateoImage,
      bio: 'Creating beautiful and intuitive interfaces for farmers',
      email: 'xyrvi.mateo@tup.edu.ph',
      linkedin: 'https://linkedin.com/in/mariasantos',
    },
    {
      name: 'Karl Jexel Talaba',
      image: talabaImage,
      bio: 'Expert in avocado cultivation with 10+ years of experience',
      email: 'karljexel.talaba@tup.edu.ph',
      linkedin: 'https://linkedin.com/in/pedroreyes',
    },
    {
      name: 'Alvin Symo Yago',
      image: yagoImage,
      bio: 'Developing AI models for plant disease detection and analytics',
      email: 'ana@avocare.com',
      linkedin: 'https://linkedin.com/in/anagarcia',
    },
    {
      name: 'Pops Madriaga',
      bio: 'Leading product strategy and bringing innovative solutions to farmers',
      email: 'carlos@avocare.com',
      linkedin: 'https://linkedin.com/in/carlosmendoza',
    },
  ];

  const features = [
    {
      icon: 'scan',
      title: 'Plant Disease Detection',
      description: 'AI-powered scanning to identify and diagnose plant health issues',
    },
    {
      icon: 'chatbubbles',
      title: 'Expert Consultation',
      description: 'Get real-time advice from agricultural experts through our chatbot',
    },
    {
      icon: 'people',
      title: 'Community Forum',
      description: 'Connect with fellow farmers and share knowledge',
    },
    {
      icon: 'analytics',
      title: 'Farm Analytics',
      description: 'Track your farm performance with detailed insights and reports',
    },
    {
      icon: 'cart',
      title: 'Marketplace',
      description: 'Buy and sell avocado products directly through the platform',
    },
    {
      icon: 'book',
      title: 'Learning Resources',
      description: 'Access comprehensive guides on avocado cultivation',
    },
  ];

  const openURL = (url: string) => {
    Linking.openURL(url).catch((err) => console.error('Failed to open URL:', err));
  };

  // Web-specific scroll style
  const scrollViewStyle = Platform.OS === 'web' 
    ? [{ height: '100vh' as any }] 
    : undefined;

  return (
    <View style={styles.container}>
      <ScrollView
        style={scrollViewStyle}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        nestedScrollEnabled={true}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={[styles.heroContent, { 
            paddingHorizontal: isMobile ? 16 : 40,
            maxWidth: isMobile ? '100%' : 1200,
            alignSelf: 'center',
            width: '100%'
          }]}>
            <View style={[styles.logoContainer, { 
              width: isMobile ? 100 : 120, 
              height: isMobile ? 100 : 120,
              borderRadius: isMobile ? 50 : 60 
            }]}>
              <Image source={avocadoLogo} style={[styles.logo, {
                width: isMobile ? 65 : 80,
                height: isMobile ? 65 : 80,
              }]} />
            </View>
            <Text style={[styles.heroTitle, { fontSize: isMobile ? 28 : 36 }]}>About AvoCare</Text>
            <Text style={[styles.heroSubtitle, { fontSize: isMobile ? 14 : 16 }]}>
              Empowering Avocado Farmers Through Technology
            </Text>
          </View>
        </View>

        {/* Mission Section */}
        <View style={[styles.section, { 
          paddingHorizontal: isMobile ? 16 : 40,
          maxWidth: isMobile ? '100%' : 1200,
          alignSelf: 'center',
          width: '100%'
        }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="leaf" size={isMobile ? 24 : 28} color="#5d873e" />
            <Text style={[styles.sectionTitle, { fontSize: isMobile ? 20 : 24 }]}>Our Mission</Text>
          </View>
          <Text style={styles.missionText}>
            AvoCare is dedicated to revolutionizing avocado farming in the Philippines through 
            innovative technology and community collaboration. We provide farmers with the tools 
            they need to grow healthier crops, increase yields, and connect with a supportive 
            network of agricultural professionals.
          </Text>
          <Text style={styles.missionText}>
            Our platform combines AI-powered plant disease detection, real-time expert consultation, 
            comprehensive analytics, and a thriving marketplace to create an all-in-one solution 
            for sustainable avocado cultivation.
          </Text>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <View style={{
            paddingHorizontal: isMobile ? 16 : 40,
            maxWidth: isMobile ? '100%' : 1200,
            alignSelf: 'center',
            width: '100%'
          }}>
          <View style={styles.sectionHeader}>
            <Ionicons name="grid" size={isMobile ? 24 : 28} color="#5d873e" />
            <Text style={[styles.sectionTitle, { fontSize: isMobile ? 20 : 24 }]}>Key Features</Text>
          </View>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={[styles.featureIconContainer, {
                  width: isMobile ? 56 : 64,
                  height: isMobile ? 56 : 64,
                  borderRadius: isMobile ? 28 : 32,
                }]}>
                  <Ionicons name={feature.icon as any} size={isMobile ? 28 : 32} color="#5d873e" />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            ))}
          </View>
          </View>
        </View>

        {/* Team Section */}
        <View style={[styles.teamSection, { 
          paddingHorizontal: isMobile ? 16 : 40,
          maxWidth: isMobile ? '100%' : 1200,
          alignSelf: 'center',
          width: '100%'
        }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people" size={isMobile ? 24 : 28} color="#5d873e" />
            <Text style={[styles.sectionTitle, { fontSize: isMobile ? 20 : 24 }]}>Meet Our Team</Text>
          </View>
          <Text style={styles.teamIntro}>
            Our dedicated team of developers, designers, and agricultural experts working 
            together to make AvoCare the best platform for avocado farmers.
          </Text>
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              flexDirection: 'row',
              gap: isMobile ? 12 : 20,
              paddingLeft: isMobile ? 8 : 0,
              paddingRight: isMobile ? 8 : 0,
              justifyContent: isMobile ? 'flex-start' : 'center',
            }}
          >
            {teamMembers.map((member, index) => (
              <View
                key={index}
                style={[
                  styles.memberCard,
                  {
                    minWidth: isMobile ? 220 : 220,
                    maxWidth: isMobile ? 220 : 220,
                    width: isMobile ? 220 : 220,
                  },
                ]}
              >
                <View style={styles.memberImageContainer}>
                  <Image
                    source={member.image}
                    style={[
                      styles.memberImage,
                      {
                        width: isMobile ? 80 : 100,
                        height: isMobile ? 80 : 100,
                        borderRadius: isMobile ? 40 : 50,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberBio}>{member.bio}</Text>
                <View style={styles.memberLinks}>
                  {member.email && (
                    <TouchableOpacity
                      style={styles.socialLink}
                      onPress={() => openURL(`mailto:${member.email}`)}
                    >
                      <Ionicons name="mail" size={20} color="#5d873e" />
                    </TouchableOpacity>
                  )}
                  {member.linkedin && (
                    <TouchableOpacity
                      style={styles.socialLink}
                      onPress={() => openURL(member.linkedin!)}
                    >
                      <Ionicons name="logo-linkedin" size={20} color="#5d873e" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        <Footer />
      </ScrollView>
    </View>
  );
};

export default AboutScreen;