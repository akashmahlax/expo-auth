import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getUserSessions, updateSessionStatus } from '@/services/sessionService';
import { Session } from '@/types/user';

export default function SessionsScreen() {
  const { user, loading: authLoading } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const router = useRouter();
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    if (!user || authLoading) return;
    
    fetchSessions();
  }, [user, authLoading]);
  
  const fetchSessions = async () => {
    try {
      setLoading(true);
      const allSessions = await getUserSessions();
      setSessions(allSessions);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      Alert.alert('Error', 'Failed to load your sessions');
    } finally {
      setLoading(false);
    }
  };
  
  const handleStatusChange = async (sessionId: string, newStatus: 'scheduled' | 'completed' | 'cancelled') => {
    try {
      await updateSessionStatus(sessionId, newStatus);
      // Refresh session list
      fetchSessions();
      Alert.alert('Success', `Session ${newStatus} successfully`);
    } catch (error) {
      console.error('Failed to update session status:', error);
      Alert.alert('Error', 'Failed to update session status');
    }
  };

  const filterSessions = () => {
    const now = new Date();
    
    if (activeTab === 'upcoming') {
      return sessions.filter(session => 
        new Date(session.startTime) > now && 
        (session.status === 'scheduled' || session.status === 'in-progress')
      );
    } else {
      return sessions.filter(session => 
        new Date(session.endTime) < now || 
        session.status === 'completed' || 
        session.status === 'cancelled'
      );
    }
  };
  
  const renderSessionItem = ({ item }: { item: Session }) => {
    const startTime = new Date(item.startTime);
    const endTime = new Date(item.endTime);
    const isPast = new Date() > endTime || item.status === 'completed' || item.status === 'cancelled';
    
    let statusColor;
    switch (item.status) {
      case 'scheduled':
        statusColor = '#4CAF50'; // Green
        break;
      case 'in-progress':
        statusColor = '#2196F3'; // Blue
        break;
      case 'completed':
        statusColor = '#9E9E9E'; // Gray
        break;
      case 'cancelled':
        statusColor = '#F44336'; // Red
        break;
      default:
        statusColor = '#9E9E9E';
    }
    
    return (
      <View style={[styles.sessionCard, styles.card]}>
        <View style={styles.sessionHeader}>
          <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
          <ThemedText style={styles.sessionDate}>
            {startTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </ThemedText>
          <View style={styles.statusBadge}>
            <ThemedText style={[styles.statusText, { color: statusColor }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </ThemedText>
          </View>
        </View>
        
        <View style={styles.sessionTime}>
          <Ionicons name="time-outline" size={18} color={currentColors.icon} />
          <ThemedText style={styles.timeText}>
            {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
            {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </ThemedText>
        </View>
        
        <View style={styles.sessionActions}>
          {!isPast && item.status === 'scheduled' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                onPress={() => {
                  router.push({
                    pathname: '/videocall',
                    params: { sessionId: item.id }
                  });
                }}
              >
                <Ionicons name="videocam" size={18} color="#FFFFFF" />
                <ThemedText style={styles.actionButtonText} lightColor="#FFFFFF" darkColor="#FFFFFF">
                  Join
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#F44336' }]}
                onPress={() => {
                  Alert.alert(
                    'Cancel Session',
                    'Are you sure you want to cancel this session?',
                    [
                      { text: 'No', style: 'cancel' },
                      { 
                        text: 'Yes', 
                        onPress: () => handleStatusChange(item.id, 'cancelled'),
                        style: 'destructive'
                      }
                    ]
                  );
                }}
              >
                <MaterialIcons name="cancel" size={18} color="#FFFFFF" />
                <ThemedText style={styles.actionButtonText} lightColor="#FFFFFF" darkColor="#FFFFFF">
                  Cancel
                </ThemedText>
              </TouchableOpacity>
            </>
          )}
          
          {isPast && item.status === 'completed' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#9C27B0' }]}
              onPress={() => {
                // Navigate to feedback screen
              }}
            >
              <MaterialIcons name="rate-review" size={18} color="#FFFFFF" />
              <ThemedText style={styles.actionButtonText} lightColor="#FFFFFF" darkColor="#FFFFFF">
                Review
              </ThemedText>
            </TouchableOpacity>
          )}
          
          <Link href={{ pathname: '/(tabs)/chat', params: { sessionId: item.id } }} asChild>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
              <ThemedText style={styles.actionButtonText} lightColor="#FFFFFF" darkColor="#FFFFFF">
                Chat
              </ThemedText>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    );
  };

  if (authLoading || loading) {
    return (
      <ThemedView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={currentColors.tint} />
        <ThemedText style={{ marginTop: 20 }}>Loading your sessions...</ThemedText>
      </ThemedView>
    );
  }

  const filteredSessions = filterSessions();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>My Sessions</ThemedText>
      </View>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'upcoming' && [styles.activeTab, { borderColor: currentColors.tint }]
          ]}
          onPress={() => setActiveTab('upcoming')}
        >
          <ThemedText 
            style={[
              styles.tabText, 
              activeTab === 'upcoming' && { color: currentColors.tint, fontWeight: 'bold' }
            ]}
          >
            Upcoming
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'past' && [styles.activeTab, { borderColor: currentColors.tint }]
          ]}
          onPress={() => setActiveTab('past')}
        >
          <ThemedText 
            style={[
              styles.tabText, 
              activeTab === 'past' && { color: currentColors.tint, fontWeight: 'bold' }
            ]}
          >
            Past
          </ThemedText>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={filteredSessions}
        keyExtractor={item => item.id}
        renderItem={renderSessionItem}
        contentContainerStyle={styles.sessionsList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={currentColors.icon} />
            <ThemedText style={styles.emptyText}>
              No {activeTab} sessions found
            </ThemedText>
            {activeTab === 'upcoming' && (
              <Link href="/explore" asChild>
                <TouchableOpacity style={[styles.bookButton, { backgroundColor: currentColors.tint }]}>
                  <ThemedText style={styles.bookButtonText} lightColor="#FFFFFF" darkColor="#000000">
                    Book a Session
                  </ThemedText>
                </TouchableOpacity>
              </Link>
            )}
          </View>
        }
        refreshing={loading}
        onRefresh={fetchSessions}
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginRight: 16,
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 16,
  },
  sessionsList: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  sessionCard: {
    marginBottom: 16,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  sessionDate: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  sessionTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeText: {
    marginLeft: 8,
    fontSize: 14,
  },
  sessionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  actionButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  bookButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
