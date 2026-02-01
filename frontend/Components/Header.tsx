import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { logoutMobile} from '../Utils/authMobile';

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

type NavigationProp = StackNavigationProp<{
  Home: undefined;
  Community: undefined;
  Scan: undefined;
  Market: undefined;
  Profile: undefined;
  Notifications: undefined;
  AuthScreen: undefined;
}>;

const Header: React.FC<HeaderProps> = ({ onMenuPress }) => {
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigation = useNavigation<NavigationProp>();

  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem('jwt');
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
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadUser();
    }, [])
  );

  const handleLogout = async () => {
    try {
    if (Platform.OS === 'web') {
      // Web logout - clear sessionStorage
      sessionStorage.removeItem('jwt');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('userId');
      sessionStorage.removeItem('accessToken');
    } else {
      // Mobile logout - use logoutMobile
      await logoutMobile();
    }
    
    // Update local state
    setUser(null);
    setDropdownOpen(false);
    
    // Navigate to Home
    navigation.navigate('Home');
  } catch (error) {
    console.error('Error logging out:', error);
  }
};

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#ffffff', '#f8fdf5']}
        style={styles.gradientBackground}
      >
        <View style={styles.topHeader}>
          {width < 768 && onMenuPress && (
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
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.8}
          >
            <View style={styles.logoWrapper}>
              <View style={styles.logoIcon}>
                <Ionicons name="leaf" size={28} color="#5d873e" />
              </View>
              <View style={styles.logoTextContainer}>
                <Text style={styles.logoText}>AvoCare</Text>
                <Text style={styles.logoSubtext}>Wellness & Growth</Text>
              </View>
            </View>
          </TouchableOpacity>

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
                        navigation.navigate('Profile');
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
                        // Navigate to settings if available
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
                onPress={() => navigation.navigate('AuthScreen')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#5d873e', '#4a6e32']}
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
      
      {/* Subtle bottom shadow */}
      <View style={styles.shadowLine} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    zIndex: 1000,
  },
  gradientBackground: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: width < 375 ? 12 : 16,
    paddingBottom: 12,
  },
  shadowLine: {
    height: 1,
    backgroundColor: '#e8f5e0',
  },
  menuButton: {
    padding: 8,
    marginRight: 8,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f7ed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    flex: 1,
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f7ed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoTextContainer: {
    justifyContent: 'center',
  },
  logoText: {
    fontSize: width < 375 ? 18 : 22,
    fontWeight: '800',
    color: '#2d5a3d',
    letterSpacing: 0.5,
  },
  logoSubtext: {
    fontSize: 10,
    color: '#5d873e',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginButton: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#5d873e',
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
    borderColor: '#5d873e',
  },
  defaultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5d873e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8BC34A',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
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