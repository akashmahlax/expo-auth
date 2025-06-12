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
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const { user, profile, loading: authLoading } = useAuth();
  
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

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
        setSessionsLoading(false);
      }
    };
    
    fetchUpcomingSessions();
  }, [user, authLoading]);
  
  if (authLoading || sessionsLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color={currentColors.tint} />
        <Text className="mt-5 text-gray-800 dark:text-gray-200">
          Loading...
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
          Access Denied
        </Text>
        <Text className="text-base mb-6 text-gray-600 dark:text-gray-300 text-center">
          This section is only accessible to verified counsellors.
        </Text>
        <TouchableOpacity
          className="bg-primary-600 py-3 rounded-md items-center"
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
            className={`p-4 rounded-lg mb-6 flex-row items-center ${
              isVerified 
                ? 'bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800' 
                : 'bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800'
            }`}
          >
            <MaterialIcons 
              name={isVerified ? "verified-user" : "error-outline"} 
              size={24} 
              color={isVerified ? "#4CAF50" : "#FF9800"} 
            />
            <View className="ml-3 flex-1">
              <Text className="text-lg font-bold mb-2 text-gray-800 dark:text-gray-100">
                {isVerified ? "Account Verified" : "Verification Pending"}
              </Text>
              <Text className="text-gray-600 dark:text-gray-300 mb-3">
                {isVerified 
                  ? "Your account is verified. You can now accept sessions and provide counselling." 
                  : "Your account verification is pending. Some features may be limited until verification is complete."
                }
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
                24
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                Total Sessions
              </Text>
            </View>
            <View className="flex-1 items-center py-4 mx-1 rounded-xl bg-white dark:bg-gray-800 shadow-sm">
              <Text className="text-2xl font-bold text-secondary-600 dark:text-secondary-400">
                12
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                This Week
              </Text>
            </View>
            <View className="flex-1 items-center py-4 mx-1 rounded-xl bg-white dark:bg-gray-800 shadow-sm">
              <Text className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                4.8
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                Rating
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
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View className="flex-row justify-between items-center p-4 mb-3 rounded-xl bg-white dark:bg-gray-800 shadow-sm">
                    <View className="flex-1">
                      <Text className="font-bold mb-1 text-gray-800 dark:text-gray-100">
                        {new Date(item.startTime).toLocaleDateString()} • {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text className="text-gray-600 dark:text-gray-300">
                        {item.clientName || "Anonymous Client"} • {item.topic || "General Counselling"}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      className="flex-row items-center bg-primary-600 py-2 px-4 rounded-md"
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
                scrollEnabled={false}
                nestedScrollEnabled={true}
                className="mb-2"
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
                  View All Sessions
                </Text>
                <MaterialIcons name="arrow-forward" size={18} color="#4F46E5" />
              </TouchableOpacity>
            </Link>
          </View>
          
          {/* Quick Actions */}
          <View className="mb-8">
            <Text className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">
              Quick Actions
            </Text>
            <View className="flex-row flex-wrap justify-between">
              <TouchableOpacity 
                className="w-[48%] items-center py-4 mb-3"
                onPress={() => router.navigate('/profile')}
              >
                <View className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 justify-center items-center mb-2">
                  <MaterialIcons name="person" size={24} color="#3B82F6" />
                </View>
                <Text className="text-gray-700 dark:text-gray-300">
                  Update Profile
                </Text>
              </TouchableOpacity>
              
              <Link href="/counsellor/availability" asChild>
                <TouchableOpacity className="w-[48%] items-center py-4 mb-3">
                  <View className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 justify-center items-center mb-2">
                    <MaterialIcons name="schedule" size={24} color="#10B981" />
                  </View>
                  <Text className="text-gray-700 dark:text-gray-300">
                    Manage Availability
                  </Text>
                </TouchableOpacity>
              </Link>
              
              <Link href="/counsellor/verification" asChild>
                <TouchableOpacity className="w-[48%] items-center py-4 mb-3">
                  <View className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 justify-center items-center mb-2">
                    <MaterialIcons name="verified-user" size={24} color="#8B5CF6" />
                  </View>
                  <Text className="text-gray-700 dark:text-gray-300">
                    Verification Status
                  </Text>
                </TouchableOpacity>
              </Link>
              
              <Link href="/messages" asChild>
                <TouchableOpacity className="w-[48%] items-center py-4 mb-3">
                  <View className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900 justify-center items-center mb-2">
                    <MaterialIcons name="chat" size={24} color="#F59E0B" />
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
