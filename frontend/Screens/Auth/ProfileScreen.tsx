import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Yup from 'yup';
import { API_BASE_URL } from '../../config/api';
const API_URL = `${API_BASE_URL}/api/users/`;

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
  status: string;
}

const personalSchema = Yup.object().shape({
  name: Yup.string().min(2, 'Name must be at least 2 characters').required('Name is required'),
});

const securitySchema = Yup.object().shape({
  currentPassword: Yup.string().required('Current password is required'),
  newPassword: Yup.string().min(6, 'Password must be at least 6 characters').required('New password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword')], 'Passwords must match')
    .required('Please confirm your password'),
});

const ProfileScreen: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'security'>('personal');
  const [loading, setLoading] = useState(false);
  
  // Personal Info
  const [name, setName] = useState('');
  const [image, setImage] = useState<string | null>(null);
  
  // Security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const navigation = useNavigation();

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setName(parsedUser.name);
        setImage(parsedUser.image || null);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadUser();
    }, [])
  );

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleUpdatePersonal = async () => {
    setErrors({});

    try {
      await personalSchema.validate({ name }, { abortEarly: false });

      setLoading(true);

      const token = await AsyncStorage.getItem('jwt');
      const formData = new FormData();
      
      formData.append('name', name.trim());

      if (image && image !== user?.image) {
        let fileName: string;
        let fileType: string;
        
        if (Platform.OS === 'web' || image.startsWith('blob:')) {
          fileName = `photo_${Date.now()}.jpg`;
          fileType = 'jpg';
        } else {
          const uriParts = image.split('.');
          fileType = uriParts[uriParts.length - 1];
          fileName = `photo_${Date.now()}.${fileType}`;
        }
        
        const mimeType = `image/${fileType === 'jpg' ? 'jpeg' : fileType}`;

        if (Platform.OS === 'web' || image.startsWith('blob:')) {
          const response = await fetch(image);
          const blob = await response.blob();
          const file = new File([blob], fileName, { type: mimeType });
          formData.append('image', file);
        } else {
          formData.append('image', {
            uri: image,
            type: mimeType,
            name: fileName,
          } as any);
        }
      }

      const response = await fetch(`${API_URL}profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setEditModalVisible(false);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        Alert.alert('Error', data.message || 'Failed to update profile');
      }
    } catch (err: any) {
      if (err.name === 'ValidationError') {
        const validationErrors: { [key: string]: string } = {};
        err.inner.forEach((error: any) => {
          if (error.path) {
            validationErrors[error.path] = error.message;
          }
        });
        setErrors(validationErrors);
      } else {
        Alert.alert('Error', 'Failed to update profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    setErrors({});

    try {
      await securitySchema.validate(
        { currentPassword, newPassword, confirmPassword },
        { abortEarly: false }
      );

      setLoading(true);

      const token = await AsyncStorage.getItem('jwt');
      const formData = new FormData();
      
      formData.append('current_password', currentPassword);
      formData.append('new_password', newPassword);

      const response = await fetch(`${API_URL}profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setEditModalVisible(false);
        Alert.alert('Success', 'Password updated successfully');
      } else {
        Alert.alert('Error', data.message || 'Failed to update password');
      }
    } catch (err: any) {
      if (err.name === 'ValidationError') {
        const validationErrors: { [key: string]: string } = {};
        err.inner.forEach((error: any) => {
          if (error.path) {
            validationErrors[error.path] = error.message;
          }
        });
        setErrors(validationErrors);
      } else {
        Alert.alert('Error', 'Failed to update password');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setActiveTab('personal');
    setErrors({});
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    loadUser();
  };

  if (!user) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="person-outline" size={60} color="#ccc" />
        <Text style={styles.emptyText}>Please log in</Text>
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => navigation.navigate('AuthScreen' as never)}
        >
          <Text style={styles.loginButtonText}>Log In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {user.image ? (
              <Image source={{ uri: user.image }} style={styles.avatar} />
            ) : (
              <Ionicons name="person" size={60} color="#7FA66D" />
            )}
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{user.role.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              resetModal();
              setEditModalVisible(true);
            }}
          >
            <Ionicons name="person-outline" size={24} color="#3d4d3d" />
            <Text style={styles.menuText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('History' as never)}
          >
            <Ionicons name="time-outline" size={24} color="#3d4d3d" />
            <Text style={styles.menuText}>History</Text>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="settings-outline" size={24} color="#3d4d3d" />
            <Text style={styles.menuText}>Settings</Text>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.lastItem]}>
            <Ionicons name="help-circle-outline" size={24} color="#3d4d3d" />
            <Text style={styles.menuText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setEditModalVisible(false);
          resetModal();
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => {
                setEditModalVisible(false);
                resetModal();
              }}>
                <Ionicons name="close" size={28} color="#3d4d3d" />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'personal' && styles.activeTab]}
                onPress={() => setActiveTab('personal')}
              >
                <Ionicons 
                  name="person-outline" 
                  size={20} 
                  color={activeTab === 'personal' ? '#7FA66D' : '#999'} 
                />
                <Text style={[styles.tabText, activeTab === 'personal' && styles.activeTabText]}>
                  Personal Info
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, activeTab === 'security' && styles.activeTab]}
                onPress={() => setActiveTab('security')}
              >
                <Ionicons 
                  name="lock-closed-outline" 
                  size={20} 
                  color={activeTab === 'security' ? '#7FA66D' : '#999'} 
                />
                <Text style={[styles.tabText, activeTab === 'security' && styles.activeTabText]}>
                  Security
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Personal Info Tab */}
              {activeTab === 'personal' && (
                <>
                  <TouchableOpacity onPress={pickImage} style={styles.imagePickerContainer}>
                    {image ? (
                      <Image source={{ uri: image }} style={styles.editImage} />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Ionicons name="camera" size={40} color="#999" />
                        <Text style={styles.imagePlaceholderText}>Change Photo</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Name</Text>
                    <TextInput
                      style={[styles.input, errors.name && styles.inputError]}
                      value={name}
                      onChangeText={(text) => {
                        setName(text);
                        setErrors((prev) => ({ ...prev, name: '' }));
                      }}
                      placeholder="Enter your name"
                    />
                    {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={[styles.input, styles.inputDisabled]}
                      value={user.email}
                      editable={false}
                    />
                    <Text style={styles.helperText}>Email cannot be changed</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.saveButton, loading && styles.buttonDisabled]}
                    onPress={handleUpdatePersonal}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <>
                  <View style={styles.securityInfo}>
                    <Ionicons name="information-circle" size={20} color="#7FA66D" />
                    <Text style={styles.securityInfoText}>
                      Enter your current password to set a new password
                    </Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email (for verification)</Text>
                    <TextInput
                      style={[styles.input, styles.inputDisabled]}
                      value={user.email}
                      editable={false}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Current Password</Text>
                    <TextInput
                      style={[styles.input, errors.currentPassword && styles.inputError]}
                      value={currentPassword}
                      onChangeText={(text) => {
                        setCurrentPassword(text);
                        setErrors((prev) => ({ ...prev, currentPassword: '' }));
                      }}
                      placeholder="Enter current password"
                      secureTextEntry
                    />
                    {errors.currentPassword && (
                      <Text style={styles.errorText}>{errors.currentPassword}</Text>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>New Password</Text>
                    <TextInput
                      style={[styles.input, errors.newPassword && styles.inputError]}
                      value={newPassword}
                      onChangeText={(text) => {
                        setNewPassword(text);
                        setErrors((prev) => ({ ...prev, newPassword: '' }));
                      }}
                      placeholder="Enter new password"
                      secureTextEntry
                    />
                    {errors.newPassword && (
                      <Text style={styles.errorText}>{errors.newPassword}</Text>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Confirm New Password</Text>
                    <TextInput
                      style={[styles.input, errors.confirmPassword && styles.inputError]}
                      value={confirmPassword}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                      }}
                      placeholder="Confirm new password"
                      secureTextEntry
                    />
                    {errors.confirmPassword && (
                      <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.saveButton, loading && styles.buttonDisabled]}
                    onPress={handleUpdatePassword}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>Update Password</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#7FA66D',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatar: {
    width: 100,
    height: 100,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3d4d3d',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  badge: {
    backgroundColor: '#7FA66D',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  menuSection: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    color: '#3d4d3d',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3d4d3d',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#7FA66D',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#7FA66D',
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  imagePickerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  editImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#7FA66D',
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#7FA66D',
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: '#999',
    fontSize: 12,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3d4d3d',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#3d4d3d',
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#999',
  },
  inputError: {
    borderColor: '#E10600',
  },
  errorText: {
    color: '#E10600',
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
  securityInfo: {
    flexDirection: 'row',
    backgroundColor: '#f0f7ed',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  securityInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#3d4d3d',
  },
  saveButton: {
    backgroundColor: '#7FA66D',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;