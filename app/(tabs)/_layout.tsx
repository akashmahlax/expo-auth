import { FontAwesome, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user, loading, profile, isUser, isCounsellor } = useAuth();

  // If not logged in, redirect to auth screen
  if (!loading && !user) {
    return <Redirect href="../auth" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      {isUser && (
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
          }}
        />
      )}
      {isCounsellor && (
        <Tabs.Screen
          name="counsellor-dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color }) => <FontAwesome5 size={22} name="clipboard-list" color={color} />,
          }}
        />
      )}
      <Tabs.Screen
        name="sessions"
        options={{
          title: 'Sessions',
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="event" color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => <FontAwesome size={24} name="comments" color={color} />,
        }}
      />
      <Tabs.Screen
        name="videocall"
        options={{
          title: 'Video',
          tabBarIcon: ({ color }) => <FontAwesome size={24} name="video-camera" color={color} />,
        }}
      />
    </Tabs>
  );
}
