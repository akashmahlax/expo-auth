import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { CounsellorProfile } from '@/types/user';

interface CounselorCardProps {
  counselor: CounsellorProfile;
  onPress?: () => void;
}

export function CounselorCard({ counselor, onPress }: CounselorCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/counselor/${counselor.uid}` as any);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 shadow-sm border border-gray-100 dark:border-gray-700"
    >
      <View className="flex-row items-center space-x-4">
        {/* Profile Image */}
        <View className="relative">
          {counselor.profilePicture ? (
            <Image
              source={{ uri: counselor.profilePicture }}
              className="w-16 h-16 rounded-full"
            />
          ) : (
            <View className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-600 items-center justify-center">
              <FontAwesome5 name="user" size={24} color={currentColors.icon} />
            </View>
          )}
          
          {/* Online Status */}
          <View className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-white dark:border-gray-800" />
        </View>

        {/* Counselor Info */}
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            Dr. {counselor.name}
          </Text>
          
          <Text className="text-sm text-gray-600 dark:text-gray-300 mb-1">
            {counselor.specializations?.slice(0, 2).join(', ') || 'General Counseling'}
          </Text>
          
          <View className="flex-row items-center space-x-4">
            {/* Rating */}
            <View className="flex-row items-center">
              <FontAwesome5 name="star" size={12} color="#F59E0B" />
              <Text className="text-sm text-gray-600 dark:text-gray-300 ml-1">
                {counselor.rating || '4.8'}
              </Text>
            </View>
            
            {/* Experience */}
            <View className="flex-row items-center">
              <MaterialIcons name="work" size={14} color={currentColors.icon} />
              <Text className="text-sm text-gray-600 dark:text-gray-300 ml-1">
                {counselor.experience || '5'}+ years
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="space-y-2">
          <TouchableOpacity
            onPress={() => router.push(`/video-call/new?counselorId=${counselor.uid}` as any)}
            className="w-10 h-10 rounded-full bg-blue-500 items-center justify-center"
          >
            <FontAwesome5 name="video" size={14} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => router.push(`/messages?counselorId=${counselor.uid}` as any)}
            className="w-10 h-10 rounded-full bg-green-500 items-center justify-center"
          >
            <FontAwesome5 name="comment" size={14} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Availability Indicator */}
      <View className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <Text className="text-xs text-green-600 dark:text-green-400">
          ● Available now - Typically responds in 5 minutes
        </Text>
      </View>
    </TouchableOpacity>
  );
}
