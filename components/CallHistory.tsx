import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

/**
 * Component to display call history and allow users to rejoin previous calls
 */
interface CallHistoryProps {
  calls: any[];
  onSelectCall: (callId: string) => void;
}

export default function CallHistory({ calls = [], onSelectCall }: CallHistoryProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const tintColor = currentColors.tint;

  // No calls to display
  if (calls.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>No recent calls</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>Recent Calls</ThemedText>
      <ScrollView style={styles.scrollContainer}>
        {calls.map((call, index) => {
          // Format timestamp
          const callDate = call.createdAt ? new Date(call.createdAt.toDate()) : new Date();
          const formattedDate = callDate.toLocaleString();
          
          return (
            <TouchableOpacity
              key={call.id}
              style={[
                styles.callItem,
                { borderColor: tintColor }
              ]}
              onPress={() => onSelectCall(call.id)}
            >
              <View style={styles.callInfo}>
                <ThemedText style={styles.callId}>Call ID: {call.id}</ThemedText>
                <ThemedText style={styles.callTime}>{formattedDate}</ThemedText>
                <ThemedText style={styles.callStatus}>
                  {call.answeredBy ? 'Completed' : 'Not Answered'}
                </ThemedText>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  scrollContainer: {
    maxHeight: 200,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  callItem: {
    padding: 15,
    borderWidth: 1,
    borderRadius: 10,
    marginVertical: 5,
    marginHorizontal: 10,
  },
  callInfo: {
    flexDirection: 'column',
  },
  callId: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  callTime: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 5,
  },
  callStatus: {
    fontSize: 14,
  },
});
