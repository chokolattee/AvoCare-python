import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { View, StyleSheet, Platform, Modal, ScrollView, Animated, TouchableOpacity, Text, Dimensions } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
import EditPostScreen from '../Screens/Forum/EditPostScreen';
import AdminNavigator from './AdminNavigator'; 

// Type definitions
export type TabParamList = {
  Home: undefined;
  CommunityStack: undefined;
  Scan: undefined;
  Market: undefined;
  Profile: undefined;
};

export type CommunityStackParamList = {
  Community: undefined;
  PostDetail: { postId: string };
  EditPost: { postId: string; title: string; content: string; category: string; imageUrl?: string };
};

export type RootStackParamList = {
  MainTabs: undefined;
  Notifications: undefined;
  AuthScreen: undefined;
  Chatbot: undefined;
  About: undefined;
  Admin: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createStackNavigator<RootStackParamList>();
const CommunityStackNav = createStackNavigator<CommunityStackParamList>();

// Mobile Menu Modal Component
function MobileMenuModal({ visible, onClose, navigation }: { visible: boolean; onClose: () => void; navigation: any }) {
  const [screenWidth, setScreenWidth] = useState(getScreenWidth());
  const slideAnim = useRef(new Animated.Value(-screenWidth * 0.75)).current;
  
  const menuItems = [
    { name: 'Home', route: 'Home', icon: 'home-outline' },
    { name: 'Community', route: 'CommunityStack', icon: 'people-outline' },
    { name: 'Scan', route: 'Scan', icon: 'camera-outline' },
    { name: 'Market', route: 'Market', icon: 'storefront-outline' },
    { name: 'About', route: 'About', icon: 'information-circle-outline' },
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
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.modalMenuItem}
                  onPress={() => handleNavigate(item.route)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={item.icon as any} size={22} color="#5d873e" />
                  <Text style={styles.modalMenuText}>{item.name}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#999" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

// Custom Header - No wrapper View
function CustomHeader({ navigation }: { navigation: any }) {
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [screenWidth, setScreenWidth] = useState(getScreenWidth());
  const isMobile = screenWidth < 768;

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
      if (window.width >= 768 && mobileMenuVisible) {
        setMobileMenuVisible(false);
      }
    });
    
    return () => subscription?.remove();
  }, [mobileMenuVisible]);

  return (
    <>
      <Header onMenuPress={isMobile ? () => setMobileMenuVisible(true) : undefined} />
      
      {isMobile && (
        <MobileMenuModal 
          visible={mobileMenuVisible}
          onClose={() => setMobileMenuVisible(false)}
          navigation={navigation}
        />
      )}
    </>
  );
}

// Community Stack Navigator
function CommunityStackNavigator() {
  return (
    <CommunityStackNav.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <CommunityStackNav.Screen name="Community" component={CommunityScreen} />
      <CommunityStackNav.Screen name="PostDetail" component={PostDetailScreen} />
      <CommunityStackNav.Screen name="EditPost" component={EditPostScreen} />
    </CommunityStackNav.Navigator>
  );
}

// Main Tab Navigator
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        header: () => <CustomHeader navigation={navigation} />,
        headerStyle: {
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'CommunityStack':
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
          display: 'none',
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
        name="CommunityStack"
        component={CommunityStackNavigator}
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

// Root Stack Navigator
export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState<'MainTabs' | 'Admin'>('MainTabs');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.role === 'admin') {
          setInitialRoute('Admin');
        }
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    } finally {
      setIsReady(true);
    }
  };

  if (!isReady) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
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
        <Stack.Screen 
          name="Chatbot" 
          component={ChatbotScreen}
          options={{
            presentation: 'card', 
            headerShown: false, 
          }}
        />
        <Stack.Screen 
          name="Admin" 
          component={AdminNavigator}
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '70%',
    maxWidth: 280,
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'ios' ? 50 : 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e8f5e0',
    backgroundColor: '#5d873e',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    flex: 1,
    paddingTop: 8,
  },
  modalMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    gap: 12,
  },
  modalMenuText: {
    flex: 1,
    fontSize: 15,
    color: '#2d5a3d',
    fontWeight: '600',
  },
});