import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getAllConversations } from '@/services/messageService';

interface Conversation {
  userId: string;
  lastMessage: string;
  lastMessageTimestamp: Date | string;
  unreadCount: number;
  profile: any; // User profile
}

export default function MessagesScreen() {
  const { user, loading: authLoading } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || authLoading) return;
    
    fetchConversations();
  }, [user, authLoading]);
  
  const fetchConversations = async () => {
    try {
      setLoading(true);
      const allConversations = await getAllConversations();
      setConversations(allConversations);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const formatTimestamp = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    
    // If today, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If within the last week, show day name
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    if (date > oneWeekAgo) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    
    // Otherwise show date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  
  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity 
      style={styles.conversationItem}
      onPress={() => {
        router.push({
          pathname: '/chat/conversation',
          params: { userId: item.userId }
        });
      }}
    >
      <View style={styles.avatarContainer}>
        {item.profile?.photoURL ? (
          <Image source={{ uri: item.profile.photoURL }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: currentColors.tint }]}>
            <ThemedText style={styles.avatarInitial} lightColor="#FFFFFF" darkColor="#000000">
              {item.profile?.displayName?.charAt(0)?.toUpperCase() || '?'}
            </ThemedText>
          </View>
        )}
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <ThemedText style={styles.unreadCount} lightColor="#FFFFFF" darkColor="#FFFFFF">
              {item.unreadCount > 9 ? '9+' : item.unreadCount}
            </ThemedText>
          </View>
        )}
      </View>
      
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <ThemedText style={styles.userName}>
            {item.profile?.displayName || 'Unknown User'}
          </ThemedText>
          <ThemedText style={styles.messageTime}>
            {formatTimestamp(item.lastMessageTimestamp)}
          </ThemedText>
        </View>
        
        <ThemedText 
          style={[styles.lastMessage, item.unreadCount > 0 && styles.unreadMessage]} 
          numberOfLines={1}
        >
          {item.lastMessage}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );

  if (authLoading || loading) {
    return (
      <ThemedView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={currentColors.tint} />
        <ThemedText style={{ marginTop: 20 }}>Loading your messages...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Messages</ThemedText>
      </View>
      
      <FlatList
        data={conversations}
        keyExtractor={item => item.userId}
        renderItem={renderConversationItem}
        contentContainerStyle={styles.conversationsList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-ellipses-outline" size={64} color={currentColors.icon} />
            <ThemedText style={styles.emptyText}>
              No conversations yet
            </ThemedText>
          </View>
        }
        refreshing={loading}
        onRefresh={fetchConversations}
      />
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
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  conversationsList: {
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  unreadBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: '#FF3B30',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  messageTime: {
    fontSize: 12,
    opacity: 0.6,
  },
  lastMessage: {
    fontSize: 14,
    opacity: 0.8,
  },
  unreadMessage: {
    fontWeight: '600',
    opacity: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    flex: 1,
    marginTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
});
