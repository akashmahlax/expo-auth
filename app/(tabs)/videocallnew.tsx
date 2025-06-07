import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

import SafeVideoCall from '@/components/SafeVideoCall';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebaseConfig';
import { useColorScheme } from '@/hooks/useColorScheme';
import { addCallToSession, updateSessionStatus } from '@/services/sessionService';
import { Session } from '@/types/user';
import { doc, getDoc } from 'firebase/firestore';

export default function EnhancedVideoCallScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [callInProgress, setCallInProgress] = useState(false);
  const [callId, setCallId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    
    const fetchSessionInfo = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }
      
      try {
        const sessionDoc = await getDoc(doc(db, 'sessions', sessionId));
        if (sessionDoc.exists()) {
          const sessionData = sessionDoc.data() as Session;
          setSession({
            ...sessionData,
            id: sessionDoc.id
          });
          
          // If session already has a call ID, use it
          if (sessionData.callId) {
            setCallId(sessionData.callId);
          }
        } else {
          Alert.alert('Error', 'Session not found');
        }
      } catch (error) {
        console.error('Error fetching session info:', error);
        Alert.alert('Error', 'Failed to load session information');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSessionInfo();
  }, [sessionId, user, authLoading]);
  
  const handleCallStart = async (newCallId: string) => {
    if (!session) return;
    
    setCallId(newCallId);
    setCallInProgress(true);
    
    // Update session with call ID
    if (sessionId) {
      try {
        await addCallToSession(sessionId, newCallId);
      } catch (error) {
        console.error('Failed to update session with call ID:', error);
      }
    }
  };
  
  const handleCallEnd = async () => {
    setCallInProgress(false);
    
    // If this was a session call, ask if the session is complete
    if (session) {
      Alert.alert(
        'End Session',
        'Is this counseling session complete?',
        [
          {
            text: 'No, Just End Call',
            style: 'cancel',
          },
          {
            text: 'Yes, Complete Session',
            onPress: async () => {
              try {
                await updateSessionStatus(session.id, 'completed');
                Alert.alert('Success', 'Session has been marked as completed');
                router.replace('/sessions');
              } catch (error) {
                console.error('Failed to update session status:', error);
                Alert.alert('Error', 'Failed to update session status');
              }
            },
          },
        ]
      );
    }
  };

  if (authLoading || (loading && sessionId)) {
    return (
      <ThemedView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={currentColors.tint} />
        <ThemedText style={{ marginTop: 20 }}>Loading video call...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={currentColors.text} />
        </TouchableOpacity>
        
        <ThemedText type="title" style={styles.title}>
          {session ? 'Counseling Session' : 'Video Call'}
        </ThemedText>
        
        {session && (
          <ThemedText style={styles.sessionTime}>
            {session.startTime instanceof Date
              ? session.startTime.toLocaleDateString()
              : 'toDate' in session.startTime
                ? session.startTime.toDate().toLocaleDateString()
                : 'Invalid Date'}
          </ThemedText>
        )}
      </View>
      
      <View style={styles.videoContainer}>
        <SafeVideoCall 
          initialCallId={callId} 
          onCallStarted={handleCallStart}
          onCallEnded={handleCallEnd}
          embedded={false}
        />
      </View>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
  },
  backButton: {
    padding: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sessionTime: {
    fontSize: 16,
    opacity: 0.7,
  },
  videoContainer: {
    flex: 1,
  },
});
