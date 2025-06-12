import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import {
    Call,
    CallContent,
    StreamCall,
    StreamVideo
} from '@stream-io/video-react-native-sdk';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StatusBar, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { streamAuthService } from '@/services/streamAuthService';
import { streamVideoService } from '@/services/streamVideoService';

export default function VideoCallScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { user } = useAuth();
  const [call, setCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeCall();
    
    return () => {
      // Cleanup call when component unmounts
      if (call) {
        streamVideoService.leaveCall(call);
      }
    };
  }, [sessionId]);

  const initializeCall = async () => {
    try {
      if (!user || !sessionId) {
        setError('Missing required information');
        setLoading(false);
        return;
      }

      // Initialize Stream.io if not already done
      if (!streamAuthService.isInitialized()) {
        const initResult = await streamAuthService.initializeStream(
          user.uid,
          user.displayName || 'User',
          user.photoURL || undefined
        );
        
        if (!initResult.success) {
          throw new Error('Failed to initialize Stream.io');
        }
      }

      // Join the call
      const result = await streamVideoService.joinVideoCall(sessionId);
      
      if (result.success && result.call) {
        setCall(result.call);
      } else {
        // If joining fails, try creating the call
        const createResult = await streamVideoService.createVideoCall(sessionId);
        if (createResult.success && createResult.call) {
          setCall(createResult.call);
        } else {
          throw new Error('Failed to create or join call');
        }
      }
    } catch (error) {
      console.error('Error initializing call:', error);
      setError('Failed to initialize video call');
      Alert.alert('Error', 'Failed to initialize video call', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleEndCall = async () => {
    try {
      if (call) {
        await streamVideoService.leaveCall(call);
      }
      router.back();
    } catch (error) {
      console.error('Error ending call:', error);
      router.back();
    }
  };

  const handleToggleCamera = async () => {
    if (call) {
      await streamVideoService.toggleCamera(call);
    }
  };

  const handleToggleMicrophone = async () => {
    if (call) {
      await streamVideoService.toggleMicrophone(call);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900">
        <StatusBar barStyle="light-content" backgroundColor="#111827" />
        <View className="items-center">
          <View className="w-16 h-16 rounded-full bg-blue-500 items-center justify-center mb-4">
            <FontAwesome5 name="video" size={24} color="white" />
          </View>
          <Text className="text-white text-lg font-semibold mb-2">Connecting...</Text>
          <Text className="text-gray-300 text-center">
            Setting up your video call
          </Text>
        </View>
      </View>
    );
  }

  if (error || !call) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900 px-4">
        <StatusBar barStyle="light-content" backgroundColor="#111827" />
        <FontAwesome5 name="exclamation-triangle" size={48} color="#EF4444" />
        <Text className="text-white text-xl font-bold mt-4 mb-2">Call Failed</Text>
        <Text className="text-gray-300 text-center mb-6">
          {error || 'Unable to connect to the video call'}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-blue-500 px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const videoClient = streamAuthService.getVideoClient();
  
  if (!videoClient) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900">
        <Text className="text-white">Video client not available</Text>
      </View>
    );
  }  return (
    <View className="flex-1 bg-gray-900">
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      
      <StreamVideo client={videoClient}>
        <StreamCall call={call}>
          <CallContent />
          
          {/* Custom Top Controls */}
          <View className="absolute top-12 left-4 right-4 z-10 flex-row justify-between items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-black/30 items-center justify-center"
            >
              <MaterialIcons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            
            <View className="bg-black/30 px-4 py-2 rounded-full">
              <Text className="text-white font-semibold">Counseling Session</Text>
            </View>
            
            <View className="w-10" />
          </View>
          
          {/* Custom Bottom Controls */}
          <View className="absolute bottom-8 left-4 right-4 z-10">
            <View className="flex-row justify-center space-x-6">
              {/* Microphone Toggle */}
              <TouchableOpacity
                onPress={handleToggleMicrophone}
                className="w-14 h-14 rounded-full bg-gray-800/80 items-center justify-center"
              >
                <FontAwesome5 name="microphone" size={20} color="white" />
              </TouchableOpacity>

              {/* End Call */}
              <TouchableOpacity
                onPress={handleEndCall}
                className="w-14 h-14 rounded-full bg-red-500 items-center justify-center"
              >
                <FontAwesome5 name="phone" size={20} color="white" />
              </TouchableOpacity>

              {/* Camera Toggle */}
              <TouchableOpacity
                onPress={handleToggleCamera}
                className="w-14 h-14 rounded-full bg-gray-800/80 items-center justify-center"
              >
                <FontAwesome5 name="video" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </StreamCall>
      </StreamVideo>
    </View>
  );
}
