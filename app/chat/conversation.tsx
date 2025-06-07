import { FontAwesome } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getConversation, listenToConversation, markMessagesAsRead, sendMessage } from '@/services/messageService';
import { Message } from '@/types/user';

export default function ConversationScreen() {
  const { userId, sessionId } = useLocalSearchParams<{ userId?: string; sessionId?: string }>();
  const { user, loading: authLoading } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherUserProfile, setOtherUserProfile] = useState<any>(null);
  
  const flatListRef = useRef<FlatList>(null);
  
  useEffect(() => {
    if (!user || authLoading || !userId) return;
    
    // Load conversation history
    const fetchMessages = async () => {
      try {
        const conversationHistory = await getConversation(userId);
        setMessages(conversationHistory);
        
        // Mark messages as read
        await markMessagesAsRead(userId);
        
        // TODO: Fetch other user's profile
        // ...
      } catch (error) {
        console.error('Failed to fetch conversation:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMessages();
    
    // Set up real-time listener for new messages
    const unsubscribe = listenToConversation(userId, (updatedMessages) => {
      setMessages(updatedMessages);
      
      // If there are new messages from the other user, mark them as read
      const newUnreadMessages = updatedMessages.some(
        msg => msg.senderId === userId && !msg.read
      );
      
      if (newUnreadMessages) {
        markMessagesAsRead(userId).catch(err => {
          console.error('Failed to mark messages as read:', err);
        });
      }
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, userId, authLoading]);
  
  const handleSend = async () => {
    if (!newMessage.trim() || !userId || !user) return;
    
    try {
      await sendMessage(userId, newMessage, sessionId);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };
  
  const renderMessage = ({ item }: { item: Message }) => {
    const isFromMe = item.senderId === user?.uid;
    
    return (
      <View style={[
        styles.messageContainer,
        isFromMe ? styles.myMessage : styles.theirMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isFromMe ? [styles.myBubble, { backgroundColor: currentColors.tint }] : styles.theirBubble
        ]}>
          <ThemedText 
            style={[styles.messageText, isFromMe && styles.myMessageText]} 
            lightColor={isFromMe ? "#FFFFFF" : undefined}
            darkColor={isFromMe ? "#000000" : undefined}
          >
            {item.content}
          </ThemedText>
          <ThemedText 
            style={[styles.messageTime, isFromMe && styles.myMessageTime]}
            lightColor={isFromMe ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.5)"}
            darkColor={isFromMe ? "rgba(0, 0, 0, 0.7)" : "rgba(255, 255, 255, 0.5)"}
          >
            {(item.timestamp instanceof Date ? item.timestamp : ('toDate' in item.timestamp ? item.timestamp.toDate() : new Date())).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </ThemedText>
        </View>
      </View>
    );
  };
  
  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom();
  }, [messages, scrollToBottom]);

  if (authLoading || (loading && !messages.length)) {
    return (
      <ThemedView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={currentColors.tint} />
        <ThemedText style={{ marginTop: 20 }}>Loading messages...</ThemedText>
      </ThemedView>
    );
  }
  
  if (!userId || !user) {
    router.replace('/messages');
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator size="small" color={currentColors.tint} style={styles.loadingMessages} />
            ) : (
              <ThemedText style={styles.emptyConversation}>
                No messages yet. Start the conversation!
              </ThemedText>
            )
          }
          inverted={false}
        />
        
        <View style={[styles.inputContainer, { borderTopColor: 'rgba(150, 150, 150, 0.2)' }]}>
          <TextInput
            style={[
              styles.input, 
              { 
                color: currentColors.text,
                backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#F0F0F0',
              }
            ]}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor={currentColors.icon}
            multiline
          />
          
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: currentColors.tint }]}
            onPress={handleSend}
            disabled={!newMessage.trim()}
          >
            <FontAwesome 
              name="send" 
              size={18} 
              color={colorScheme === 'dark' ? '#000000' : '#FFFFFF'} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  emptyConversation: {
    textAlign: 'center',
    marginTop: 40,
    opacity: 0.5,
  },
  loadingMessages: {
    marginTop: 20,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
  },
  theirMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 26,
  },
  myBubble: {
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 10,
    opacity: 0.7,
    position: 'absolute',
    bottom: 6,
    right: 12,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
});
