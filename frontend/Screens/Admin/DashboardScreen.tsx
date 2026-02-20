import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart, ProgressChart } from 'react-native-chart-kit';
import { styles } from '../../Styles/DashboardScreen.styles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../config/api';

type AdminStackParamList = {
  Dashboard: undefined;
  Users: undefined;
  Market: undefined;
  Forum: undefined;
  Analysis: undefined;
};

type DashboardScreenNavigationProp = StackNavigationProp<AdminStackParamList, 'Dashboard'>;

interface Props {
  navigation: DashboardScreenNavigationProp;
}

interface StatCard {
  title: string;
  value: string | number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  change: string;
  trend: 'up' | 'down';
  color: string;
}

// Distinct color palette for charts
const CHART_COLORS = {
  leaves: '#5d873e',      // Green
  ripeness: '#f59e0b',    // Amber/Orange
  disease: '#ef4444',     // Red
  forum: '#6366f1',       // Indigo/Purple
};

const PIE_COLORS = ['#ef4444', '#f59e0b', '#6366f1', '#10b981', '#ec4899'];

const PROGRESS_COLORS = ['#5d873e', '#f59e0b', '#ef4444', '#6366f1'];

const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const { width } = dimensions;
  const isTablet = width >= 768;

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('jwt') || await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert('Error', 'Authentication required');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/users/dashboard/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
      });

      const data = await response.json();

      if (data.success) {
        setDashboardStats(data.stats);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch dashboard stats');
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      Alert.alert('Error', 'Failed to fetch dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardStats();
    setRefreshing(false);
  };

  // Stats Cards Data
  const statsCards: StatCard[] = dashboardStats ? [
    {
      title: 'Total Users',
      value: dashboardStats.total_users.toLocaleString(),
      icon: 'people',
      change: `${dashboardStats.active_users} active`,
      trend: 'up',
      color: '#5d873e',
    },
    {
      title: 'Total Scans',
      value: dashboardStats.total_scans.toLocaleString(),
      icon: 'scan',
      change: `+${dashboardStats.recent_scans} this week`,
      trend: 'up',
      color: '#f59e0b',
    },
    {
      title: 'Forum Posts',
      value: dashboardStats.total_posts.toLocaleString(),
      icon: 'chatbubbles',
      change: 'All time',
      trend: 'up',
      color: '#6366f1',
    },
    {
      title: 'Leaf Scans',
      value: dashboardStats.scan_distribution.leaves.toLocaleString(),
      icon: 'leaf',
      change: 'Total',
      trend: 'up',
      color: '#ef4444',
    },
  ] : [];

  // Chart width: subtract horizontal padding (16*2) + card padding (16*2) + scrollbar margin
  const SCREEN_PADDING = 32; // 16px each side
  const CARD_PADDING = 32;   // 16px each side of card
  const chartWidth = isTablet
    ? Math.floor((width - SCREEN_PADDING - 16) / 2) - CARD_PADDING // 16 = gap between cards
    : width - SCREEN_PADDING - CARD_PADDING;

  // User Activity Chart Data (Last 7 days)
  const userActivityData = dashboardStats ? {
    labels: dashboardStats.days_labels,
    datasets: [
      {
        data: dashboardStats.activity_by_day.length > 0 ? dashboardStats.activity_by_day : [0],
        color: (opacity = 1) => `rgba(93, 135, 62, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  } : {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{ data: [0], color: (opacity = 1) => `rgba(93, 135, 62, ${opacity})`, strokeWidth: 3 }],
  };

  // Scan Distribution Data — each bar gets its own distinct color via custom renderBars
  const scanDistributionData = dashboardStats ? {
    labels: ['Leaves', 'Ripeness', 'Disease'],
    datasets: [
      {
        data: [
          dashboardStats.scan_distribution.leaves || 1,
          dashboardStats.scan_distribution.ripeness || 1,
          dashboardStats.scan_distribution.fruit_disease || 1,
        ],
        colors: [
          (opacity = 1) => `rgba(93, 135, 62, ${opacity})`,   // Leaves — green
          (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,  // Ripeness — amber
          (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,   // Disease — red
        ],
      },
    ],
  } : {
    labels: ['Leaves', 'Ripeness', 'Disease'],
    datasets: [{
      data: [1, 1, 1],
      colors: [
        (opacity = 1) => `rgba(93, 135, 62, ${opacity})`,
        (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
        (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
      ],
    }],
  };

  // Disease Detection Data (Pie Chart) — distinct colors
  const diseaseData = dashboardStats && dashboardStats.disease_distribution && dashboardStats.disease_distribution.length > 0
    ? dashboardStats.disease_distribution.map((item: any, index: number) => ({
        name: item.name,
        population: item.population,
        color: PIE_COLORS[index % PIE_COLORS.length],
        legendFontColor: '#2d3e2d',
        legendFontSize: 12,
      }))
    : [
        {
          name: 'No Data',
          population: 100,
          color: '#94a3b8',
          legendFontColor: '#2d3e2d',
          legendFontSize: 12,
        },
      ];

  // Leaf Health Data (Progress Chart) — distinct colors per ring
  const leafHealthData = dashboardStats && dashboardStats.leaf_distribution
    ? {
        labels: Object.keys(dashboardStats.leaf_distribution),
        data: Object.values(dashboardStats.leaf_distribution) as number[],
      }
    : {
        labels: ['No Data'],
        data: [0] as number[],
      };

  const baseChartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(93, 135, 62, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(45, 62, 45, ${opacity})`,
    style: { borderRadius: 12 },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: '#5d873e',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#e5e7eb',
      strokeWidth: 1,
    },
  };

  // BarChart config with per-bar colors (withCustomBarColorFromData)
  const barChartConfig = {
    ...baseChartConfig,
    color: (opacity = 1) => `rgba(93, 135, 62, ${opacity})`,
  };

  // ProgressChart config cycles through distinct colors
  const progressChartConfig = {
    ...baseChartConfig,
    color: (opacity = 1, index?: number) => {
      const colors = [
        `rgba(93, 135, 62, ${opacity})`,   // green
        `rgba(245, 158, 11, ${opacity})`,  // amber
        `rgba(239, 68, 68, ${opacity})`,   // red
        `rgba(99, 102, 241, ${opacity})`,  // indigo
      ];
      return colors[(index ?? 0) % colors.length];
    },
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5d873e" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerSubtitle}>Welcome back, Admin</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#2d3e2d" />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          {statsCards.map((card, index) => (
            <View
              key={index}
              style={[
                styles.statCard,
                isTablet && { width: '48%' },
              ]}
            >
              <View style={styles.statCardHeader}>
                <View style={[styles.statIconContainer, { backgroundColor: `${card.color}18` }]}>
                  <Ionicons name={card.icon} size={24} color={card.color} />
                </View>
                <View
                  style={[
                    styles.trendBadge,
                    { backgroundColor: card.trend === 'up' ? '#dcfce7' : '#fee2e2' },
                  ]}
                >
                  <Ionicons
                    name={card.trend === 'up' ? 'trending-up' : 'trending-down'}
                    size={12}
                    color={card.trend === 'up' ? '#16a34a' : '#dc2626'}
                  />
                  <Text
                    style={[
                      styles.trendText,
                      { color: card.trend === 'up' ? '#16a34a' : '#dc2626' },
                    ]}
                  >
                    {card.change}
                  </Text>
                </View>
              </View>
              <Text style={[styles.statValue, { color: card.color }]}>{card.value}</Text>
              <Text style={styles.statTitle}>{card.title}</Text>
            </View>
          ))}
        </View>

        {/* Charts Section */}
        <View style={[styles.chartsContainer, isTablet && styles.chartsContainerTablet]}>

          {/* User Activity Chart */}
          <View style={[styles.chartCard, isTablet && styles.chartCardHalf]}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>User Activity</Text>
              <Text style={styles.chartSubtitle}>Last 7 days</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <LineChart
                data={userActivityData}
                width={chartWidth}
                height={220}
                chartConfig={baseChartConfig}
                bezier
                style={styles.chart}
                withInnerLines={true}
                withOuterLines={true}
                withVerticalLines={false}
                withHorizontalLines={true}
                withDots={true}
                withShadow={false}
                fromZero
              />
            </ScrollView>
          </View>

          {/* Scan Distribution Chart — per-bar colors */}
          <View style={[styles.chartCard, isTablet && styles.chartCardHalf]}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Scan Distribution</Text>
              <Text style={styles.chartSubtitle}>By category</Text>
            </View>
            {/* Color legend */}
            <View style={styles.legendRow}>
              {[
                { label: 'Leaves', color: '#5d873e' },
                { label: 'Ripeness', color: '#f59e0b' },
                { label: 'Disease', color: '#ef4444' },
              ].map((item) => (
                <View key={item.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={scanDistributionData}
                width={chartWidth}
                height={220}
                chartConfig={barChartConfig}
                style={styles.chart}
                showValuesOnTopOfBars
                withInnerLines={false}
                fromZero
                yAxisLabel=""
                yAxisSuffix=""
                withCustomBarColorFromData
                flatColor
              />
            </ScrollView>
          </View>

          {/* Disease Detection Pie Chart */}
          <View style={[styles.chartCard, isTablet && styles.chartCardHalf]}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Disease Detection</Text>
              <Text style={styles.chartSubtitle}>Distribution</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <PieChart
                data={diseaseData}
                width={chartWidth}
                height={200}
                chartConfig={baseChartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                style={styles.chart}
                absolute
              />
            </ScrollView>
          </View>

          {/* Leaf Health Progress Chart */}
          <View style={[styles.chartCard, isTablet && styles.chartCardHalf]}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Leaf Health Distribution</Text>
              <Text style={styles.chartSubtitle}>By condition</Text>
            </View>
            {/* Color legend for progress rings */}
            {leafHealthData.labels.length > 0 && leafHealthData.labels[0] !== 'No Data' && (
              <View style={styles.legendRow}>
                {leafHealthData.labels.map((label: string, i: number) => (
                  <View key={label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: PROGRESS_COLORS[i % PROGRESS_COLORS.length] }]} />
                    <Text style={styles.legendLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            )}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <ProgressChart
                data={leafHealthData}
                width={chartWidth}
                height={200}
                chartConfig={progressChartConfig}
                style={styles.chart}
                strokeWidth={12}
                radius={32}
                hideLegend={false}
              />
            </ScrollView>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {[
              { icon: 'people' as const, label: 'Manage Users', screen: 'Users', color: '#5d873e' },
              { icon: 'bar-chart' as const, label: 'View Analysis', screen: 'Analysis', color: '#6366f1' },
              { icon: 'chatbubbles' as const, label: 'Forum Posts', screen: 'Forum', color: '#f59e0b' },
              { icon: 'storefront' as const, label: 'Market Items', screen: 'Market', color: '#ef4444' },
            ].map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickActionButton}
                onPress={() => navigation.navigate(action.screen as any)}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}18` }]}>
                  <Ionicons name={action.icon} size={28} color={action.color} />
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DashboardScreen;