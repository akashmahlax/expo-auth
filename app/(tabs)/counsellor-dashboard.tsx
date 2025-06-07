import { MaterialIcons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getUpcomingSessions } from '@/services/sessionService';
import { CounsellorProfile, Session } from '@/types/user';

export default function CounsellorDashboardScreen() {
  const { user, profile, loading: authLoading } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || authLoading) return;
    
    // Load upcoming sessions
    const fetchUpcomingSessions = async () => {
      try {
        const sessions = await getUpcomingSessions();
        setUpcomingSessions(sessions);
      } catch (error) {
        console.error('Failed to fetch upcoming sessions:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUpcomingSessions();
  }, [user, authLoading]);
  
  if (authLoading || loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color={currentColors.tint} />
        <Text className="mt-5 text-gray-800 dark:text-gray-200">
          Loading your dashboard...
        </Text>
      </View>
    );
  }
  
  if (!user) {
    // User is not logged in, redirect to auth
    router.replace('/auth');
    return null;
  }

  if (!profile || profile.type !== 'counsellor') {
    // Not a counsellor profile
    return (
      <View className="flex-1 p-4 bg-white dark:bg-gray-900">
        <Text className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">
          Counsellor Access Only
        </Text>
        <Text className="text-base mb-6 text-gray-600 dark:text-gray-300 text-center">
          This section is only available to counsellor accounts.
        </Text>
        <TouchableOpacity
          className="py-4 px-6 rounded-lg bg-primary-600 items-center"
          onPress={() => router.back()}
        >
          <Text className="font-bold text-white">
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const counsellorProfile = profile as CounsellorProfile;
  const isVerified = counsellorProfile.verificationStatus === 'verified';

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <ScrollView className="flex-1">
        <View className="p-4">
          <Text className="text-2xl font-bold mb-5 text-gray-800 dark:text-gray-100">
            Counsellor Dashboard
          </Text>
          {/* Verification Status Card */}
          <View 
            className={`flex-row p-4 rounded-xl mb-4 ${
              isVerified 
              ? 'bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800' 
              : 'bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800'
            }`}>
            <MaterialIcons 
              name={isVerified ? "verified-user" : "error-outline"} 
              size={24} 
              color={isVerified ? "#4CAF50" : "#FF9800"} 
            />
            <View className="ml-3 flex-1">
              <Text className="text-lg font-bold mb-2 text-gray-800 dark:text-gray-100">
                {isVerified ? "Verified Counsellor" : "Verification Pending"}
              </Text>
              <Text className="text-gray-600 dark:text-gray-300 mb-3">
                {isVerified 
                  ? "Your account is verified. You can now accept sessions and provide counselling." 
                  : "Your account verification is pending. Some features may be limited until verification is complete."}
              </Text>
              {!isVerified && (
                <Link href="/counsellor/verification" asChild>
                  <TouchableOpacity className="py-2 px-4 rounded-md bg-primary-600 self-start">
                    <Text className="font-bold text-white">
                      Complete Verification
                    </Text>
                  </TouchableOpacity>
                </Link>
              )}
            </View>
          </View>
          {/* Stats Cards */}
          <View className="flex-row justify-between mb-4">
            <View className="flex-1 items-center py-4 mx-1 rounded-xl bg-white dark:bg-gray-800 shadow-sm">
              <Text className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {upcomingSessions.length}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                Upcoming Sessions
              </Text>
            </View>
            <View className="flex-1 items-center py-4 mx-1 rounded-xl bg-white dark:bg-gray-800 shadow-sm">
              <Text className="text-2xl font-bold text-secondary-600 dark:text-secondary-400">
                0
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                Unread Messages
              </Text>
            </View>
            <View className="flex-1 items-center py-4 mx-1 rounded-xl bg-white dark:bg-gray-800 shadow-sm">
              <Text className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                0
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                Total Sessions
              </Text>
            </View>
          </View>
          {/* Upcoming Sessions */}
          <View className="mb-6">
            <Text className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">
              Upcoming Sessions
            </Text>
            {upcomingSessions.length > 0 ? (
              <FlatList
                data={upcomingSessions}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View className="flex-row justify-between items-center p-4 mb-3 rounded-xl bg-white dark:bg-gray-800 shadow-sm">
                    <View className="flex-1">
                      <Text className="font-bold mb-1 text-gray-800 dark:text-gray-100">
                        {(item.startTime instanceof Date ? item.startTime : ('toDate' in item.startTime ? item.startTime.toDate() : new Date())).toLocaleDateString()}
                      </Text>
                      <Text className="text-gray-600 dark:text-gray-300">
                        {(('toDate' in item.startTime ? item.startTime.toDate() : item.startTime) as Date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                        {(('toDate' in item.endTime ? item.endTime.toDate() : item.endTime) as Date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      className="flex-row items-center py-2 px-4 rounded-lg bg-primary-600"
                      onPress={() => {
                        router.push({
                          pathname: '/videocall',
                          params: { sessionId: item.id }
                        });
                      }}
                    >
                      <MaterialIcons name="videocam" size={18} color="#FFFFFF" />
                      <Text className="ml-1 font-bold text-white">
                        Join
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                className="mb-2"
                scrollEnabled={false}
                nestedScrollEnabled={true}
                ListEmptyComponent={
                  <Text className="text-center italic text-gray-500 dark:text-gray-400 py-4">
                    No upcoming sessions
                  </Text>
                }
              />
            ) : (
              <Text className="text-center italic text-gray-500 dark:text-gray-400 py-4">
                No upcoming sessions
              </Text>
            )}
            <Link href="/sessions" asChild>
              <TouchableOpacity className="flex-row items-center justify-center py-3 rounded-lg border border-primary-600 dark:border-primary-500">
                <Text className="font-semibold text-primary-600 dark:text-primary-500 mr-1">
                  See All Sessions
                </Text>
                <MaterialIcons name="chevron-right" size={20} color={colorScheme === 'dark' ? Colors.dark.tint : Colors.light.tint} />
              </TouchableOpacity>
            </Link>
          </View>
          {/* Quick Actions */}
          <View className="mb-8">
            <Text className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">
              Quick Actions
            </Text>
            <View className="flex-row flex-wrap justify-between">
              <Link href="/profile" asChild>
                <TouchableOpacity className="w-[48%] items-center py-4 mb-3">
                  <View className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 justify-center items-center mb-2">
                    <MaterialIcons name="account-circle" size={24} color="#2196F3" />
                  </View>
                  <Text className="text-gray-700 dark:text-gray-300">
                    Edit Profile
                  </Text>
                </TouchableOpacity>
              </Link>
              <Link href="/counsellor/availability" asChild>
                <TouchableOpacity className="w-[48%] items-center py-4 mb-3">
                  <View className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 justify-center items-center mb-2">
                    <MaterialIcons name="calendar-today" size={24} color="#4CAF50" />
                  </View>
                  <Text className="text-gray-700 dark:text-gray-300">
                    Set Availability
                  </Text>
                </TouchableOpacity>
              </Link>
              <Link href="/counsellor/verification" asChild>
                <TouchableOpacity className="w-[48%] items-center py-4 mb-3">
                  <View className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 justify-center items-center mb-2">
                    <MaterialIcons name="verified" size={24} color="#9C27B0" />
                  </View>
                  <Text className="text-gray-700 dark:text-gray-300">
                    Verification
                  </Text>
                </TouchableOpacity>
              </Link>
              <Link href="/messages" asChild>
                <TouchableOpacity className="w-[48%] items-center py-4 mb-3">
                  <View className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900 justify-center items-center mb-2">
                    <MaterialIcons name="chat" size={24} color="#FF9800" />
                  </View>
                  <Text className="text-gray-700 dark:text-gray-300">
                    Messages
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
