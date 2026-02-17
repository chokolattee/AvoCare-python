import React from 'react';
import { createDrawerNavigator, DrawerNavigationOptions } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useWindowDimensions } from 'react-native';
import DashboardScreen from '../Screens/Admin/DashboardScreen';
import UsersScreen from '../Screens/Admin/UsersScreen';
import AnalysisScreen from '../Screens/Admin/AnalysisScreen';
import MarketScreen from '../Screens/MarketScreen';
import ForumScreen from '../Screens/Admin/ForumScreen';
import Header from '../Components/Header';
import ProductScreen from '../Screens/Admin/ProductScreen';

export type AdminDrawerParamList = {
  Dashboard: undefined;
  Users: undefined;
  Market: undefined;
  Forum: undefined;
  Analysis: undefined;
  Products: undefined;
};

const Drawer = createDrawerNavigator<AdminDrawerParamList>();

const AdminNavigator = () => {
  const dimensions = useWindowDimensions();
  const isLargeScreen = dimensions.width >= 768;

  return (
    <Drawer.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ navigation }) => ({
        drawerActiveTintColor: '#5d873e',
        drawerInactiveTintColor: '#6b7280',
        drawerActiveBackgroundColor: '#f0f4ed',
        drawerStyle: {
          backgroundColor: '#fff',
          width: isLargeScreen ? 240 : 260,
          borderRightWidth: isLargeScreen ? 1 : 0,
          borderRightColor: '#e5e7eb',
        },
        drawerLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
          marginLeft: 4,
        },
        drawerItemStyle: {
          borderRadius: 8,
          marginHorizontal: 8,
          marginVertical: 2,
          paddingVertical: 2,
          paddingLeft: 8,
        },
        drawerType: isLargeScreen ? 'permanent' : 'front',
        swipeEnabled: !isLargeScreen,
        header: () => (
          <Header 
            onMenuPress={!isLargeScreen ? () => navigation.toggleDrawer() : undefined} 
            showNavLinks={false}
          />
        ),
      })}
    >
      <Drawer.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          drawerLabel: 'Dashboard',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="grid" size={20} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Users"
        component={UsersScreen}
        options={{
          drawerLabel: 'Users Management',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="people" size={20} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Market"
        component={MarketScreen}
        options={{
          drawerLabel: 'Market',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="storefront" size={20} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Forum"
        component={ForumScreen}
        options={{
          drawerLabel: 'Forum',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="chatbubbles" size={20} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Analysis"
        component={AnalysisScreen}
        options={{
          drawerLabel: 'Analysis',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="bar-chart" size={20} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Products"
        component={ProductScreen}
        options={{
          drawerLabel: 'Products',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="cube" size={20} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

export default AdminNavigator;
