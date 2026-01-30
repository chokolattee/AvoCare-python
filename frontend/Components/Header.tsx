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
      await AsyncStorage.removeItem('jwt');
      await AsyncStorage.removeItem('user');
      setUser(null);
      setDropdownOpen(false);
      navigation.navigate('Home');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        {width < 768 && onMenuPress && (
          <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
            <Ionicons name="menu" size={28} color="#5d873e" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.logoContainer}
          onPress={() => navigation.navigate('Home')}
        >
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <View style={styles.headerActions}>
          {user ? (
            <View style={styles.userMenu}>
              <TouchableOpacity
                onPress={() => setDropdownOpen(!dropdownOpen)}
                style={styles.userButton}
              >
                {user.image ? (
                  <Image source={{ uri: user.image }} style={styles.userImage} />
                ) : (
                  <Ionicons name="person-circle-outline" size={32} color="#5d873e" />
                )}
              </TouchableOpacity>

              {dropdownOpen && (
                <View style={styles.dropdownMenu}>
                  <View style={styles.dropdownHeader}>
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
                  >
                    <Ionicons name="person-outline" size={20} color="#5d873e" />
                    <Text style={styles.dropdownText}>Profile</Text>
                  </TouchableOpacity>

                  <View style={styles.dropdownDivider} />

                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={handleLogout}
                  >
                    <Ionicons name="log-out-outline" size={20} color="#e74c3c" />
                    <Text style={[styles.dropdownText, styles.logoutText]}>Logout</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => navigation.navigate('AuthScreen')}
            >
              <Text style={styles.loginButtonText}>LOG IN</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    zIndex: 1000,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: width < 375 ? 12 : 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuButton: {
    padding: 8,
    marginRight: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: width < 375 ? 100 : 120,
    height: width < 375 ? 34 : 40,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginButton: {
    paddingHorizontal: width < 375 ? 14 : 20,
    paddingVertical: 8,
  },
  loginButtonText: {
    color: '#666',
    fontSize: width < 375 ? 12 : 13,
    fontWeight: '600',
  },
  userMenu: {
    position: 'relative',
    zIndex: 1001,
  },
  userButton: {
    padding: 4,
  },
  userImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#5d873e',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 45,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    minWidth: 200,
    elevation: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 9999,
    borderWidth: 1,
    borderColor: '#A5C89E',
  },
  dropdownHeader: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d5a3d',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 12,
    color: '#666',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  dropdownText: {
    fontSize: 16,
    color: '#5d873e',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  logoutText: {
    color: '#e74c3c',
  },
});

export default Header;