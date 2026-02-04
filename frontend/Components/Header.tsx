import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface HeaderProps {
  onMenuPress?: () => void;
}

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
}

const Header: React.FC<HeaderProps> = ({ onMenuPress }) => {
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
    
    const handleAuthChange = () => {
      loadUser();
    };
    
    if (typeof window !== 'undefined') {
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
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('authChange'));
      }
      
      navigation.navigate('Home');
      
      setTimeout(() => {
        Alert.alert('Success', 'Logged out successfully');
      }, 300);
      
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Simple navigation handler
  const navigateTo = (screenName: string) => {
    console.log('Navigating to:', screenName);
    navigation.navigate(screenName);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#5d873e', '#4a6e32']}
        style={styles.gradientBackground}
      >
        <View style={styles.topHeader}>
          {!isDesktop && onMenuPress && (
            <TouchableOpacity 
              style={styles.menuButton} 
              onPress={onMenuPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="menu" size={26} color="#fff" />
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.logoContainer}
            onPress={() => navigateTo('Home')}
            activeOpacity={0.8}
          >
            <View style={styles.logoWrapper}>
              {/* Avocado Icon */}
              <View style={styles.logoIconContainer}>
                <Text style={styles.avocadoIcon}>🥑</Text>
              </View>
              <View style={styles.logoTextContainer}>
                <Text style={styles.logoText}>AvoCare</Text>
                <Text style={styles.logoSubtext}>Wellness & Growth</Text>
              </View>
            </View>
          </TouchableOpacity>

          {isDesktop && (
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
                onPress={() => navigateTo('Community')}
                activeOpacity={0.7}
              >
                <Text style={styles.navLinkText}>COMMUNITY</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.navLink}
                onPress={() => navigateTo('Scan')}
                activeOpacity={0.7}
              >
                <Text style={styles.navLinkText}>SCAN</Text>
              </TouchableOpacity>
              
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
                      <Image source={{ uri: user.image }} style={styles.userImage} />
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
                          <Image source={{ uri: user.image }} style={styles.dropdownAvatar} />
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
                  colors={['#90b481', '#7ba05b']}
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
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#5d873e',
    zIndex: 1000,
  },
  gradientBackground: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: width < 375 ? 12 : 20,
    paddingBottom: 16,
  },
  menuButton: {
    padding: 8,
    marginRight: 8,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginRight: 'auto',
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avocadoIcon: {
    fontSize: 28,
  },
  logoTextContainer: {
    justifyContent: 'center',
  },
  logoText: {
    fontSize: width < 375 ? 18 : 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  logoSubtext: {
    fontSize: 10,
    color: '#e8ffd7',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 24,
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -150 }],
  },
  navLink: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  navLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  loginButton: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: width < 375 ? 16 : 20,
    paddingVertical: 10,
    gap: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: width < 375 ? 13 : 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  userMenu: {
    position: 'relative',
    zIndex: 1001,
  },
  userButton: {
    padding: 4,
  },
  userAvatarContainer: {
    position: 'relative',
  },
  userImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  defaultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e8ffd7',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5d873e',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 55,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 16,
    minWidth: 240,
    elevation: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    zIndex: 9999,
    borderWidth: 1,
    borderColor: '#e8f5e0',
    overflow: 'hidden',
  },
  dropdownHeader: {
    padding: 20,
    backgroundColor: '#f8fdf5',
    alignItems: 'center',
  },
  dropdownAvatarContainer: {
    marginBottom: 12,
  },
  dropdownAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#5d873e',
  },
  dropdownDefaultAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#5d873e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#8BC34A',
  },
  dropdownAvatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d5a3d',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: '#666',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  dropdownIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f7ed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#2d5a3d',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#e8f5e0',
  },
  logoutItem: {
    backgroundColor: '#fff5f5',
  },
  logoutIconContainer: {
    backgroundColor: '#ffe8e8',
  },
  logoutText: {
    color: '#e74c3c',
  },
});

export default Header;