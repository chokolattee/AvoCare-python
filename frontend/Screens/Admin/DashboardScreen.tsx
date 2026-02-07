import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart, ProgressChart } from 'react-native-chart-kit';
import { styles } from '../../Styles/DashboardScreen.styles';

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

const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const { width } = dimensions;
  const isTablet = width >= 768;

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => setRefreshing(false), 2000);
  };

  // Stats Cards Data
  const statsCards: StatCard[] = [
    {
      title: 'Total Users',
      value: '2,543',
      icon: 'people',
      change: '+12.5%',
      trend: 'up',
      color: '#5d873e',
    },
    {
      title: 'Active Scans',
      value: '1,832',
      icon: 'scan',
      change: '+8.2%',
      trend: 'up',
      color: '#90b481',
    },
    {
      title: 'Forum Posts',
      value: '456',
      icon: 'chatbubbles',
      change: '+15.3%',
      trend: 'up',
      color: '#6b9356',
    },
    {
      title: 'Market Sales',
      value: '$12.5K',
      icon: 'cart',
      change: '-2.4%',
      trend: 'down',
      color: '#7fa768',
    },
  ];

  // User Activity Chart Data (Last 7 days)
  const userActivityData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: [120, 145, 167, 189, 205, 195, 220],
        color: (opacity = 1) => `rgba(93, 135, 62, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  // Scan Distribution Data
  const scanDistributionData = {
    labels: ['Leaves', 'Ripeness', 'Disease', 'Pest'],
    datasets: [
      {
        data: [45, 30, 15, 10],
      },
    ],
  };

  // Disease Detection Data (Pie Chart)
  const diseaseData = [
    {
      name: 'Healthy',
      population: 65,
      color: '#5d873e',
      legendFontColor: '#2d3e2d',
      legendFontSize: 12,
    },
    {
      name: 'Anthracnose',
      population: 15,
      color: '#d94444',
      legendFontColor: '#2d3e2d',
      legendFontSize: 12,
    },
    {
      name: 'Phytophthora',
      population: 12,
      color: '#f59e0b',
      legendFontColor: '#2d3e2d',
      legendFontSize: 12,
    },
    {
      name: 'Other',
      population: 8,
      color: '#94a3b8',
      legendFontColor: '#2d3e2d',
      legendFontSize: 12,
    },
  ];

  // System Health Data
  const systemHealthData = {
    labels: ['API', 'DB', 'Storage', 'AI Model'],
    data: [0.98, 0.95, 0.99, 0.92],
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(93, 135, 62, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(45, 62, 45, ${opacity})`,
    style: {
      borderRadius: 12,
    },
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

  const chartWidth = isTablet ? width * 0.45 : width - 48;

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
                <View style={[styles.statIconContainer, { backgroundColor: `${card.color}15` }]}>
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
              <Text style={styles.statValue}>{card.value}</Text>
              <Text style={styles.statTitle}>{card.title}</Text>
            </View>
          ))}
        </View>

        {/* Charts Section */}
        <View style={[styles.chartsContainer, isTablet && styles.chartsContainerTablet]}>
          {/* User Activity Chart */}
          <View style={[styles.chartCard, isTablet && { width: '48%' }]}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>User Activity</Text>
              <Text style={styles.chartSubtitle}>Last 7 days</Text>
            </View>
            <LineChart
              data={userActivityData}
              width={chartWidth}
              height={220}
              chartConfig={chartConfig}
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
          </View>

          {/* Scan Distribution Chart */}
          <View style={[styles.chartCard, isTablet && { width: '48%' }]}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Scan Distribution</Text>
              <Text style={styles.chartSubtitle}>By category</Text>
            </View>
            <BarChart
              data={scanDistributionData}
              width={chartWidth}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              showValuesOnTopOfBars
              withInnerLines={false}
              fromZero
              yAxisLabel=""
              yAxisSuffix="%"
            />
          </View>

          {/* Disease Detection Pie Chart */}
          <View style={[styles.chartCard, isTablet && { width: '48%' }]}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Disease Detection</Text>
              <Text style={styles.chartSubtitle}>Distribution</Text>
            </View>
            <PieChart
              data={diseaseData}
              width={chartWidth}
              height={200}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              style={styles.chart}
              absolute
            />
          </View>

          {/* System Health Chart */}
          <View style={[styles.chartCard, isTablet && { width: '48%' }]}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>System Health</Text>
              <Text style={styles.chartSubtitle}>Performance metrics</Text>
            </View>
            <ProgressChart
              data={systemHealthData}
              width={chartWidth}
              height={200}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1, index) => {
                  const colors = ['#5d873e', '#90b481', '#6b9356', '#7fa768'];
                  return colors[index || 0];
                },
              }}
              style={styles.chart}
              strokeWidth={12}
              radius={32}
              hideLegend={false}
            />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.activityCard}>
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllButton}>View All</Text>
            </TouchableOpacity>
          </View>
          {[
            { icon: 'person-add' as const, text: 'New user registered', time: '5 min ago', color: '#5d873e' },
            { icon: 'scan' as const, text: 'Disease scan completed', time: '12 min ago', color: '#90b481' },
            { icon: 'chatbubble' as const, text: 'New forum post created', time: '23 min ago', color: '#6b9356' },
            { icon: 'cart' as const, text: 'Product listed on market', time: '1 hour ago', color: '#7fa768' },
          ].map((activity, index) => (
            <View key={index} style={styles.activityItem}>
              <View style={[styles.activityIcon, { backgroundColor: `${activity.color}15` }]}>
                <Ionicons name={activity.icon} size={20} color={activity.color} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>{activity.text}</Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {[
              { icon: 'people' as const, label: 'Manage Users', screen: 'Users', color: '#5d873e' },
              { icon: 'bar-chart' as const, label: 'View Analysis', screen: 'Analysis', color: '#90b481' },
              { icon: 'chatbubbles' as const, label: 'Forum Posts', screen: 'Forum', color: '#6b9356' },
              { icon: 'storefront' as const, label: 'Market Items', screen: 'Market', color: '#7fa768' },
            ].map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickActionButton}
                onPress={() => navigation.navigate(action.screen as any)}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}15` }]}>
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
