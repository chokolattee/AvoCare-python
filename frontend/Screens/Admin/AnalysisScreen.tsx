import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { StyleSheet } from 'react-native';

const AnalysisScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
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
    setTimeout(() => setRefreshing(false), 2000);
  };

  // Growth Metrics Data
  const growthData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [320, 450, 580, 720, 890, 1020],
        color: (opacity = 1) => `rgba(93, 135, 62, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  // Engagement Data
  const engagementData = {
    labels: ['Scans', 'Posts', 'Market', 'Chatbot'],
    datasets: [
      {
        data: [850, 420, 680, 530],
      },
    ],
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
  };

  const chartWidth = isTablet ? width * 0.45 : width - 48;

  const insights = [
    {
      icon: 'trending-up' as const,
      title: 'User Growth',
      value: '+24%',
      description: 'Increased from last month',
      color: '#16a34a',
    },
    {
      icon: 'scan' as const,
      title: 'Scan Accuracy',
      value: '94.2%',
      description: 'Disease detection rate',
      color: '#5d873e',
    },
    {
      icon: 'time' as const,
      title: 'Avg. Response Time',
      value: '1.2s',
      description: 'Chatbot performance',
      color: '#90b481',
    },
    {
      icon: 'heart' as const,
      title: 'User Satisfaction',
      value: '4.7/5',
      description: 'Based on 543 reviews',
      color: '#ef4444',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#5d873e']} />
        }
      >
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {['week', 'month', 'year'].map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodText,
                  selectedPeriod === period && styles.periodTextActive,
                ]}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Key Insights */}
        <View style={styles.insightsContainer}>
          <Text style={styles.sectionTitle}>Key Insights</Text>
          <View style={styles.insightsGrid}>
            {insights.map((insight, index) => (
              <View key={index} style={[styles.insightCard, isTablet && { width: '48%' }]}>
                <View style={[styles.insightIcon, { backgroundColor: `${insight.color}15` }]}>
                  <Ionicons name={insight.icon} size={24} color={insight.color} />
                </View>
                <Text style={styles.insightValue}>{insight.value}</Text>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightDescription}>{insight.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Growth Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>User Growth</Text>
            <Text style={styles.chartSubtitle}>Last 6 months</Text>
          </View>
          <LineChart
            data={growthData}
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
          />
        </View>

        {/* Engagement Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Feature Engagement</Text>
            <Text style={styles.chartSubtitle}>Total interactions this month</Text>
          </View>
          <BarChart
            data={engagementData}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            showValuesOnTopOfBars
            withInnerLines={false}
            fromZero
            yAxisLabel=""
            yAxisSuffix=""
          />
        </View>

        {/* Detailed Analytics */}
        <View style={styles.analyticsCard}>
          <Text style={styles.sectionTitle}>Detailed Analytics</Text>
          {[
            { label: 'Total Scans Performed', value: '12,543', icon: 'scan' as const, color: '#5d873e' },
            { label: 'Forum Posts Created', value: '456', icon: 'chatbubbles' as const, color: '#90b481' },
            { label: 'Market Transactions', value: '$24.8K', icon: 'cart' as const, color: '#6b9356' },
            { label: 'Chatbot Interactions', value: '8,932', icon: 'chatbox' as const, color: '#7fa768' },
            { label: 'Disease Detections', value: '3,421', icon: 'alert-circle' as const, color: '#ef4444' },
            { label: 'New Registrations', value: '892', icon: 'person-add' as const, color: '#3b82f6' },
          ].map((item, index) => (
            <View key={index} style={styles.analyticsItem}>
              <View style={[styles.analyticsIcon, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <View style={styles.analyticsContent}>
                <Text style={styles.analyticsLabel}>{item.label}</Text>
                <Text style={styles.analyticsValue}>{item.value}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </View>
          ))}
        </View>

        {/* Export Button */}
        <TouchableOpacity style={styles.exportButton}>
          <Ionicons name="download" size={20} color="#fff" />
          <Text style={styles.exportButtonText}>Export Report</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3e2d',
    marginBottom: 16,
  },
  insightsContainer: {
    marginBottom: 20,
  },
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
    color: '#2d3e2d',
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
  },
  chartHeader: {
    marginBottom: 16,
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
    color: '#5d873e',
  },
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
