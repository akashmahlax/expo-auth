import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { CounselorCard } from '@/components/CounselorCard';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getAllCounsellors } from '@/services/counsellorService';
import { streamAuthService } from '@/services/streamAuthService';
import { CounsellorProfile } from '@/types/user';

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  
  const [counselors, setCounselors] = useState<CounsellorProfile[]>([]);
  const [filteredCounselors, setFilteredCounselors] = useState<CounsellorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCounselors();
    initializeStreamIO();
  }, []);

  useEffect(() => {
    filterCounselors();
  }, [searchQuery, counselors]);

  const initializeStreamIO = async () => {
    if (user && !streamAuthService.isInitialized()) {
      try {
        await streamAuthService.initializeStream(
          user.uid,
          user.displayName || profile?.name || 'User',
          user.photoURL || undefined
        );
      } catch (error) {
        console.error('Failed to initialize Stream.io:', error);
      }
    }
  };

  const loadCounselors = async () => {
    try {
      setLoading(true);
      const counselorsList = await getAllCounsellors();
      // Filter only verified counselors
      const verifiedCounselors = counselorsList.filter(c => c.isVerified);
      setCounselors(verifiedCounselors);
    } catch (error) {
      console.error('Error loading counselors:', error);
      Alert.alert('Error', 'Failed to load counselors');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCounselors();
    setRefreshing(false);
  };
  const filterCounselors = () => {
    if (!searchQuery.trim()) {
      setFilteredCounselors(counselors);
      return;
    }

    const filtered = counselors.filter(counselor =>
      (counselor.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       counselor.displayName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      counselor.specializations?.some(spec =>
        spec.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
    setFilteredCounselors(filtered);
  };

  const renderCounselorCard = ({ item }: { item: CounsellorProfile }) => (
    <CounselorCard counselor={item} />
  );

  const renderHeader = () => (
    <View className="px-4 pt-4 pb-2">
      {/* Welcome Section */}
      <View className="mb-6">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Hello, {profile?.name || user?.displayName || 'there'}! 👋
        </Text>
        <Text className="text-gray-600 dark:text-gray-300">
          Find the right counselor for your mental health journey
        </Text>
      </View>

      {/* Search Bar */}
      <View className="relative mb-4">
        <View className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
          <FontAwesome5 name="search" size={16} color={currentColors.icon} />
        </View>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search counselors or specializations..."
          placeholderTextColor={currentColors.icon}
          className="bg-gray-100 dark:bg-gray-800 rounded-xl pl-12 pr-4 py-4 text-gray-900 dark:text-white"
        />
      </View>

      {/* Quick Filters */}
      <View className="mb-4">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Popular Specializations
        </Text>
        <View className="flex-row flex-wrap">
          {['Anxiety', 'Depression', 'Relationships', 'Stress', 'Trauma'].map((spec) => (
            <TouchableOpacity
              key={spec}
              onPress={() => setSearchQuery(spec)}
              className="bg-blue-100 dark:bg-blue-900 px-4 py-2 rounded-full mr-2 mb-2"
            >
              <Text className="text-blue-800 dark:text-blue-200 text-sm font-medium">
                {spec}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Section Title */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
          Available Counselors ({filteredCounselors.length})
        </Text>
        
        <TouchableOpacity className="flex-row items-center">
          <MaterialIcons name="tune" size={20} color={currentColors.tint} />
          <Text className="text-sm text-blue-600 dark:text-blue-400 ml-1">Filter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center px-4 py-12">
      <FontAwesome5 name="user-md" size={48} color={currentColors.icon} />
      <Text className="text-xl font-semibold text-gray-900 dark:text-white mt-4 mb-2">
        No Counselors Found
      </Text>
      <Text className="text-gray-600 dark:text-gray-300 text-center">
        {searchQuery ? 'Try adjusting your search terms' : 'No counselors are available at the moment'}
      </Text>
      {searchQuery && (
        <TouchableOpacity
          onPress={() => setSearchQuery('')}
          className="mt-4 bg-blue-500 px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-semibold">Clear Search</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <FlatList
        data={filteredCounselors}
        keyExtractor={(item) => item.uid}
        renderItem={renderCounselorCard}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={currentColors.tint}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 100, // Extra padding for tab bar
        }}
      />
    </View>
  );
}
