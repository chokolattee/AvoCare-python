import React from 'react';
import { createDrawerNavigator, DrawerNavigationOptions } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../Screens/Admin/DashboardScreen';
import UsersScreen from '../Screens/Admin/UsersScreen';
import AnalysisScreen from '../Screens/Admin/AnalysisScreen';
import MarketScreen from '../Screens/MarketScreen';
import CommunityScreen from '../Screens/Forum/CommunityScreen';
import Header from '../Components/Header';

export type AdminDrawerParamList = {
  Dashboard: undefined;
  Users: undefined;
  Market: undefined;
  Forum: undefined;
  Analysis: undefined;
};

const Drawer = createDrawerNavigator<AdminDrawerParamList>();

// Wrapper component for CommunityScreen to handle navigation props
const ForumWrapper = ({ navigation }: any) => {
  return <CommunityScreen navigation={navigation} route={{ key: 'Forum', name: 'Forum' } as any} />;
};

const AdminNavigator = () => {
  return (
    <Drawer.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ navigation }) => ({
        drawerActiveTintColor: '#5d873e',
        drawerInactiveTintColor: '#6b7280',
        drawerActiveBackgroundColor: '#f0f4ed',
        drawerStyle: {
          backgroundColor: '#fff',
          width: 280,
        },
        drawerLabelStyle: {
          fontSize: 15,
          fontWeight: '600',
          marginLeft: -16,
        },
        drawerItemStyle: {
          borderRadius: 8,
          marginHorizontal: 8,
          paddingVertical: 4,
        },
        header: () => (
          <Header 
            onMenuPress={() => navigation.toggleDrawer()} 
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
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Users"
        component={UsersScreen}
        options={{
          drawerLabel: 'Users Management',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Market"
        component={MarketScreen}
        options={{
          drawerLabel: 'Market',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="storefront" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Forum"
        component={ForumWrapper}
        options={{
          drawerLabel: 'Forum',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Analysis"
        component={AnalysisScreen}
        options={{
          drawerLabel: 'Analysis',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="bar-chart" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

export default AdminNavigator;
