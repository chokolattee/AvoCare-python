import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { View, StyleSheet, Platform, TextInput, TouchableOpacity, Text, Dimensions, Modal, ScrollView, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';

const getScreenWidth = () => Dimensions.get('window').width;

import Header from '../Components/Header';
import HomeScreen from '../Screens/HomeScreen';
import ScanScreen from '../Screens/ScanScreen';
import CommunityScreen from '../Screens/Forum/CommunityScreen';
import MarketScreen from '../Screens/MarketScreen';
import AuthScreen from '../Screens/Auth/AuthScreen';
import ProfileScreen from '../Screens/Auth/ProfileScreen';
import ChatbotScreen from '../Screens/Forum/ChatbotScreen';
import PostDetailScreen from '../Screens/Forum/PostDetailScreen';
import CreatePostScreen from '../Screens/Forum/CreatePostScreen';
import EditPostScreen from '../Screens/Forum/EditPostScreen'; 

// Type definitions
export type TabParamList = {
  Home: undefined;
  CommunityStack: undefined;  // Changed from Community to CommunityStack
  Scan: undefined;
  Market: undefined;
  Profile: undefined;
};

// New type for Community stack
export type CommunityStackParamList = {
  Community: undefined;
  PostDetail: { postId: string };
  CreatePost: undefined;
  EditPost: { postId: string; title: string; content: string; category: string; imageUrl?: string };
};

export type RootStackParamList = {
  MainTabs: undefined;
  Notifications: undefined;
  AuthScreen: undefined;
  Chatbot: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createStackNavigator<RootStackParamList>();
const CommunityStackNav = createStackNavigator<CommunityStackParamList>();

// Search Bar Component
function SearchBar() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <View style={styles.searchBarContainer}>
      <View style={styles.searchInputWrapper}>
        <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search the site"
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
    </View>
  );
}

// Mobile Menu Modal Component
function MobileMenuModal({ visible, onClose, navigation }: { visible: boolean; onClose: () => void; navigation: any }) {
  const [screenWidth, setScreenWidth] = useState(getScreenWidth());
  const slideAnim = useRef(new Animated.Value(-screenWidth * 0.75)).current;
  
  const menuItems = [
    { name: 'Home', route: 'Home', icon: 'home-outline' },
    { name: 'Community', route: 'CommunityStack', icon: 'people-outline' },  // Updated to CommunityStack
    { name: 'Scan', route: 'Scan', icon: 'camera-outline' },
    { name: 'Market', route: 'Market', icon: 'storefront-outline' },
  ];

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -screenWidth * 0.75,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, screenWidth]);

  const handleNavigate = (route: string) => {
    navigation.navigate(route);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View 
          style={[
            styles.modalContent,
            { transform: [{ translateX: slideAnim }] }
          ]}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{ flex: 1 }}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Menu</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="#5d873e" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.modalMenuItem}
                  onPress={() => handleNavigate(item.route)}
                >
                  <Ionicons name={item.icon as any} size={24} color="#5d873e" />
                  <Text style={styles.modalMenuText}>{item.name}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

// Navigation Menu Component
function NavigationMenu({ navigation }: { navigation: any }) {
  const [screenWidth, setScreenWidth] = useState(getScreenWidth());
  const iconSize = screenWidth < 375 ? 18 : 20;
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    
    return () => subscription?.remove();
  }, []);
  
  return (
    <View style={styles.navigationMenu}>
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => navigation.navigate('Home')}
      >
        <View style={styles.navButton}>
          <Ionicons name="home-outline" size={iconSize} color="#fff" />
          <Text style={styles.navText}>HOME</Text>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => navigation.navigate('CommunityStack')}
      >
        <View style={styles.navButton}>
          <Ionicons name="people-outline" size={iconSize} color="#fff" />
          <Text style={styles.navText}>COMMUNITY</Text>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => navigation.navigate('Scan')}
      >
        <View style={styles.navButton}>
          <Ionicons name="camera-outline" size={iconSize} color="#fff" />
          <Text style={styles.navText}>SCAN</Text>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => navigation.navigate('Market')}
      >
        <View style={styles.navButton}>
          <Ionicons name="storefront-outline" size={iconSize} color="#fff" />
          <Text style={styles.navText}>MARKET</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// Custom Header with Navigation
function CustomHeader({ navigation }: { navigation: any }) {
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [screenWidth, setScreenWidth] = useState(getScreenWidth());
  const isMobile = screenWidth < 768;

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
      // Close mobile menu if screen becomes larger
      if (window.width >= 768 && mobileMenuVisible) {
        setMobileMenuVisible(false);
      }
    });
    
    return () => subscription?.remove();
  }, [mobileMenuVisible]);

  return (
    <View>
      {/* Header with hamburger menu handler for mobile */}
      <Header onMenuPress={isMobile ? () => setMobileMenuVisible(true) : undefined} />
      
      {/* Search Bar - Always visible */}
      <SearchBar />
      
      {/* Desktop/Tablet Navigation - Only show on larger screens */}
      {!isMobile && <NavigationMenu navigation={navigation} />}
      
      {/* Mobile Menu Modal - Only render on mobile */}
      {isMobile && (
        <MobileMenuModal 
          visible={mobileMenuVisible}
          onClose={() => setMobileMenuVisible(false)}
          navigation={navigation}
        />
      )}
    </View>
  );
}

// Community Stack Navigator - ADDED THIS
function CommunityStackNavigator() {
  return (
    <CommunityStackNav.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <CommunityStackNav.Screen name="Community" component={CommunityScreen} />
      <CommunityStackNav.Screen name="PostDetail" component={PostDetailScreen} />
      <CommunityStackNav.Screen name="CreatePost" component={CreatePostScreen} />
      <CommunityStackNav.Screen name="EditPost" component={EditPostScreen} />
    </CommunityStackNav.Navigator>
  );
}

// Main Tab Navigator with custom Header
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        header: () => <CustomHeader navigation={navigation} />,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'CommunityStack':  // Updated from Community
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Scan':
              iconName = 'camera';
              break;
            case 'Market':
              iconName = focused ? 'storefront' : 'storefront-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'home-outline';
          }
          if (route.name === 'Scan') {
            return (
              <View style={styles.scanButtonContainer}>
                <View style={styles.scanButton}>
                  <Ionicons name={iconName} size={32} color="#fff" />
                </View>
              </View>
            );
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#7FA66D',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          display: 'none', // Hide the bottom tab bar
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 5,
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ 
          title: 'Home',
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen 
        name="CommunityStack"  // Changed from Community to CommunityStack
        component={CommunityStackNavigator}  // Use the stack navigator
        options={{ 
          title: 'Community',
          tabBarLabel: 'Community',
        }}
      />
      <Tab.Screen 
        name="Scan" 
        component={ScanScreen}
        options={{
          title: 'Scan',
          tabBarLabel: '',
        }}
      />
      <Tab.Screen 
        name="Market" 
        component={MarketScreen}
        options={{ 
          title: 'Market',
          tabBarLabel: 'Market',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ 
          title: 'Profile',
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

// Root Stack Navigator (handles Screens outside of tabs)
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen 
          name="AuthScreen" 
          component={AuthScreen}
          options={{
            presentation: 'modal',
          }}
        />
        {/* Chatbot Screen */}
        <Stack.Screen 
          name="Chatbot" 
          component={ChatbotScreen}
          options={{
            presentation: 'card', 
            headerShown: false, 
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scanButtonContainer: {
    position: 'absolute',
    top: -25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButton: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#7FA66D',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderWidth: 5,
    borderColor: '#ffffff',
  },
  searchBarContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  navigationMenu: {
    backgroundColor: '#2d5a3d',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  navText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Mobile Menu Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '75%',
    maxWidth: 300,
    height: '100%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2d5a3d',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
  },
  modalMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 16,
  },
  modalMenuText: {
    flex: 1,
    fontSize: 18,
    color: '#2d5a3d',
    fontWeight: '500',
  },
});