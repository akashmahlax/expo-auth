import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getCounsellorProfile } from '@/services/counsellorService';
import { streamAuthService } from '@/services/streamAuthService';
import { streamChatService } from '@/services/streamChatService';
import { streamVideoService } from '@/services/streamVideoService';
import { CounsellorProfile } from '@/types/user';

export default function CounselorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  
  const [counselor, setCounselor] = useState<CounsellorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadCounselorProfile();
    }
  }, [id]);

  const loadCounselorProfile = async () => {
    try {
      const profile = await getCounsellorProfile(id!);
      setCounselor(profile);
    } catch (error) {
      console.error('Error loading counselor profile:', error);
      Alert.alert('Error', 'Failed to load counselor profile');
    } finally {
      setLoading(false);
    }
  };

  const handleStartVideoCall = async () => {
    try {
      if (!user || !counselor) return;

      // Initialize Stream.io if not already done
      if (!streamAuthService.isInitialized()) {
        await streamAuthService.initializeStream(user.uid, user.displayName || 'User');
      }

      const callId = `call_${user.uid}_${counselor.uid}_${Date.now()}`;
      const result = await streamVideoService.createVideoCall(callId);
      
      if (result.success) {
        router.push(`/video-call/${callId}` as any);
      } else {
        Alert.alert('Error', 'Failed to start video call');
      }
    } catch (error) {
      console.error('Error starting video call:', error);
      Alert.alert('Error', 'Failed to start video call');
    }
  };

  const handleStartChat = async () => {
    try {
      if (!user || !counselor) return;

      // Initialize Stream.io if not already done
      if (!streamAuthService.isInitialized()) {
        await streamAuthService.initializeStream(user.uid, user.displayName || 'User');
      }

      const channelId = `chat_${user.uid}_${counselor.uid}`;
      const result = await streamChatService.getOrCreateChannel(channelId, [user.uid, counselor.uid]);
      
      if (result.success) {
        router.push(`/messages?channelId=${channelId}` as any);
      } else {
        Alert.alert('Error', 'Failed to start chat');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('Error', 'Failed to start chat');
    }
  };

  const handleBookSession = () => {
    router.push(`/counselor/${id}/book-session` as any);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-gray-900">
        <Text className="text-gray-600 dark:text-gray-300">Loading counselor profile...</Text>
      </View>
    );
  }

  if (!counselor) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-gray-900">
        <Text className="text-gray-600 dark:text-gray-300">Counselor not found</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900">
      {/* Header */}
      <View className="px-4 pt-12 pb-6">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mb-4"
        >
          <MaterialIcons name="arrow-back" size={24} color={currentColors.text} />
        </TouchableOpacity>

        {/* Profile Section */}
        <View className="items-center">
          {counselor.profilePicture ? (
            <Image
              source={{ uri: counselor.profilePicture }}
              className="w-24 h-24 rounded-full mb-4"
            />
          ) : (
            <View className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-600 items-center justify-center mb-4">
              <FontAwesome5 name="user" size={32} color={currentColors.icon} />
            </View>
          )}

          <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Dr. {counselor.name}
          </Text>

          <Text className="text-lg text-gray-600 dark:text-gray-300 mb-4">
            {counselor.specializations?.join(', ') || 'General Counseling'}
          </Text>

          {/* Rating and Experience */}
          <View className="flex-row items-center space-x-6 mb-6">
            <View className="items-center">
              <View className="flex-row items-center mb-1">
                <FontAwesome5 name="star" size={16} color="#F59E0B" />
                <Text className="text-lg font-semibold text-gray-900 dark:text-white ml-1">
                  {counselor.rating || '4.8'}
                </Text>
              </View>
              <Text className="text-sm text-gray-600 dark:text-gray-300">Rating</Text>
            </View>

            <View className="items-center">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {counselor.experience || '5'}+
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-300">Years</Text>
            </View>

            <View className="items-center">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                200+
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-300">Sessions</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="px-4 mb-6">
        <View className="flex-row space-x-3">
          <TouchableOpacity
            onPress={handleStartVideoCall}
            className="flex-1 bg-blue-500 py-4 rounded-xl flex-row items-center justify-center"
          >
            <FontAwesome5 name="video" size={18} color="white" />
            <Text className="text-white font-semibold ml-2">Video Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleStartChat}
            className="flex-1 bg-green-500 py-4 rounded-xl flex-row items-center justify-center"
          >
            <FontAwesome5 name="comment" size={18} color="white" />
            <Text className="text-white font-semibold ml-2">Chat</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleBookSession}
          className="mt-3 bg-purple-500 py-4 rounded-xl flex-row items-center justify-center"
        >
          <MaterialIcons name="event" size={20} color="white" />
          <Text className="text-white font-semibold ml-2">Book Session</Text>
        </TouchableOpacity>
      </View>

      {/* About Section */}
      <View className="px-4 mb-6">
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-3">About</Text>
        <Text className="text-gray-600 dark:text-gray-300 leading-6">
          {counselor.bio || 'Experienced counselor dedicated to helping clients achieve mental wellness and personal growth through evidence-based therapeutic approaches.'}
        </Text>
      </View>

      {/* Specializations */}
      {counselor.specializations && counselor.specializations.length > 0 && (
        <View className="px-4 mb-6">
          <Text className="text-xl font-bold text-gray-900 dark:text-white mb-3">Specializations</Text>
          <View className="flex-row flex-wrap">
            {counselor.specializations.map((spec, index) => (
              <View key={index} className="bg-blue-100 dark:bg-blue-900 px-3 py-2 rounded-full mr-2 mb-2">
                <Text className="text-blue-800 dark:text-blue-200 text-sm">{spec}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Availability Status */}
      <View className="px-4 mb-8">
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-3">Availability</Text>
        <View className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-green-500 mr-2" />
            <Text className="text-green-800 dark:text-green-200 font-medium">Available Now</Text>
          </View>
          <Text className="text-green-600 dark:text-green-300 text-sm mt-1">
            Typically responds within 5 minutes
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
