import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { StreamChat, Channel as StreamChannel } from 'stream-chat';
import { Channel, ChannelList, Chat, MessageInput, MessageList } from 'stream-chat-expo';

import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { streamAuthService } from '@/services/streamAuthService';
import { streamChatService } from '@/services/streamChatService';

export default function MessagesScreen() {
  const { user, profile } = useAuth();
  const { channelId, counselorId } = useLocalSearchParams<{ channelId?: string; counselorId?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  
  const [currentChannel, setCurrentChannel] = useState<StreamChannel | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    if (channelId && chatClient) {
      loadSpecificChannel();
    }
  }, [channelId, chatClient]);

  const initializeChat = async () => {
    try {
      if (!user) return;

      // Initialize Stream.io if not already done
      if (!streamAuthService.isInitialized()) {
        const initResult = await streamAuthService.initializeStream(
          user.uid,
          user.displayName || profile?.name || 'User',
          user.photoURL || undefined
        );
        
        if (!initResult.success) {
          throw new Error('Failed to initialize Stream.io');
        }
      }

      const client = streamAuthService.getChatClient();
      setChatClient(client);
    } catch (error) {
      console.error('Error initializing chat:', error);
      Alert.alert('Error', 'Failed to initialize chat');
    } finally {
      setLoading(false);
    }
  };

  const loadSpecificChannel = async () => {
    try {
      if (!channelId || !chatClient) return;

      const channel = chatClient.channel('messaging', channelId);
      await channel.watch();
      setCurrentChannel(channel);
    } catch (error) {
      console.error('Error loading channel:', error);
      Alert.alert('Error', 'Failed to load conversation');
    }
  };

  const startNewChat = async (counselorUserId: string) => {
    try {
      if (!user) return;

      const newChannelId = `chat_${user.uid}_${counselorUserId}`;
      const result = await streamChatService.getOrCreateChannel(newChannelId, [user.uid, counselorUserId]);
      
      if (result.success && result.channel) {
        setCurrentChannel(result.channel);
      } else {
        Alert.alert('Error', 'Failed to start chat');
      }
    } catch (error) {
      console.error('Error starting new chat:', error);
      Alert.alert('Error', 'Failed to start chat');
    }
  };

  const renderChannelListHeader = () => (
    <View className="px-4 pt-12 pb-4 bg-white dark:bg-gray-900">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">
          Messages
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/' as any)}
          className="p-2 rounded-full bg-blue-500"
        >
          <FontAwesome5 name="plus" size={16} color="white" />
        </TouchableOpacity>
      </View>
      <Text className="text-gray-600 dark:text-gray-300 mb-4">
        Continue conversations with your counselors
      </Text>
    </View>
  );

  const renderEmptyChannelList = () => (
    <View className="flex-1 justify-center items-center px-4">
      <FontAwesome5 name="comments" size={48} color={currentColors.icon} />
      <Text className="text-xl font-semibold text-gray-900 dark:text-white mt-4 mb-2">
        No Conversations Yet
      </Text>
      <Text className="text-gray-600 dark:text-gray-300 text-center mb-6">
        Start a conversation with a counselor to begin your mental health journey
      </Text>
      <TouchableOpacity
        onPress={() => router.push('/' as any)}
        className="bg-blue-500 px-6 py-3 rounded-lg"
      >
        <Text className="text-white font-semibold">Find Counselors</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-gray-900">
        <Text className="text-gray-600 dark:text-gray-300">Loading messages...</Text>
      </View>
    );
  }

  if (!chatClient) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-gray-900">
        <FontAwesome5 name="exclamation-triangle" size={48} color="#EF4444" />
        <Text className="text-xl font-bold text-gray-900 dark:text-white mt-4 mb-2">
          Chat Unavailable
        </Text>
        <Text className="text-gray-600 dark:text-gray-300 text-center">
          Unable to connect to chat service
        </Text>
      </View>
    );
  }

  // If we have a specific channel, show the chat interface
  if (currentChannel) {
    return (
      <Chat client={chatClient}>
        <Channel channel={currentChannel}>
          <View className="flex-1 bg-white dark:bg-gray-900">
            {/* Chat Header */}
            <View className="px-4 pt-12 pb-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <View className="flex-row items-center">
                <TouchableOpacity
                  onPress={() => {
                    setCurrentChannel(null);
                    router.setParams({ channelId: undefined });
                  }}
                  className="mr-3"
                >
                  <MaterialIcons name="arrow-back" size={24} color={currentColors.text} />
                </TouchableOpacity>
                <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                  Counselor Chat
                </Text>
              </View>
            </View>

            {/* Messages */}
            <MessageList />
            
            {/* Message Input */}
            <MessageInput />
          </View>
        </Channel>
      </Chat>
    );
  }

  // Show channel list
  return (
    <Chat client={chatClient}>
      <View className="flex-1 bg-white dark:bg-gray-900">
        {renderChannelListHeader()}
        <ChannelList
          filters={{ members: { $in: [user!.uid] } }}
          sort={{ last_message_at: -1 }}
          onSelect={(channel) => setCurrentChannel(channel)}
          EmptyStateIndicator={renderEmptyChannelList}
        />
      </View>
    </Chat>
  );
}
