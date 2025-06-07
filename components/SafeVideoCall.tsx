import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// Create a component that safely loads WebRTC functionality
export default function SafeVideoCall({ embedded = false }) {
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const tintColor = currentColors.tint;
    // State for WebRTC loading and device compatibility
  const [isWebRTCLoaded, setIsWebRTCLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [deviceCompatibility, setDeviceCompatibility] = useState<'checking' | 'compatible' | 'incompatible'>('checking');
  
  // Function to check device compatibility
  const checkDeviceCompatibility = async () => {
    // Check if we're in a web browser
    if (Platform.OS === 'web') {
      const isWebRTCSupported = 
        typeof navigator !== 'undefined' && 
        !!navigator.mediaDevices && 
        !!navigator.mediaDevices.getUserMedia;
      
      return isWebRTCSupported ? 'compatible' : 'incompatible';
    }
    
    // For native platforms, we attempt to import the module
    try {
      await import('react-native-webrtc');
      return 'compatible';
    } catch (error) {
      return 'incompatible';
    }
  };
  
  // Dynamic imports for WebRTC to avoid crashing on load
  useEffect(() => {
    const loadWebRTC = async () => {
      try {
        // Check basic device compatibility first
        const compatibility = await checkDeviceCompatibility();
        setDeviceCompatibility(compatibility);
        
        if (compatibility === 'incompatible') {
          setLoadingError(
            embedded 
              ? "Video calls not supported on this device" 
              : "Failed to load WebRTC module. Please make sure you're running a development build with native modules installed."
          );
          return;
        }
        
        // Import NetInfo directly to avoid the warning
        try {
          // Safely attempt to use NetInfo without triggering warnings
          const NetInfo = require('@react-native-community/netinfo');
          // Just accessing this ensures the module is loaded
        } catch (error) {
          console.warn("NetInfo module issue detected, but proceeding without network monitoring");
          // We'll continue without NetInfo - it's not critical
        }
        
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
  }, [embedded]);
    // If WebRTC isn't loaded yet, show loading indicator
  if (!isWebRTCLoaded) {
    return (
      <ThemedView style={[styles.container, embedded && styles.embeddedContainer]}>
        <View style={styles.loadingContainer}>
          {loadingError ? (
            embedded ? (
              // Simplified error view for embedded mode
              <>
                <ThemedText style={styles.errorText}>Video calls unavailable</ThemedText>
                <ThemedText style={styles.helpText}>
                  Please open the Video Call tab to set up
                </ThemedText>
              </>
            ) : (
              // Full error view with instructions
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
            )
          ) : (
            <>
              <ActivityIndicator size="large" color={tintColor} />
              <ThemedText style={styles.loadingText}>
                {embedded ? 'Preparing video call...' : 'Loading WebRTC module...'}
              </ThemedText>
            </>
          )}
        </View>
      </ThemedView>
    );
  }
    try {
    // When WebRTC is loaded, import and render the actual VideoCall component
    const VideoCallImplementation = require('../components/VideoCallImplementation').default;
    return <VideoCallImplementation 
      embedded={embedded} 
      onError={(error) => {
        console.log("VideoCall error:", error.message);
        setLoadingError(error.message);
        setIsWebRTCLoaded(false);
      }}
      onCallStateChange={(state) => {
        console.log("Call state changed to:", state);
        // We could use this to show different UI states
      }}
    />;
  } catch (error) {
    console.error("Error rendering VideoCallImplementation:", error);
    // Fallback UI in case of render errors
    return (
      <ThemedView style={[styles.container, embedded && styles.embeddedContainer]}>
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.errorText}>
            Unable to load video call interface
          </ThemedText>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              console.log("Retrying video call load");
              setIsWebRTCLoaded(false);
              setTimeout(() => {
                const loadWebRTC = async () => {
                  try {
                    await import('react-native-webrtc');
                    setIsWebRTCLoaded(true);
                  } catch (err) {
                    setLoadingError("WebRTC failed to load");
                  }
                };
                loadWebRTC();
              }, 1000);
            }}
          >
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }
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
  retryButton: {
    marginTop: 15,
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
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
