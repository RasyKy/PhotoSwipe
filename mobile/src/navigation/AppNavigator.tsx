import React from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useSwipeStore } from '../store/swipeStore';
import SwipeScreen from '../features/swipe/SwipeScreen';
import DeleteReviewScreen from '../features/delete/DeleteReviewScreen';
import DashboardScreen from '../features/dashboard/DashboardScreen';
import SettingsScreen from '../features/settings/SettingsScreen';

export type AppTabParamList = {
  Swipe: undefined;
  Delete: undefined;
  Dashboard: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

export default function AppNavigator() {
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const deleteQueueLength = useSwipeStore((state) => state.deleteQueue.length);

  return (
    <NavigationContainer theme={isDarkMode ? DarkTheme : DefaultTheme}>
      <Tab.Navigator
        sceneContainerStyle={{ backgroundColor: colors.background }}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.tabBarActive,
          tabBarInactiveTintColor: colors.tabBarInactive,
          tabBarStyle: {
            backgroundColor: colors.tabBar,
            borderTopColor: colors.tabBarBorder,
            borderTopWidth: StyleSheet.hairlineWidth,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom + 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '400',
            letterSpacing: 0,
            marginTop: 4,
          },
          tabBarIconStyle: {
            marginTop: 0,
          },
        }}
      >
        <Tab.Screen
          name="Swipe"
          component={SwipeScreen}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'albums' : 'albums-outline'} size={26} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Delete"
          component={DeleteReviewScreen}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'trash' : 'trash-outline'} size={26} color={color} />
            ),
            tabBarBadge: deleteQueueLength > 0 ? deleteQueueLength : undefined,
          }}
        />
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={26} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'settings' : 'settings-outline'} size={26} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
