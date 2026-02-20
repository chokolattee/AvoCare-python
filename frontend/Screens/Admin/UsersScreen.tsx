import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  SafeAreaView,
  RefreshControl,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../config/api';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
  status: string;
  created_at?: string;
}

const UsersScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editRole, setEditRole] = useState('user');
  const [editStatus, setEditStatus] = useState('active');
  const [filterType, setFilterType] = useState('All');
  const [updating, setUpdating] = useState(false);
  const { width } = dimensions;
  const isDesktop = width >= 768;

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, users, filterType]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('jwt') || await AsyncStorage.getItem('token');
      
      if (!token) {
        Alert.alert('Error', 'Authentication required');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/users/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users || []);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== 'All') {
      if (filterType === 'Active') {
        filtered = filtered.filter((user) => user.status === 'active');
      } else if (filterType === 'Inactive') {
        filtered = filtered.filter((user) => user.status !== 'active');
      } else if (filterType === 'Premium') {
        filtered = filtered.filter((user) => user.role === 'admin');
      }
    }

    setFilteredUsers(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setEditStatus(user.status);
    setEditModalVisible(true);
  };

  const updateUser = async () => {
    if (!selectedUser) return;

    try {
      setUpdating(true);
      const token = await AsyncStorage.getItem('jwt') || await AsyncStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          role: editRole,
          status: editStatus,
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', 'User updated successfully');
        setEditModalVisible(false);
        fetchUsers();
      } else {
        Alert.alert('Error', data.message || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      Alert.alert('Error', 'Failed to update user');
    } finally {
      setUpdating(false);
    }
  };

  const generatePDF = async () => {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>AvoCare Users Report</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
                color: #333;
              }
              h1 {
                color: #5d873e;
                text-align: center;
                margin-bottom: 10px;
              }
              .subtitle {
                text-align: center;
                color: #666;
                margin-bottom: 30px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
              }
              th {
                background-color: #5d873e;
                color: white;
                padding: 12px;
                text-align: left;
                font-weight: bold;
              }
              td {
                padding: 10px;
                border-bottom: 1px solid #ddd;
              }
              tr:hover {
                background-color: #f5f5f5;
              }
              .status-active {
                color: #16a34a;
                font-weight: bold;
              }
              .status-inactive {
                color: #dc2626;
                font-weight: bold;
              }
              .role-admin {
                color: #7c3aed;
                font-weight: bold;
              }
              .footer {
                margin-top: 30px;
                text-align: center;
                color: #999;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <h1>AvoCare Users Report</h1>
            <p class="subtitle">Generated on ${new Date().toLocaleString()}</p>
            <p><strong>Total Users:</strong> ${filteredUsers.length}</p>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                ${filteredUsers
                  .map(
                    (user) => `
                  <tr>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td class="${user.role === 'admin' ? 'role-admin' : ''}">${user.role.toUpperCase()}</td>
                    <td class="status-${user.status}">${user.status.toUpperCase()}</td>
                    <td>${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
            <div class="footer">
              <p>AvoCare - Wellness & Growth</p>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      
      if (Platform.OS === 'web') {
        // For web, open in new tab
        window.open(uri, '_blank');
      } else {
        // For mobile, share the PDF
        await Sharing.shareAsync(uri);
      }
      
      Alert.alert('Success', 'PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  const getStats = () => {
    const total = users.length;
    const active = users.filter((u) => u.status === 'active').length;
    const premium = users.filter((u) => u.role === 'admin').length;
    return { total, active, premium };
  };

  const stats = getStats();


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5d873e" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#5d873e']} />
        }
      >
        {/* Stats Overview */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.premium}</Text>
            <Text style={styles.statLabel}>Admin</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Buttons and PDF Download */}
        <View style={styles.controlsRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <View style={styles.filterContainer}>
              <TouchableOpacity
                style={[styles.filterButton, filterType === 'All' && styles.filterButtonActive]}
                onPress={() => setFilterType('All')}
              >
                <Text style={[styles.filterText, filterType === 'All' && styles.filterTextActive]}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filterType === 'Active' && styles.filterButtonActive]}
                onPress={() => setFilterType('Active')}
              >
                <Text style={[styles.filterText, filterType === 'Active' && styles.filterTextActive]}>Active</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filterType === 'Inactive' && styles.filterButtonActive]}
                onPress={() => setFilterType('Inactive')}
              >
                <Text style={[styles.filterText, filterType === 'Inactive' && styles.filterTextActive]}>Inactive</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filterType === 'Premium' && styles.filterButtonActive]}
                onPress={() => setFilterType('Premium')}
              >
                <Text style={[styles.filterText, filterType === 'Premium' && styles.filterTextActive]}>Admin</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.pdfButton} onPress={generatePDF}>
            <Ionicons name="download-outline" size={20} color="#fff" />
            <Text style={styles.pdfButtonText}>PDF</Text>
          </TouchableOpacity>
        </View>

        {/* Users List/Table */}
        {isDesktop ? (
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colImage]}>Image</Text>
              <Text style={[styles.tableHeaderText, styles.colName]}>Name</Text>
              <Text style={[styles.tableHeaderText, styles.colEmail]}>Email</Text>
              <Text style={[styles.tableHeaderText, styles.colRole]}>Role</Text>
              <Text style={[styles.tableHeaderText, styles.colStatus]}>Status</Text>
              <Text style={[styles.tableHeaderText, styles.colActions]}>Actions</Text>
            </View>
            {filteredUsers.map((user) => (
              <View key={user.id} style={styles.tableRow}>
                <View style={styles.colImage}>
                  {user.image ? (
                    <Image source={{ uri: user.image }} style={styles.userImageTable} />
                  ) : (
                    <View style={styles.userAvatarTable}>
                      <Text style={styles.userAvatarTextTable}>{user.name.charAt(0)}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.tableCell, styles.colName]}>{user.name}</Text>
                <Text style={[styles.tableCell, styles.colEmail]}>{user.email}</Text>
                <Text style={[styles.tableCell, styles.colRole]}>
                  <View
                    style={[
                      styles.roleBadgeTable,
                      { backgroundColor: user.role === 'admin' ? '#ede9fe' : '#f3f4f6' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleBadgeTextTable,
                        { color: user.role === 'admin' ? '#7c3aed' : '#6b7280' },
                      ]}
                    >
                      {user.role.toUpperCase()}
                    </Text>
                  </View>
                </Text>
                <Text style={[styles.tableCell, styles.colStatus]}>
                  <View
                    style={[
                      styles.statusBadgeTable,
                      { backgroundColor: user.status === 'active' ? '#dcfce7' : '#fee2e2' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusTextTable,
                        { color: user.status === 'active' ? '#16a34a' : '#dc2626' },
                      ]}
                    >
                      {user.status.toUpperCase()}
                    </Text>
                  </View>
                </Text>
                <View style={[styles.colActions]}>
                  <TouchableOpacity style={styles.editButtonTable} onPress={() => openEditModal(user)}>
                    <Ionicons name="create-outline" size={18} color="#5d873e" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.usersList}>
            {filteredUsers.map((user) => (
              <View key={user.id} style={styles.userCard}>
                {user.image ? (
                  <Image source={{ uri: user.image }} style={styles.userImage} />
                ) : (
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>{user.name.charAt(0)}</Text>
                  </View>
                )}
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <View style={styles.userMeta}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: user.status === 'active' ? '#dcfce7' : '#fee2e2' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: user.status === 'active' ? '#16a34a' : '#dc2626' },
                        ]}
                      >
                        {user.status}
                      </Text>
                    </View>
                    <Text style={styles.roleBadge}>{user.role}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.moreButton} onPress={() => openEditModal(user)}>
                  <Ionicons name="create-outline" size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {filteredUsers.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit User</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <View style={styles.modalBody}>
                <View style={styles.userInfoModal}>
                  {selectedUser.image ? (
                    <Image source={{ uri: selectedUser.image }} style={styles.userImageModal} />
                  ) : (
                    <View style={styles.userAvatarModal}>
                      <Text style={styles.userAvatarTextModal}>{selectedUser.name.charAt(0)}</Text>
                    </View>
                  )}
                  <View>
                    <Text style={styles.userNameModal}>{selectedUser.name}</Text>
                    <Text style={styles.userEmailModal}>{selectedUser.email}</Text>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Role</Text>
                  <View style={styles.radioGroup}>
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => setEditRole('user')}
                    >
                      <View style={[styles.radio, editRole === 'user' && styles.radioSelected]}>
                        {editRole === 'user' && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.radioLabel}>User</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => setEditRole('admin')}
                    >
                      <View style={[styles.radio, editRole === 'admin' && styles.radioSelected]}>
                        {editRole === 'admin' && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.radioLabel}>Admin</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Status</Text>
                  <View style={styles.radioGroup}>
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => setEditStatus('active')}
                    >
                      <View style={[styles.radio, editStatus === 'active' && styles.radioSelected]}>
                        {editStatus === 'active' && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.radioLabel}>Active</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => setEditStatus('inactive')}
                    >
                      <View style={[styles.radio, editStatus === 'inactive' && styles.radioSelected]}>
                        {editStatus === 'inactive' && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.radioLabel}>Inactive</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => setEditStatus('deactivated')}
                    >
                      <View style={[styles.radio, editStatus === 'deactivated' && styles.radioSelected]}>
                        {editStatus === 'deactivated' && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.radioLabel}>Deactivated</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setEditModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={updateUser}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#5d873e',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#2d3e2d',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filterScroll: {
    flex: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#5d873e',
    borderColor: '#5d873e',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#fff',
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
    gap: 6,
  },
  pdfButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  // Mobile card view
  usersList: {
    gap: 12,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    alignItems: 'center',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#5d873e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  userImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d3e2d',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 6,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  roleBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  moreButton: {
    padding: 8,
  },
  // Desktop table view
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#5d873e',
    padding: 16,
    alignItems: 'center',
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 14,
    color: '#2d3e2d',
  },
  colImage: {
    width: 60,
  },
  colName: {
    flex: 2,
  },
  colEmail: {
    flex: 2.5,
  },
  colRole: {
    flex: 1,
  },
  colStatus: {
    flex: 1,
  },
  colActions: {
    width: 60,
    alignItems: 'center',
  },
  userImageTable: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  userAvatarTable: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#5d873e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarTextTable: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  roleBadgeTable: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  roleBadgeTextTable: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadgeTable: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusTextTable: {
    fontSize: 11,
    fontWeight: '600',
  },
  editButtonTable: {
    padding: 8,
    backgroundColor: '#f0f4ed',
    borderRadius: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d3e2d',
  },
  modalBody: {
    padding: 20,
  },
  userInfoModal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  userImageModal: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  userAvatarModal: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5d873e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userAvatarTextModal: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  userNameModal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3e2d',
    marginBottom: 4,
  },
  userEmailModal: {
    fontSize: 14,
    color: '#6b7280',
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3e2d',
    marginBottom: 12,
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  radioSelected: {
    borderColor: '#5d873e',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#5d873e',
  },
  radioLabel: {
    fontSize: 14,
    color: '#2d3e2d',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#5d873e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

export default UsersScreen;
