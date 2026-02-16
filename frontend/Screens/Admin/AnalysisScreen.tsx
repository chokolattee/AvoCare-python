import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../config/api';

// Distinct color palette
const COLORS = {
  green:  '#5d873e',
  amber:  '#f59e0b',
  red:    '#ef4444',
  indigo: '#6366f1',
  blue:   '#3b82f6',
  pink:   '#ec4899',
  teal:   '#14b8a6',
};

const AnalysisScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [historyPage, setHistoryPage] = useState(0);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const ROWS_PER_PAGE = 8;

  const { width } = dimensions;
  const isTablet = width >= 768;

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    fetchAnalysisData();
  }, []);

  const fetchAnalysisData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('jwt') || await AsyncStorage.getItem('token');
      
      if (!token) {
        Alert.alert('Error', 'Authentication required');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/users/analysis/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setAnalysisData(data.stats);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch analysis data');
      }
    } catch (error) {
      console.error('Error fetching analysis data:', error);
      Alert.alert('Error', 'Failed to fetch analysis statistics');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalysisData();
    setRefreshing(false);
  };

  // ── Chart width (same fix as Dashboard) ──────────────────────────────────
  const SCREEN_PADDING = 32;
  const CARD_PADDING   = 32;
  const chartWidth = width - SCREEN_PADDING - CARD_PADDING;

  // ── Growth Metrics Data ───────────────────────────────────────────────────
  const growthData = analysisData ? {
    labels: analysisData.growth.labels,
    datasets: [
      {
        data: analysisData.growth.data,
        color: (opacity = 1) => `rgba(93, 135, 62, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  } : {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{ data: [0], color: (opacity = 1) => `rgba(93, 135, 62, ${opacity})`, strokeWidth: 3 }],
  };

  // ── Engagement Data — each bar gets its own color ─────────────────────────
  const engagementData = analysisData ? {
    labels: ['Scans', 'Posts', 'Market', 'Chatbot'],
    datasets: [
      {
        data: [
          analysisData.engagement.scans || 1,
          analysisData.engagement.posts || 1,
          analysisData.engagement.market || 1,
          analysisData.engagement.chatbot || 1,
        ],
        colors: [
          (opacity = 1) => `rgba(93, 135, 62, ${opacity})`,   // green
          (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,  // indigo
          (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,  // amber
          (opacity = 1) => `rgba(20, 184, 166, ${opacity})`,  // teal
        ],
      },
    ],
  } : {
    labels: ['Scans', 'Posts', 'Market', 'Chatbot'],
    datasets: [{ data: [1, 1, 1, 1], colors: [] }],
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

  // ── Key Insights ──────────────────────────────────────────────────────────
  const insights = analysisData ? [
    {
      icon: 'trending-up' as const,
      title: 'User Growth',
      value: `${analysisData.insights.user_growth > 0 ? '+' : ''}${analysisData.insights.user_growth}%`,
      description: 'From last month',
      color: COLORS.green,
    },
    {
      icon: 'scan' as const,
      title: 'Total Scans',
      value: analysisData.detailed.total_scans.toLocaleString(),
      description: 'All scan types',
      color: COLORS.blue,
    },
    {
      icon: 'people' as const,
      title: 'Total Users',
      value: analysisData.detailed.total_users.toLocaleString(),
      description: `${analysisData.detailed.active_users} active`,
      color: COLORS.indigo,
    },
    {
      icon: 'chatbubbles' as const,
      title: 'Forum Posts',
      value: analysisData.detailed.total_posts.toLocaleString(),
      description: 'Community engagement',
      color: COLORS.red,
    },
  ] : [];

  // ── Detailed Analytics list ───────────────────────────────────────────────
  const analyticsItems = analysisData ? [
    { label: 'Total Scans Performed', value: analysisData.detailed.total_scans.toLocaleString(), icon: 'scan' as const, color: COLORS.green },
    { label: 'Forum Posts Created', value: analysisData.detailed.total_posts.toLocaleString(), icon: 'chatbubbles' as const, color: COLORS.indigo },
    { label: 'Ripeness Scans', value: analysisData.detailed.ripeness_scans.toLocaleString(), icon: 'nutrition' as const, color: COLORS.amber },
    { label: 'Leaf Health Scans', value: analysisData.detailed.leaf_scans.toLocaleString(), icon: 'leaf' as const, color: COLORS.teal },
    { label: 'Disease Detections', value: analysisData.detailed.disease_scans.toLocaleString(), icon: 'alert-circle' as const, color: COLORS.red },
    { label: 'Total Users', value: analysisData.detailed.total_users.toLocaleString(), icon: 'people' as const, color: COLORS.blue },
  ] : [];

  // ── Engagement Bar chart legend ───────────────────────────────────────────
  const barLegend = [
    { label: 'Scans',   color: COLORS.green  },
    { label: 'Posts',   color: COLORS.indigo },
    { label: 'Market',  color: COLORS.amber  },
    { label: 'Chatbot', color: COLORS.teal   },
  ];

  // ── History Table Data ────────────────────────────────────────────────────
  type HistoryRow = {
    date: string;
    type: string;
    user: string;
    result: string;
    status: 'Success' | 'Failed' | 'Pending';
    typeColor: string;
  };

  const getTypeColor = (type: string) => {
    if (type.includes('Leaf')) return COLORS.green;
    if (type.includes('Forum')) return COLORS.indigo;
    if (type.includes('Ripeness')) return COLORS.amber;
    if (type.includes('Disease')) return COLORS.red;
    if (type.includes('Market')) return COLORS.teal;
    return COLORS.blue;
  };

  const historyData: HistoryRow[] = analysisData && analysisData.history
    ? analysisData.history.map((item: any) => ({
        date: item.date,
        type: item.type,
        user: item.user,
        result: item.result,
        status: item.status as 'Success' | 'Failed' | 'Pending',
        typeColor: getTypeColor(item.type),
      }))
    : [];

  const totalPages = Math.ceil(historyData.length / ROWS_PER_PAGE);
  const pagedRows = historyData.slice(historyPage * ROWS_PER_PAGE, (historyPage + 1) * ROWS_PER_PAGE);

  const statusColors: Record<HistoryRow['status'], { bg: string; text: string }> = {
    Success: { bg: '#dcfce7', text: '#16a34a' },
    Failed:  { bg: '#fee2e2', text: '#dc2626' },
    Pending: { bg: '#fef9c3', text: '#ca8a04' },
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5d873e" />
          <Text style={styles.loadingText}>Loading analysis...</Text>
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
        {/* ── Period Selector ── */}
        <View style={styles.periodSelector}>
          {['week', 'month', 'year'].map((period) => (
            <TouchableOpacity
              key={period}
              style={[styles.periodButton, selectedPeriod === period && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[styles.periodText, selectedPeriod === period && styles.periodTextActive]}>
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Key Insights ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Insights</Text>
          <View style={styles.insightsGrid}>
            {insights.map((insight, index) => (
              <View key={index} style={[styles.insightCard, isTablet && { width: '48%' }]}>
                <View style={[styles.insightIcon, { backgroundColor: `${insight.color}18` }]}>
                  <Ionicons name={insight.icon} size={24} color={insight.color} />
                </View>
                <Text style={[styles.insightValue, { color: insight.color }]}>{insight.value}</Text>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightDescription}>{insight.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── User Growth Line Chart ── */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>User Growth</Text>
            <Text style={styles.chartSubtitle}>Last 6 months</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <LineChart
              data={growthData}
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

        {/* ── Feature Engagement Bar Chart ── */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Feature Engagement</Text>
            <Text style={styles.chartSubtitle}>Total interactions this month</Text>
          </View>
          {/* Color legend */}
          <View style={styles.legendRow}>
            {barLegend.map((item) => (
              <View key={item.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <BarChart
              data={engagementData}
              width={chartWidth}
              height={220}
              chartConfig={baseChartConfig}
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

        {/* ── Detailed Analytics list ── */}
        <View style={styles.analyticsCard}>
          <Text style={styles.sectionTitle}>Detailed Analytics</Text>
          {analyticsItems.map((item, index) => (
            <View key={index} style={styles.analyticsItem}>
              <View style={[styles.analyticsIcon, { backgroundColor: `${item.color}18` }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <View style={styles.analyticsContent}>
                <Text style={styles.analyticsLabel}>{item.label}</Text>
                <Text style={[styles.analyticsValue, { color: item.color }]}>{item.value}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </View>
          ))}
        </View>

        {/* ── History Table ── */}
        <View style={styles.tableCard}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.sectionTitle}>Activity History</Text>
            <Text style={styles.tableCount}>{historyData.length} records</Text>
          </View>

          {/* Table */}
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
              {/* Column headers */}
              <View style={styles.tableHead}>
                {['Date', 'Type', 'User', 'Result', 'Status'].map((col) => (
                  <Text key={col} style={[styles.tableHeadCell, col === 'Result' && { width: 140 }]}>
                    {col}
                  </Text>
                ))}
              </View>

              {/* Rows */}
              {pagedRows.map((row, i) => (
                <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                  <Text style={styles.tableCell}>{row.date}</Text>
                  <View style={styles.tableCell}>
                    <View style={[styles.typeBadge, { backgroundColor: `${row.typeColor}18` }]}>
                      <Text style={[styles.typeBadgeText, { color: row.typeColor }]}>{row.type}</Text>
                    </View>
                  </View>
                  <Text style={styles.tableCell}>{row.user}</Text>
                  <Text style={[styles.tableCell, { width: 140 }]} numberOfLines={1}>{row.result}</Text>
                  <View style={styles.tableCell}>
                    <View style={[styles.statusBadge, { backgroundColor: statusColors[row.status].bg }]}>
                      <Text style={[styles.statusText, { color: statusColors[row.status].text }]}>
                        {row.status}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Pagination */}
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[styles.pageBtn, historyPage === 0 && styles.pageBtnDisabled]}
              onPress={() => setHistoryPage((p) => Math.max(0, p - 1))}
              disabled={historyPage === 0}
            >
              <Ionicons name="chevron-back" size={16} color={historyPage === 0 ? '#d1d5db' : '#5d873e'} />
            </TouchableOpacity>

            {Array.from({ length: totalPages }).map((_, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.pageNumberBtn, historyPage === i && styles.pageNumberBtnActive]}
                onPress={() => setHistoryPage(i)}
              >
                <Text style={[styles.pageNumberText, historyPage === i && styles.pageNumberTextActive]}>
                  {i + 1}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.pageBtn, historyPage === totalPages - 1 && styles.pageBtnDisabled]}
              onPress={() => setHistoryPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={historyPage === totalPages - 1}
            >
              <Ionicons name="chevron-forward" size={16} color={historyPage === totalPages - 1 ? '#d1d5db' : '#5d873e'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Export Button ── */}
        <TouchableOpacity style={styles.exportButton}>
          <Ionicons name="download" size={20} color="#fff" />
          <Text style={styles.exportButtonText}>Export Report</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const COL_WIDTH = 100;

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

  // Period selector
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#5d873e',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  periodTextActive: {
    color: '#fff',
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3e2d',
    marginBottom: 16,
  },

  // Insights
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  insightCard: {
    flex: 1,
    minWidth: '47%',
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
  insightIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2d3e2d',
    marginBottom: 4,
    textAlign: 'center',
  },
  insightDescription: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },

  // Chart cards
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  chartHeader: {
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3e2d',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 12,
  },

  // Legend
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },

  // Analytics list
  analyticsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  analyticsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  analyticsIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  analyticsContent: {
    flex: 1,
  },
  analyticsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2d3e2d',
    marginBottom: 2,
  },
  analyticsValue: {
    fontSize: 18,
    fontWeight: '700',
  },

  // History table
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tableCount: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  tableHeadCell: {
    width: COL_WIDTH,
    fontSize: 12,
    fontWeight: '700',
    color: '#5d873e',
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  tableCell: {
    width: COL_WIDTH,
    fontSize: 13,
    color: '#374151',
    paddingHorizontal: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Pagination
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },
  pageBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageBtnDisabled: {
    backgroundColor: '#f3f4f6',
  },
  pageNumberBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageNumberBtnActive: {
    backgroundColor: '#5d873e',
  },
  pageNumberText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5d873e',
  },
  pageNumberTextActive: {
    color: '#fff',
  },

  // Export
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5d873e',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

export default AnalysisScreen;