import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { DAYS_OF_WEEK, TimeSlot, WeeklyAvailability, addTimeSlot, getCounselorAvailability, removeTimeSlot } from '@/services/availabilityService';

export default function CounselorAvailabilityScreen() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  
  const [availability, setAvailability] = useState<WeeklyAvailability>({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [saveInProgress, setSaveInProgress] = useState(false);
  
  // Time selection states
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(() => {
    const date = new Date();
    date.setHours(date.getHours() + 1);
    return date;
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    
    const loadAvailability = async () => {
      try {
        const counselorAvailability = await getCounselorAvailability();
        setAvailability(counselorAvailability);
      } catch (error) {
        console.error('Failed to load availability:', error);
        Alert.alert('Error', 'Failed to load your availability schedule');
      } finally {
        setLoading(false);
      }
    };
    
    loadAvailability();
  }, [user, authLoading]);
  
  const handleAddTimeSlot = async () => {
    if (!selectedDay) return;
    
    try {
      setSaveInProgress(true);
      
      // Format times to HH:MM format
      const formattedStartTime = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`;
      const formattedEndTime = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;
      
      const newSlot: TimeSlot = {
        start: formattedStartTime,
        end: formattedEndTime
      };
      
      await addTimeSlot(selectedDay, newSlot);
      
      // Refresh availability data
      const updated = await getCounselorAvailability();
      setAvailability(updated);
      
      // Close the modal
      setIsModalVisible(false);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', errorMessage);
    } finally {
      setSaveInProgress(false);
    }
  };
  
  const handleRemoveTimeSlot = async (day: string, slotIndex: number) => {
    Alert.alert(
      'Remove Time Slot',
      'Are you sure you want to remove this time slot?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaveInProgress(true);
              await removeTimeSlot(day, slotIndex);
              
              // Refresh availability data
              const updated = await getCounselorAvailability();
              setAvailability(updated);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
              Alert.alert('Error', errorMessage);
            } finally {
              setSaveInProgress(false);
            }
          }
        }
      ]
    );
  };
  
  const openAddSlotModal = (day: string) => {
    setSelectedDay(day);
    setIsModalVisible(true);
  };
  
  // Format time for display
  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const isPM = hourNum >= 12;
    const displayHour = hourNum % 12 === 0 ? 12 : hourNum % 12;
    return `${displayHour}:${minute} ${isPM ? 'PM' : 'AM'}`;
  };

  const onChangeStartTime = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || startTime;
    setShowStartPicker(Platform.OS === 'ios');
    setStartTime(currentDate);
  };

  const onChangeEndTime = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || endTime;
    setShowEndPicker(Platform.OS === 'ios');
    setEndTime(currentDate);
  };

  if (authLoading || loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color={currentColors.tint} />
        <Text className="mt-5 text-gray-800 dark:text-gray-200">
          Loading your availability settings...
        </Text>
      </View>
    );
  }
  
  if (!profile || profile.type !== 'counsellor') {
    // Not a counsellor profile
    return (
      <View className="flex-1 p-4 bg-white dark:bg-gray-900">
        <Text className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">
          Access Denied
        </Text>
        <Text className="text-base mb-6 text-gray-600 dark:text-gray-300">
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

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <ScrollView className="flex-1">
        <View className={`flex-row items-center px-4 ${Platform.OS === 'ios' ? 'pt-12' : 'pt-4'} pb-4`}>
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 mr-2"
          >
            <MaterialIcons name="arrow-back" size={24} color={currentColors.text} />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Set Your Availability
          </Text>
        </View>
        
        <View className="px-4 pb-4">
          <Text className="text-base mb-6 text-gray-600 dark:text-gray-300 leading-relaxed">
            Set your weekly availability schedule. Clients will only be able to book sessions during these time slots.
          </Text>
        </View>
        
        <View className="px-4 pb-20">
          {DAYS_OF_WEEK.map((day) => (
            <View key={day} className="mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </Text>
                <TouchableOpacity
                  className="flex-row items-center py-2 px-4 rounded-lg bg-primary-600"
                  onPress={() => openAddSlotModal(day)}
                >
                  <MaterialIcons name="add" size={18} color="#FFFFFF" />
                  <Text className="ml-1 font-bold text-white">
                    Add Slot
                  </Text>
                </TouchableOpacity>
              </View>
              
              {availability[day]?.slots?.length > 0 ? (
                <View>
                  {availability[day].slots.map((slot, index) => (
                    <View 
                      key={index} 
                      className="flex-row items-center justify-between py-4 px-4 mb-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                    >
                      <Text className="text-base text-gray-700 dark:text-gray-200">
                        {formatTime(slot.start)} - {formatTime(slot.end)}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveTimeSlot(day, index)}
                        className="p-2 rounded-full bg-gray-200 dark:bg-gray-700"
                      >
                        <MaterialIcons name="close" size={18} color={currentColors.text} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="py-2 text-gray-500 dark:text-gray-400 italic">
                  No time slots added
                </Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
      
      {/* Time Slot Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="w-11/12 max-w-md rounded-xl p-6 bg-white dark:bg-gray-800">
            <Text className="text-xl font-bold mb-4 text-center text-gray-800 dark:text-gray-100">
              Add Time Slot for {selectedDay?.charAt(0).toUpperCase() + selectedDay?.slice(1)}
            </Text>
            
            <Text className="text-base mb-4 text-gray-700 dark:text-gray-300">
              Specify your available time range:
            </Text>
            
            <View className="mb-6">
              <View className="mb-4">
                <Text className="text-base mb-2 text-gray-700 dark:text-gray-300">
                  Start Time
                </Text>
                <TouchableOpacity 
                  className="py-3 px-4 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text className="text-base text-gray-800 dark:text-gray-200">
                    {startTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                  </Text>
                </TouchableOpacity>
                
                {showStartPicker && (
                  <DateTimePicker
                    value={startTime}
                    mode="time"
                    is24Hour={false}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onChangeStartTime}
                    themeVariant={colorScheme}
                  />
                )}
              </View>
              
              <View className="mb-2">
                <Text className="text-base mb-2 text-gray-700 dark:text-gray-300">
                  End Time
                </Text>
                <TouchableOpacity 
                  className="py-3 px-4 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                  onPress={() => setShowEndPicker(true)}
                >
                  <Text className="text-base text-gray-800 dark:text-gray-200">
                    {endTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                  </Text>
                </TouchableOpacity>
                
                {showEndPicker && (
                  <DateTimePicker
                    value={endTime}
                    mode="time"
                    is24Hour={false}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onChangeEndTime}
                    themeVariant={colorScheme}
                    minimumDate={startTime}
                  />
                )}
              </View>
            </View>
            
            <View className="flex-row items-center mb-6">
              <FontAwesome name="info-circle" size={16} color={currentColors.icon} />
              <Text className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                Times are shown in your local time zone
              </Text>
            </View>
            
            <View className="flex-row justify-between">
              <TouchableOpacity
                className="flex-1 mr-2 py-3 rounded-lg border border-gray-300 dark:border-gray-600"
                onPress={() => setIsModalVisible(false)}
              >
                <Text className="text-center text-gray-700 dark:text-gray-300 font-medium">
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="flex-1 ml-2 py-3 rounded-lg bg-primary-600"
                onPress={handleAddTimeSlot}
                disabled={saveInProgress}
              >
                {saveInProgress ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-center text-white font-medium">
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
