import { FontAwesome } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// Create a component that safely loads WebRTC functionality
export default function SafeVideoCall({ embedded = false }) {
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const tintColor = currentColors.tint;
  
  // State for WebRTC loading
  const [isWebRTCLoaded, setIsWebRTCLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  
  // Dynamic imports for WebRTC to avoid crashing on load
  useEffect(() => {
    const loadWebRTC = async () => {
      try {
        // Try to dynamically import WebRTC
        const WebRTC = await import('react-native-webrtc');
        
        // If we get here, WebRTC loaded successfully
        setIsWebRTCLoaded(true);
        console.log("WebRTC module loaded successfully!");
      } catch (error) {
        console.error("Failed to load WebRTC module:", error);
        setLoadingError("Failed to load WebRTC module. Please make sure you're running a development build with native modules installed.");
      }
    };
    
    loadWebRTC();
  }, []);
  
  // If WebRTC isn't loaded yet, show loading indicator
  if (!isWebRTCLoaded) {
    return (
      <ThemedView style={[styles.container, embedded && styles.embeddedContainer]}>
        <View style={styles.loadingContainer}>
          {loadingError ? (
            <>
              <ThemedText style={styles.errorText}>{loadingError}</ThemedText>
              <ThemedText style={styles.helpText}>
                Make sure you've installed the necessary native modules:
              </ThemedText>
              <View style={styles.codeBlock}>
                <ThemedText style={styles.codeText}>
                  npx expo install react-native-webrtc{'\n'}
                  npx expo prebuild{'\n'}
                  npx expo run:android{' '}
                  <ThemedText style={styles.codeComment}>
                    {/* or run:ios */}
                  </ThemedText>
                </ThemedText>
              </View>
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color={tintColor} />
              <ThemedText style={styles.loadingText}>
                Loading WebRTC module...
              </ThemedText>
            </>
          )}
        </View>
      </ThemedView>
    );
  }
  
  // When WebRTC is loaded, import and render the actual VideoCall component
  const VideoCallImplementation = require('../components/VideoCallImplementation').default;
  return <VideoCallImplementation />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  embeddedContainer: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 20,
  },
  helpText: {
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  codeBlock: {
    backgroundColor: '#1e1e1e',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    marginVertical: 10,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#ffffff',
  },
  codeComment: {
    color: '#6a9955',
  },
});
