import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { styles } from '../Styles/Header.styles';

const avocadoLogo = require('../assets/avocado.png');

interface HeaderProps {
  onMenuPress?: () => void;
  showNavLinks?: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
}

const Header: React.FC<HeaderProps> = ({ onMenuPress, showNavLinks = true }) => {
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const navigation = useNavigation<any>(); 

  const isDesktop = screenWidth >= 768;

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    
    return () => subscription?.remove();
  }, []);

  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem('jwt') || await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('user');
      
      if (token && userData) {
        setUser(JSON.parse(userData));
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      setUser(null);
    }
  };

  useEffect(() => {
    loadUser();

    // Only add window event listeners on web
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleAuthChange = () => {
        loadUser();
      };
      window.addEventListener('authChange', handleAuthChange);
      return () => {
        window.removeEventListener('authChange', handleAuthChange);
      };
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadUser();
    }, [])
  );

  const handleLogout = async () => {
    try {
      setDropdownOpen(false);
      
      await AsyncStorage.multiRemove([
        'token',
        'jwt',
        'user',
        'userId',
        'username',
        'accessToken'
      ]);
      
      setUser(null);
      
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.dispatchEvent(new Event('authChange'));
      }
      
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'MainTabs',
            state: {
              routes: [{ name: 'Home' }],
              index: 0,
            },
          },
        ],
      });
      
      setTimeout(() => {
        Alert.alert('Success', 'Logged out successfully');
      }, 300);
      
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const navigateTo = (screenName: string) => {
    // Check if trying to access Scan without being logged in
    if (screenName === 'Scan' && !user) {
      Alert.alert(
        'Login Required',
        'Please sign in to access the Scan feature.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Sign In',
            onPress: () => navigation.navigate('AuthScreen')
          }
        ]
      );
      return;
    }

    const tabScreens = ['Home', 'CommunityStack', 'Scan', 'Market', 'Profile'];
    if (tabScreens.includes(screenName)) {
      const { CommonActions } = require('@react-navigation/native');
      navigation.dispatch(
        CommonActions.navigate({
          name: 'MainTabs',
          params: { screen: screenName },
        })
      );
    } else {
      navigation.navigate(screenName);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.gradientBackground}>
        <View style={styles.topHeader}>
          {onMenuPress && (
            <TouchableOpacity 
              style={styles.menuButton} 
              onPress={onMenuPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="menu" size={26} color="#5d873e" />
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.logoContainer}
            onPress={() => navigateTo('Home')}
            activeOpacity={0.8}
          >
            <View style={styles.logoWrapper}>
              <View style={styles.logoIconContainer}>
                <Image source={avocadoLogo} style={styles.avocadoImage} resizeMode="contain" />
              </View>
              <View style={styles.logoTextContainer}>
                <Text style={styles.logoText}>AvoCare</Text>
                <Text style={styles.logoSubtext}>Wellness & Growth</Text>
              </View>
            </View>
          </TouchableOpacity>

          {isDesktop && showNavLinks && (
            <View style={styles.navLinks}>
              <TouchableOpacity 
                style={styles.navLink}
                onPress={() => navigateTo('Home')}
                activeOpacity={0.7}
              >
                <Text style={styles.navLinkText}>HOME</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.navLink}
                onPress={() => navigateTo('CommunityStack')}
                activeOpacity={0.7}
              >
                <Text style={styles.navLinkText}>COMMUNITY</Text>
              </TouchableOpacity>
              {/* Only show Scan link if user is logged in */}
              {user && (
                <TouchableOpacity 
                  style={styles.navLink}
                  onPress={() => navigateTo('Scan')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.navLinkText}>SCAN</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.navLink}
                onPress={() => navigateTo('Market')}
                activeOpacity={0.7}
              >
                <Text style={styles.navLinkText}>MARKET</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.navLink}
                onPress={() => navigateTo('About')}
                activeOpacity={0.7}
              >
                <Text style={styles.navLinkText}>ABOUT</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.headerActions}>
            {user ? (
              <View style={styles.userMenu}>
                <TouchableOpacity
                  onPress={() => setDropdownOpen(!dropdownOpen)}
                  style={styles.userButton}
                  activeOpacity={0.8}
                >
                  <View style={styles.userAvatarContainer}>
                    {user.image ? (
                      <Image source={{ uri: user.image }} style={styles.userImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.defaultAvatar}>
                        <Text style={styles.avatarText}>
                          {user.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.statusDot} />
                  </View>
                </TouchableOpacity>

                {dropdownOpen && (
                  <View style={styles.dropdownMenu}>
                    <View style={styles.dropdownHeader}>
                      <View style={styles.dropdownAvatarContainer}>
                        {user.image ? (
                          <Image source={{ uri: user.image }} style={styles.dropdownAvatar} resizeMode="cover" />
                        ) : (
                          <View style={styles.dropdownDefaultAvatar}>
                            <Text style={styles.dropdownAvatarText}>
                              {user.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.userName}>{user.name}</Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                    </View>

                    <View style={styles.dropdownDivider} />

                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setDropdownOpen(false);
                        navigateTo('Profile');
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dropdownIconContainer}>
                        <Ionicons name="person-outline" size={20} color="#5d873e" />
                      </View>
                      <Text style={styles.dropdownText}>My Profile</Text>
                      <Ionicons name="chevron-forward" size={16} color="#999" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setDropdownOpen(false);
                        navigateTo('History');
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dropdownIconContainer}>
                        <Ionicons name="time-outline" size={20} color="#5d873e" />
                      </View>
                      <Text style={styles.dropdownText}>History</Text>
                      <Ionicons name="chevron-forward" size={16} color="#999" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setDropdownOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dropdownIconContainer}>
                        <Ionicons name="settings-outline" size={20} color="#5d873e" />
                      </View>
                      <Text style={styles.dropdownText}>Settings</Text>
                      <Ionicons name="chevron-forward" size={16} color="#999" />
                    </TouchableOpacity>

                    <View style={styles.dropdownDivider} />

                    <TouchableOpacity
                      style={[styles.dropdownItem, styles.logoutItem]}
                      onPress={handleLogout}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.dropdownIconContainer, styles.logoutIconContainer]}>
                        <Ionicons name="log-out-outline" size={20} color="#e74c3c" />
                      </View>
                      <Text style={[styles.dropdownText, styles.logoutText]}>Logout</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => navigateTo('AuthScreen')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#90b481", "#7ba05b"]}
                  style={styles.loginButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="person-outline" size={16} color="#fff" />
                  <Text style={styles.loginButtonText}>Sign In</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

export default Header;