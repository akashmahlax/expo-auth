import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { styled } from 'nativewind';
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

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);

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
      <StyledView className="flex-1 justify-center items-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color={currentColors.tint} />
        <StyledText className="mt-5 text-gray-800 dark:text-gray-200">
          Loading your availability settings...
        </StyledText>
      </StyledView>
    );
  }
  
  if (!profile || profile.type !== 'counsellor') {
    // Not a counsellor profile
    return (
      <StyledView className="flex-1 p-4 bg-white dark:bg-gray-900">
        <StyledText className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">
          Access Denied
        </StyledText>
        <StyledText className="text-base mb-6 text-gray-600 dark:text-gray-300">
          This section is only available to counsellor accounts.
        </StyledText>
        <StyledTouchableOpacity
          className="py-4 px-6 rounded-lg bg-primary-600 items-center"
          onPress={() => router.back()}
        >
          <StyledText className="font-bold text-white">
            Go Back
          </StyledText>
        </StyledTouchableOpacity>
      </StyledView>
    );
  }

  return (
    <StyledView className="flex-1 bg-white dark:bg-gray-900">
      <StyledScrollView className="flex-1">
        <StyledView className={`flex-row items-center px-4 ${Platform.OS === 'ios' ? 'pt-12' : 'pt-4'} pb-4`}>
          <StyledTouchableOpacity
            onPress={() => router.back()}
            className="p-2 mr-2"
          >
            <MaterialIcons name="arrow-back" size={24} color={currentColors.text} />
          </StyledTouchableOpacity>
          <StyledText className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Set Your Availability
          </StyledText>
        </StyledView>
        
        <StyledView className="px-4 pb-4">
          <StyledText className="text-base mb-6 text-gray-600 dark:text-gray-300 leading-relaxed">
            Set your weekly availability schedule. Clients will only be able to book sessions during these time slots.
          </StyledText>
        </StyledView>
        
        <StyledView className="px-4 pb-20">
          {DAYS_OF_WEEK.map((day) => (
            <StyledView key={day} className="mb-6">
              <StyledView className="flex-row items-center justify-between mb-3">
                <StyledText className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </StyledText>
                <StyledTouchableOpacity
                  className="flex-row items-center py-2 px-4 rounded-lg bg-primary-600"
                  onPress={() => openAddSlotModal(day)}
                >
                  <MaterialIcons name="add" size={18} color="#FFFFFF" />
                  <StyledText className="ml-1 font-bold text-white">
                    Add Slot
                  </StyledText>
                </StyledTouchableOpacity>
              </StyledView>
              
              {availability[day]?.slots?.length > 0 ? (
                <StyledView>
                  {availability[day].slots.map((slot, index) => (
                    <StyledView 
                      key={index} 
                      className="flex-row items-center justify-between py-4 px-4 mb-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                    >
                      <StyledText className="text-base text-gray-700 dark:text-gray-200">
                        {formatTime(slot.start)} - {formatTime(slot.end)}
                      </StyledText>
                      <StyledTouchableOpacity
                        onPress={() => handleRemoveTimeSlot(day, index)}
                        className="p-2 rounded-full bg-gray-200 dark:bg-gray-700"
                      >
                        <MaterialIcons name="close" size={18} color={currentColors.text} />
                      </StyledTouchableOpacity>
                    </StyledView>
                  ))}
                </StyledView>
              ) : (
                <StyledText className="py-2 text-gray-500 dark:text-gray-400 italic">
                  No time slots added
                </StyledText>
              )}
            </StyledView>
          ))}
        </StyledView>
      </StyledScrollView>
      
      {/* Time Slot Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <StyledView className="flex-1 justify-center items-center bg-black/50">
          <StyledView className="w-11/12 max-w-md rounded-xl p-6 bg-white dark:bg-gray-800">
            <StyledText className="text-xl font-bold mb-4 text-center text-gray-800 dark:text-gray-100">
              Add Time Slot for {selectedDay?.charAt(0).toUpperCase() + selectedDay?.slice(1)}
            </StyledText>
            
            <StyledText className="text-base mb-4 text-gray-700 dark:text-gray-300">
              Specify your available time range:
            </StyledText>
            
            <StyledView className="mb-6">
              <StyledView className="mb-4">
                <StyledText className="text-base mb-2 text-gray-700 dark:text-gray-300">
                  Start Time
                </StyledText>
                <StyledTouchableOpacity 
                  className="py-3 px-4 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                  onPress={() => setShowStartPicker(true)}
                >
                  <StyledText className="text-base text-gray-800 dark:text-gray-200">
                    {startTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                  </StyledText>
                </StyledTouchableOpacity>
                
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
              </StyledView>
              
              <StyledView className="mb-2">
                <StyledText className="text-base mb-2 text-gray-700 dark:text-gray-300">
                  End Time
                </StyledText>
                <StyledTouchableOpacity 
                  className="py-3 px-4 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                  onPress={() => setShowEndPicker(true)}
                >
                  <StyledText className="text-base text-gray-800 dark:text-gray-200">
                    {endTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                  </StyledText>
                </StyledTouchableOpacity>
                
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
              </StyledView>
            </StyledView>
            
            <StyledView className="flex-row items-center mb-6">
              <FontAwesome name="info-circle" size={16} color={currentColors.icon} />
              <StyledText className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                Times are shown in your local time zone
              </StyledText>
            </StyledView>
            
            <StyledView className="flex-row justify-between">
              <StyledTouchableOpacity
                className="flex-1 mr-2 py-3 rounded-lg border border-gray-300 dark:border-gray-600"
                onPress={() => setIsModalVisible(false)}
              >
                <StyledText className="text-center text-gray-700 dark:text-gray-300 font-medium">
                  Cancel
                </StyledText>
              </StyledTouchableOpacity>
              
              <StyledTouchableOpacity
                className="flex-1 ml-2 py-3 rounded-lg bg-primary-600"
                onPress={handleAddTimeSlot}
                disabled={saveInProgress}
              >
                {saveInProgress ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <StyledText className="text-center text-white font-medium">
                    Save
                  </StyledText>
                )}
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
        </StyledView>
      </Modal>
    </StyledView>
  );
}
