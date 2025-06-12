import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import React from 'react';
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/firebaseConfig';
import { useColorScheme } from '@/hooks/useColorScheme';
import { streamAuthService } from '@/services/streamAuthService';

export default function ProfileScreen() {
  const { user, profile } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // Disconnect from Stream.io
              await streamAuthService.disconnectUser();
              // Sign out from Firebase
              await signOut(auth);
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  const menuItems = [
    {
      id: 'edit-profile',
      title: 'Edit Profile',
      icon: 'user-edit' as const,
      onPress: () => Alert.alert('Coming Soon', 'Edit profile feature coming soon'),
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: 'bell' as const,
      onPress: () => Alert.alert('Coming Soon', 'Notification settings coming soon'),
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      icon: 'shield-alt' as const,
      onPress: () => Alert.alert('Coming Soon', 'Privacy settings coming soon'),
    },
    {
      id: 'help',
      title: 'Help & Support',
      icon: 'question-circle' as const,
      onPress: () => Alert.alert('Coming Soon', 'Help center coming soon'),
    },
    {
      id: 'about',
      title: 'About',
      icon: 'info-circle' as const,
      onPress: () => Alert.alert('About', 'Mental Health Counseling App v1.0'),
    },
  ];

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900">
      {/* Header */}
      <View className="px-4 pt-12 pb-6">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Profile
        </Text>

        {/* Profile Card */}
        <View className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 mb-6">
          <View className="items-center">
            {user?.photoURL ? (
              <Image
                source={{ uri: user.photoURL }}
                className="w-20 h-20 rounded-full mb-4"
              />
            ) : (
              <View className="w-20 h-20 rounded-full bg-blue-500 items-center justify-center mb-4">
                <FontAwesome5 name="user" size={32} color="white" />
              </View>
            )}

            <Text className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              {profile?.name || user?.displayName || 'User'}
            </Text>

            <Text className="text-gray-600 dark:text-gray-300 mb-4">
              {user?.email}
            </Text>

            {profile?.type && (
              <View className="bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full">
                <Text className="text-blue-800 dark:text-blue-200 text-sm font-medium capitalize">
                  {profile.type === 'counsellor' ? 'Counselor' : 'Client'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats Cards */}
        <View className="flex-row space-x-3 mb-6">
          <View className="flex-1 bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
            <Text className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
              12
            </Text>
            <Text className="text-green-800 dark:text-green-300 text-sm">
              Sessions Completed
            </Text>
          </View>

          <View className="flex-1 bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl">
            <Text className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
              3
            </Text>
            <Text className="text-purple-800 dark:text-purple-300 text-sm">
              Active Conversations
            </Text>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View className="px-4">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Settings
        </Text>

        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={item.onPress}
            className="flex-row items-center justify-between py-4 px-4 mb-2 bg-white dark:bg-gray-800 rounded-lg"
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center mr-3">
                <FontAwesome5 name={item.icon} size={16} color={currentColors.icon} />
              </View>
              <Text className="text-gray-900 dark:text-white font-medium">
                {item.title}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={currentColors.icon} />
          </TouchableOpacity>
        ))}

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={handleSignOut}
          className="flex-row items-center justify-center py-4 px-4 mt-6 mb-8 bg-red-50 dark:bg-red-900/20 rounded-lg"
        >
          <FontAwesome5 name="sign-out-alt" size={16} color="#EF4444" />
          <Text className="text-red-500 font-semibold ml-2">
            Sign Out
          </Text>
        </TouchableOpacity>
      </View>

      {/* App Version */}
      <View className="items-center py-4">
        <Text className="text-gray-500 dark:text-gray-400 text-sm">
          Version 1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}
