import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL as BASE_URL } from '../config/api';
import { styles } from '../Styles/HistoryScreen.styles';

type HistoryStackParamList = {
  History: undefined;
  AnalysisDetail: { analysisId: string };
};

type RootStackParamList = {
  MainTabs: undefined;
  AuthScreen: undefined;
};

type HistoryScreenNavigationProp = StackNavigationProp<HistoryStackParamList, 'History'>;
type HistoryScreenRouteProp = RouteProp<HistoryStackParamList, 'History'>;

interface Props {
  navigation: HistoryScreenNavigationProp;
  route: HistoryScreenRouteProp;
}

export interface Analysis {
  id: string;
  analysis_type: 'ripeness' | 'leaf' | 'fruit_disease';
  created_at: string;
  updated_at: string;
  notes: string;
  count: number;
  image_size: { width: number; height: number };
  all_probabilities: Record<string, number>;
  original_image_url?: string;
  annotated_image_url?: string;

  ripeness?: {
    ripeness: string;
    ripeness_level: number;
    confidence: number;
    color: string;
    texture: string;
    days_to_ripe: string;
    recommendation: string;
    bbox: number[];
    color_metrics: Record<string, number>;
  };

  leaf?: {
    class: string;
    confidence: number;
    bbox: number[];
    detections: any[];
    recommendation: string;
  };

  disease?: {
    class: string;
    confidence: number;
    bbox: number[];
    detections: any[];
    recommendation: string;
  };
}

const HISTORY_URL = `${BASE_URL}/api/history`;

const categories = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'ripeness', label: 'Ripeness', icon: 'leaf-outline' },
  { key: 'leaf', label: 'Leaf Health', icon: 'medical-outline' },
  { key: 'fruit_disease', label: 'Disease', icon: 'warning-outline' },
];

/**
 * Parse a datetime string from the backend into a UTC timestamp (ms).
 *
 * Python's datetime.isoformat() produces strings like:
 *   "2024-01-15T10:30:45.123456"   ← no timezone suffix
 *   "2024-01-15T10:30:45"          ← no microseconds, no suffix
 *
 * Browsers treat strings WITHOUT a timezone offset as LOCAL time, not UTC.
 * Appending "Z" forces correct UTC interpretation in all browsers.
 */
function parseUTCDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Already has timezone info — use as-is
  if (dateStr.endsWith('Z') || dateStr.includes('+') || /\d{2}:\d{2}$/.test(dateStr.slice(-6))) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  // No timezone suffix — backend sent UTC without 'Z', so append it
  const d = new Date(dateStr + 'Z');
  return isNaN(d.getTime()) ? null : d;
}

function timeAgo(dateStr: string): string {
  try {
    const date = parseUTCDate(dateStr);
    if (!date) return 'recently';

    const nowMs = Date.now(); // always UTC ms
    const dateMs = date.getTime(); // now correctly UTC ms
    const seconds = Math.floor((nowMs - dateMs) / 1000);

    if (seconds < 0) return 'just now';
    if (seconds < 60) return 'just now';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return days === 1 ? '1 day ago' : `${days} days ago`;

    const weeks = Math.floor(days / 7);
    if (weeks < 4) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Within the same year — show "Jan 15"
    const nowYear = new Date().getUTCFullYear();
    if (date.getUTCFullYear() === nowYear) {
      return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
    }

    // Older — show "Jan 15, 2023"
    return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
  } catch {
    return 'recently';
  }
}

function getAnalysisTypeLabel(type: string): string {
  switch (type) {
    case 'ripeness': return 'Ripeness Analysis';
    case 'leaf': return 'Leaf Health';
    case 'fruit_disease': return 'Disease Detection';
    default: return 'Analysis';
  }
}

function getAnalysisTypeIcon(type: string): string {
  switch (type) {
    case 'ripeness': return 'leaf';
    case 'leaf': return 'medical';
    case 'fruit_disease': return 'warning';
    default: return 'analytics';
  }
}

function getAnalysisTypeColor(type: string): string {
  switch (type) {
    case 'ripeness': return '#4ECDC4';
    case 'leaf': return '#51CF66';
    case 'fruit_disease': return '#FF6B6B';
    default: return '#5d873e';
  }
}

function getConfidenceBadgeColor(confidence: number): string {
  if (confidence >= 0.9) return '#51CF66';
  if (confidence >= 0.7) return '#FFE66D';
  return '#FF922B';
}

// On web, SafeAreaView renders as a plain div without height constraints,
// which prevents the inner ScrollView from scrolling. Use View on web instead.
const RootContainer = Platform.OS === 'web' ? View : SafeAreaView;

const HistoryScreen: React.FC<Props> = ({ navigation }) => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const { width: windowWidth } = useWindowDimensions();

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('jwt') || await AsyncStorage.getItem('token');
        setIsLoggedIn(!!token);
      } catch (err) {
        console.error('Failed to check login status:', err);
        setIsLoggedIn(false);
      }
    };
    checkLoginStatus();
  }, []);

  const fetchAnalyses = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('jwt') || await AsyncStorage.getItem('token');
      if (!token) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      const url = selectedCategory === 'all'
        ? `${HISTORY_URL}/all`
        : `${HISTORY_URL}/${selectedCategory}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        setIsLoggedIn(false);
        setAnalyses([]);
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setAnalyses(Array.isArray(data) ? data : data.analyses || []);
    } catch (err) {
      console.error('Failed to fetch analyses:', err);
      Alert.alert('Error', 'Failed to load analysis history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (isLoggedIn) fetchAnalyses();
  }, [fetchAnalyses, isLoggedIn]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      const token = await AsyncStorage.getItem('jwt') || await AsyncStorage.getItem('token');
      if (token) {
        setIsLoggedIn(true);
        fetchAnalyses();
      } else {
        setIsLoggedIn(false);
      }
    });
    return unsubscribe;
  }, [navigation, fetchAnalyses]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnalyses();
  }, [fetchAnalyses]);

  const handleDeleteAnalysis = async (analysisId: string) => {
    Alert.alert(
      'Delete Analysis',
      'Are you sure you want to delete this analysis? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('jwt') || await AsyncStorage.getItem('token');
              const res = await fetch(`${HISTORY_URL}/${analysisId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok) throw new Error('Failed to delete analysis');
              await fetchAnalyses();
              Alert.alert('Success', 'Analysis deleted successfully');
            } catch (err) {
              console.error('Delete failed:', err);
              Alert.alert('Error', 'Failed to delete analysis');
            }
          },
        },
      ]
    );
  };

  const filteredAnalyses = analyses.filter((analysis) =>
    searchQuery === '' ||
    analysis.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getAnalysisTypeLabel(analysis.analysis_type).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getImageDimensions = () => {
    const maxContentWidth = Math.min(windowWidth - 32, 600);
    const imageWidth = Math.min(maxContentWidth * 0.85, 500);
    return { width: imageWidth, height: imageWidth * 0.7 };
  };

  const renderAnalysisCard = (analysis: Analysis) => {
    const typeColor = getAnalysisTypeColor(analysis.analysis_type);
    const imageDimensions = getImageDimensions();

    let primaryResult = '';
    let confidence = 0;
    let recommendation = '';

    if (analysis.analysis_type === 'ripeness' && analysis.ripeness) {
      primaryResult = `${analysis.ripeness.ripeness} (Level ${analysis.ripeness.ripeness_level})`;
      confidence = analysis.ripeness.confidence;
      recommendation = analysis.ripeness.recommendation;
    } else if (analysis.analysis_type === 'leaf' && analysis.leaf) {
      primaryResult = analysis.leaf.class;
      confidence = analysis.leaf.confidence;
      recommendation = analysis.leaf.recommendation;
    } else if (analysis.analysis_type === 'fruit_disease' && analysis.disease) {
      primaryResult = analysis.disease.class;
      confidence = analysis.disease.confidence;
      recommendation = analysis.disease.recommendation;
    }

    return (
      <View key={analysis.id} style={styles.analysisCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.typeIconContainer, { backgroundColor: typeColor + '20' }]}>
            <Ionicons name={getAnalysisTypeIcon(analysis.analysis_type) as any} size={22} color={typeColor} />
          </View>
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.analysisType}>{getAnalysisTypeLabel(analysis.analysis_type)}</Text>
            <Text style={styles.timeAgo}>{timeAgo(analysis.created_at)}</Text>
          </View>
          <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteAnalysis(analysis.id)}>
            <Ionicons name="trash-outline" size={20} color="#e74c3c" />
          </TouchableOpacity>
        </View>

        {(analysis.original_image_url || analysis.annotated_image_url) && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imagesContainer}
            snapToInterval={imageDimensions.width + 12}
            decelerationRate="fast"
          >
            {analysis.original_image_url && (
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: analysis.original_image_url }}
                  style={[styles.analysisImage, { width: imageDimensions.width, height: imageDimensions.height }]}
                  resizeMode="cover"
                />
                <View style={styles.imageLabel}>
                  <Text style={styles.imageLabelText}>Original</Text>
                </View>
              </View>
            )}
            {analysis.annotated_image_url && (
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: analysis.annotated_image_url }}
                  style={[styles.analysisImage, { width: imageDimensions.width, height: imageDimensions.height }]}
                  resizeMode="cover"
                />
                <View style={styles.imageLabel}>
                  <Text style={styles.imageLabelText}>Analysis</Text>
                </View>
              </View>
            )}
          </ScrollView>
        )}

        <View style={styles.resultsContainer}>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Result:</Text>
            <Text style={[styles.resultValue, { color: typeColor }]} numberOfLines={2} ellipsizeMode="tail">
              {primaryResult}
            </Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Confidence:</Text>
            <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceBadgeColor(confidence) }]}>
              <Text style={styles.confidenceText}>{(confidence * 100).toFixed(1)}%</Text>
            </View>
          </View>
          {analysis.count > 1 && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Detections:</Text>
              <Text style={styles.resultValue}>{analysis.count}</Text>
            </View>
          )}
        </View>

        {recommendation && (
          <View style={styles.recommendationContainer}>
            <View style={styles.recommendationHeader}>
              <Ionicons name="information-circle" size={16} color="#5d873e" />
              <Text style={styles.recommendationTitle}>Recommendation</Text>
            </View>
            <Text style={styles.recommendationText}>{recommendation}</Text>
          </View>
        )}

        {analysis.analysis_type === 'ripeness' && analysis.ripeness && (
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Ionicons name="color-palette-outline" size={16} color="#666" />
              <Text style={styles.detailText} numberOfLines={1}>{analysis.ripeness.color}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="hand-left-outline" size={16} color="#666" />
              <Text style={styles.detailText} numberOfLines={1}>{analysis.ripeness.texture}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.detailText} numberOfLines={1}>{analysis.ripeness.days_to_ripe}</Text>
            </View>
          </View>
        )}

        {analysis.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText}>{analysis.notes}</Text>
          </View>
        )}

        {Object.keys(analysis.all_probabilities).length > 0 && (
          <View style={styles.probabilitiesContainer}>
            <Text style={styles.probabilitiesTitle}>All Probabilities:</Text>
            {Object.entries(analysis.all_probabilities)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([key, value]) => (
                <View key={key} style={styles.probabilityRow}>
                  <Text style={styles.probabilityLabel} numberOfLines={1} ellipsizeMode="tail">
                    {key}:
                  </Text>
                  <View style={styles.probabilityBar}>
                    <View
                      style={[
                        styles.probabilityFill,
                        { width: `${(value as number) * 100}%`, backgroundColor: typeColor },
                      ]}
                    />
                  </View>
                  <Text style={styles.probabilityValue}>{((value as number) * 100).toFixed(1)}%</Text>
                </View>
              ))}
          </View>
        )}
      </View>
    );
  };

  if (!isLoggedIn) {
    return (
      <RootContainer style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analysis History</Text>
        </View>
        <ScrollView
          style={styles.mainContent}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.centerColumn}>
            <View style={styles.loginPromptContainer}>
              <Ionicons name="lock-closed-outline" size={64} color="#ccc" />
              <Text style={styles.loginPromptTitle}>Login Required</Text>
              <Text style={styles.loginPromptText}>
                Please login to view your analysis history
              </Text>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => navigation.getParent()?.navigate('AuthScreen' as never)}
              >
                <Text style={styles.loginButtonText}>Login Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </RootContainer>
    );
  }

  return (
    <RootContainer style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analysis History</Text>
      </View>
      <ScrollView
        style={styles.mainContent}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          Platform.OS !== 'web' ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#5d873e']}
              tintColor="#5d873e"
            />
          ) : undefined
        }
      >
        <View style={styles.centerColumn}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#5d873e" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search analyses..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesRow}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryButton, selectedCategory === cat.key && styles.categoryButtonActive]}
                onPress={() => setSelectedCategory(cat.key)}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={14}
                  color={selectedCategory === cat.key ? '#fff' : '#5d873e'}
                />
                <Text style={[styles.categoryText, selectedCategory === cat.key && styles.categoryTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading ? (
            <ActivityIndicator size="large" color="#5d873e" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.analysesContainer}>
              {filteredAnalyses.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="analytics-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>
                    {searchQuery
                      ? 'No analyses match your search'
                      : 'No analyses yet. Start scanning to build your history!'}
                  </Text>
                </View>
              ) : (
                filteredAnalyses.map((analysis) => renderAnalysisCard(analysis))
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </RootContainer>
  );
};

export default HistoryScreen;