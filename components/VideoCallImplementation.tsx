import { FontAwesome } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import {
  MediaStream,
  RTCPeerConnection,
  RTCView
} from 'react-native-webrtc';

// Import NetInfo safely using our mock
// Using our improved mock implementation with proper TypeScript types
import NetInfo from '@/utils/mock-netinfo';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { auth } from '@/firebaseConfig';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  createCall,
  getUserMedia,
  joinCall as joinCallHelper,
  switchCamera as switchCameraHelper,
  toggleAudio as toggleAudioHelper,
  toggleVideo as toggleVideoHelper
} from '@/utils/webrtc-helper';

interface VideoCallImplementationProps {
  embedded?: boolean;
  onError?: (error: Error) => void;
  onCallStateChange?: (state: 'creating' | 'joined' | 'ended' | 'error') => void;
}

export default function VideoCallImplementation({ 
  embedded = false,
  onError,
  onCallStateChange
}: VideoCallImplementationProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const tintColor = currentColors.tint;
  const textColor = currentColors.text;  
  
  // Button text colors for better visibility
  const buttonTextColorLight = '#FFFFFF'; // Always white for light theme (on blue button)
  const buttonTextColorDark = '#000000'; // Always black for dark theme (on white button)
  
  // WebRTC state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [callId, setCallId] = useState<string>('');
  const [isCaller, setIsCaller] = useState<boolean>(false);
  const [isCallStarted, setIsCallStarted] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(true);
  const [callStatus, setCallStatus] = useState<string>('');
  const [networkStatus, setNetworkStatus] = useState<boolean>(true);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [webRTCError, setWebRTCError] = useState<Error | null>(null);
  
  // Call history
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Animation values
  const controlsAnimation = useState(new Animated.Value(1))[0];
  const joinButtonAnimation = useState(new Animated.Value(1))[0];
    // Enhanced cleanup with better error handling and state management
  const cleanup = async () => {
    try {
      // First stop all tracks in the local stream directly
      if (localStream) {
        try {
          localStream.getTracks().forEach(track => {
            try { 
              track.stop();
            } catch (trackError) {
              console.warn('Error stopping track:', trackError);
            }
          });
        } catch (streamError) {
          console.warn('Error accessing stream tracks:', streamError);
        }
      }
      
      // Close peer connection directly
      if (peerConnection) {
        try {
          peerConnection.close();
        } catch (pcError) {
          console.warn('Error closing peer connection:', pcError);
        }
      }
      
      // Delete the call document if user is the caller
      if (callId && isCaller && auth.currentUser) {
        try {
          // Import Firestore directly to handle deletion
          const { doc, deleteDoc } = await import('firebase/firestore');
          const { db } = await import('@/firebaseConfig');
          await deleteDoc(doc(db, 'calls', callId));
        } catch (error) {
          console.error('Error deleting call document:', error);
        }
      }
      
      // Reset state - keep retryCount to avoid infinite retry loops
      setRemoteStream(null);
      setPeerConnection(null);
      setCallId('');
      setIsCallStarted(false);
      
      // Don't null out localStream immediately to avoid flicker if reusing it
      if (!embedded) {
        setLocalStream(null);
      }
      
      // Set appropriate status
      if (embedded) {
        setCallStatus('');
      } else {
        setCallStatus('Call ended');
      }
      
      // Notify parent component
      if (onCallStateChange) {
        onCallStateChange('ended');
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
      if (onError) onError(error instanceof Error ? error : new Error('Unknown error during cleanup'));
    }
  };

  // Set up local stream with retry capabilities
  const setupLocalStream = useCallback(async () => {
    try {
      console.log('Setting up local stream...');
      const stream = await getUserMedia();
      setLocalStream(stream);
      setWebRTCError(null); // Clear any previous errors
      if (onCallStateChange) {
        onCallStateChange('creating');
      }
    } catch (error: any) {
      console.error('Error accessing media devices:', error);
      setWebRTCError(error);
      
      // Send error to parent component if callback provided
      if (onError) {
        onError(error);
      }
      
      // Only show alert in non-embedded mode
      if (!embedded) {
        Alert.alert(
          'Camera/Microphone Error', 
          `Failed to access camera or microphone: ${error.message}. Please check your permissions.`,
          [{ text: 'OK' }]
        );
      }
      
      if (onCallStateChange) {
        onCallStateChange('error');
      }
    }
  }, [embedded, onError, onCallStateChange]);

  // Initial setup with automatic retry (up to 3 times)
  useEffect(() => {
    if (retryCount < 3) {
      setupLocalStream();
    }
    
    // Clean up when component unmounts
    return () => {
      cleanup();
    };
  }, [retryCount, setupLocalStream]);
  
  // Handle automatic retry
  useEffect(() => {
    if (webRTCError && retryCount < 3) {
      const timer = setTimeout(() => {
        console.log(`Retrying WebRTC setup (attempt ${retryCount + 1}/3)...`);
        setRetryCount(prev => prev + 1);
      }, 2000); // Wait 2 seconds between retries
      
      return () => clearTimeout(timer);
    }
  }, [webRTCError, retryCount]);
  // Create a new call with enhanced error handling
  const startCall = async () => {
    if (!localStream) {
      setCallStatus('Camera not available');
      const error = new Error('Local stream not available. Please check camera permissions.');
      if (onError) onError(error);
      return;
    }
    
    try {
      setCallStatus('Creating call...');
      setIsCaller(true);
      
      const { callId: newCallId, peerConnection: pc, cleanup: cleanupCall } = await createCall(localStream);
      
      if (!pc) {
        throw new Error('Failed to create peer connection');
      }
      
      setCallId(newCallId);
      setPeerConnection(pc);
      
      // Monitor for remote stream
      pc.ontrack = (event: any) => { // Type assertion needed for RTCPeerConnection.ontrack
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };
      
      // Set call status based on embedded mode
      if (embedded) {
        setCallStatus('Call ready - Share ID');
      } else {
        setCallStatus(`Call created! ID: ${newCallId}`);
      }
      
      setIsCallStarted(true);
      
      // Notify parent component
      if (onCallStateChange) {
        onCallStateChange('joined');
      }
    } catch (error: any) {
      console.error('Error creating call:', error);
      setCallStatus('Error creating call');
      
      // Show user-friendly error in embedded mode
      if (embedded) {
        setCallStatus('Video call error - Try again');
      } else {
        setCallStatus(`Error: ${error.message}`);
      }
      
      if (onError) onError(error);
      if (onCallStateChange) onCallStateChange('error');
      await cleanup();
    }
  };
  // Join an existing call with enhanced error handling
  const joinCall = async () => {
    if (!localStream || !callId) {
      const errorMessage = !localStream 
        ? 'Camera not available' 
        : 'Please enter a valid Call ID';
      
      setCallStatus(errorMessage);
      
      if (!localStream && onError) {
        onError(new Error('Local stream not available. Please check camera permissions.'));
      }
      return;
    }
    
    try {
      setIsJoining(true);
      setCallStatus('Joining call...');
      
      const { peerConnection: pc, cleanup: cleanupCall } = await joinCallHelper(callId, localStream);
      
      if (!pc) {
        throw new Error('Failed to create peer connection');
      }
      
      setPeerConnection(pc);
      
      // Monitor for remote stream
      pc.ontrack = (event: any) => { // Type assertion needed for RTCPeerConnection.ontrack
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };
      
      // Set success status
      setCallStatus(embedded ? 'Connected' : 'Connected!');
      setIsCallStarted(true);
      setIsCaller(false);
      
      // Notify parent component
      if (onCallStateChange) {
        onCallStateChange('joined');
      }
    } catch (error: any) {
      console.error('Error joining call:', error);
      
      // Show user-friendly error in embedded mode
      if (embedded) {
        setCallStatus('Failed to join call');
      } else {
        setCallStatus(`Error joining call: ${error.message}`);
      }
      
      if (onError) onError(error);
      if (onCallStateChange) onCallStateChange('error');
    } finally {
      setIsJoining(false);
    }
  };
  // End the current call with improved UX
  const endCall = () => {
    // In embedded mode, end call directly without confirmation
    if (embedded) {
      (async () => {
        await cleanup();
        setCallStatus('Call ended');
        if (onCallStateChange) {
          onCallStateChange('ended');
        }
      })();
      return;
    }
    
    // In full mode, show confirmation dialog
    Alert.alert('End Call', 'Are you sure you want to end the call?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End Call', style: 'destructive', onPress: async () => {
        await cleanup();
        setCallStatus('Call ended');
        if (onCallStateChange) {
          onCallStateChange('ended');
        }
      }}
    ]);
  };
  
  // Toggle mute
  const toggleMute = async () => {
    if (localStream) {
      try {
        await toggleAudioHelper(localStream);
        setIsMuted(!isMuted);
      } catch (error) {
        console.error('Error toggling audio:', error);
      }
    }
  };
  
  // Toggle camera
  const toggleCamera = async () => {
    if (localStream) {
      try {
        await toggleVideoHelper(localStream);
        setIsVideoEnabled(!isVideoEnabled);
      } catch (error) {
        console.error('Error toggling video:', error);
      }
    }
  };
  
  // Switch between front and back cameras
  const switchCamera = async () => {
    if (localStream) {
      try {
        await switchCameraHelper(localStream);
      } catch (error) {
        console.error('Error switching camera:', error);
      }
    }
  };
  // Monitor network status
  useEffect(() => {
    // Check if NetInfo is available and has the addEventListener method
    if (typeof NetInfo?.addEventListener === 'function') {
      // Create a type-safe network state handler
      const handleNetworkChange = (state: any) => {
        const isConnected = state.isConnected ?? true;
        setNetworkStatus(isConnected);
        
        if (!isConnected && isCallStarted) {
          setCallStatus('Network connection lost');
        } else if (isConnected && isCallStarted && callStatus === 'Network connection lost') {
          setCallStatus('Network connection restored');
          setTimeout(() => setCallStatus(''), 2000);
        }
      };
      
      // Subscribe to network changes safely
      const unsubscribe = NetInfo.addEventListener(handleNetworkChange);
      
      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    }
    
    // If NetInfo is not available, we don't monitor the network
    console.log('Network monitoring unavailable - NetInfo not properly configured');
    return () => {};
  }, [isCallStarted, callStatus]);

  // Monitor call quality
  const [callQuality, setCallQuality] = useState<'good' | 'medium' | 'poor'>('good');

  // Animated call controls that fade out when not in use
  useEffect(() => {
    if (isCallStarted) {
      // Auto hide controls after 5 seconds of inactivity
      const timer = setTimeout(() => {
        Animated.timing(controlsAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }).start();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isCallStarted, controlsAnimation]);

  // Show controls when screen is tapped
  const showControls = () => {
    if (isCallStarted) {
      Animated.timing(controlsAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Auto hide again after 5 seconds
      setTimeout(() => {
        Animated.timing(controlsAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }).start();
      }, 5000);
    }
  };

  // Animation for buttons
  const animateButton = (value: Animated.Value) => {
    Animated.sequence([
      Animated.timing(value, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  // Helper function to render the video toggle icon
  const renderVideoToggleIcon = () => {
    if (isVideoEnabled) {
      return <FontAwesome name="video-camera" size={24} color="#fff" />;
    } else {
      return <FontAwesome name="eye-slash" size={24} color="#fff" />;
    }
  };
  // The main video call UI
  return (
    <TouchableOpacity 
      activeOpacity={1}
      onPress={showControls}
      style={[styles.container, embedded && styles.embeddedContainer]}
    >
      {/* Remote Stream (Full screen) */}
      {isCallStarted && remoteStream ? (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.remoteStream}
          objectFit="cover"
        />
      ) : (
        // Placeholder when no remote stream
        <View style={[styles.noStream, { backgroundColor: colorScheme === 'dark' ? '#222' : '#eee' }]}>
          {isCallStarted ? (
            <>
              <ThemedText style={styles.waitingText}>Waiting for other participant...</ThemedText>
              <ActivityIndicator size="large" color={tintColor} style={styles.waitingIndicator} />
              <View style={styles.waitingContainer}>
                <ThemedText style={styles.callIdInfo}>Share this Call ID:</ThemedText>
                <ThemedText selectable style={styles.callIdValue}>{callId}</ThemedText>
              </View>
            </>
          ) : (
            <ThemedText style={styles.setupText}>Video Call</ThemedText>
          )}
        </View>
      )}
      
      {/* Local Stream (Picture-in-Picture) */}
      {localStream && (
        <View style={styles.localStreamContainer}>
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.localStream}
            objectFit="cover"
            zOrder={1}
            mirror={true}
          />
        </View>
      )}
      
      {/* Call Status */}
      {callStatus && (
        <View style={styles.statusContainer}>
          <ThemedText style={styles.statusText}>{callStatus}</ThemedText>
        </View>
      )}
      
      {/* Network Status Indicator */}
      {!networkStatus && (
        <View style={[
          styles.networkIndicator,
          { backgroundColor: '#d32f2f' }
        ]}>
          <FontAwesome
            name={networkStatus ? 'wifi' : 'exclamation-triangle'} 
            size={14} 
            color="#FFFFFF" 
          />
        </View>
      )}
      
      {/* Call Quality Indicator */}
      {isCallStarted && remoteStream && (
        <View style={styles.callQualityContainer}>
          <View style={[
            styles.qualityIndicator,
            { 
              backgroundColor: 
                callQuality === 'good' ? '#4CAF50' : 
                callQuality === 'medium' ? '#FFC107' : '#F44336' 
            }
          ]} />          <ThemedText style={styles.qualityText}>
            {(callQuality === 'good' ? 'Good' : 
             callQuality === 'medium' ? 'Fair' : 'Poor') + ' Connection'}
          </ThemedText>
        </View>
      )}

      {/* Controls for ongoing call */}
      {isCallStarted && (
        <Animated.View 
          style={[
            styles.callControls,
            { opacity: controlsAnimation }
          ]}
        >
          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: isMuted ? '#d32f2f' : 'rgba(0,0,0,0.6)' }]}
            onPress={toggleMute}
          >
            <FontAwesome 
              name={isMuted ? 'microphone-slash' : 'microphone'} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
            onPress={switchCamera}
          >
            <FontAwesome name="refresh" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: '#d32f2f' }]}
            onPress={endCall}
          >
            <FontAwesome name="phone" size={24} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: isVideoEnabled ? 'rgba(0,0,0,0.6)' : '#d32f2f' }]}
            onPress={toggleCamera}
          >
            {renderVideoToggleIcon()}
          </TouchableOpacity>
        </Animated.View>
      )}      {/* Controls for starting/joining call */}
      {!isCallStarted && (
        <View style={[styles.setupControls, embedded && styles.setupControlsEmbedded]}>
          {embedded ? (
            // Enhanced UI for embedded mode with better error handling
            <View style={styles.startCallButtonContainer}>
              {webRTCError ? (
                // Show retry button in embedded mode when there's an error
                <TouchableOpacity 
                  style={[styles.retryButton, { backgroundColor: tintColor }]}
                  onPress={() => {
                    setWebRTCError(null);
                    setRetryCount(0); // Reset retry count to trigger a new attempt
                  }}
                >
                  <FontAwesome name="refresh" size={18} color="#fff" style={styles.retryIcon} />
                  <ThemedText style={styles.buttonText} lightColor={buttonTextColorLight} darkColor={buttonTextColorDark}>
                    Retry Video Setup
                  </ThemedText>
                </TouchableOpacity>
              ) : (
                // Normal start call button when no errors
                <TouchableOpacity 
                  style={[styles.startCallButton, { backgroundColor: tintColor }]}
                  onPress={() => {
                    setIsCaller(true);
                    startCall();
                  }}
                >
                  <FontAwesome name="video-camera" size={18} color="#fff" style={{marginRight: 8}} />
                  <ThemedText style={styles.buttonText} lightColor={buttonTextColorLight} darkColor={buttonTextColorDark}>
                    Start Video Call
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            // Full UI for dedicated screen
            <>
              {!isCaller ? (
                <>
                  <ThemedText style={styles.callIdLabel}>Enter Call ID:</ThemedText>
                  <View style={styles.callIdInputContainer}>
                    <TextInput
                      style={[
                        styles.callIdInput, 
                        { 
                          borderColor: tintColor,
                          color: textColor,
                          backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF'
                        }
                      ]}
                      placeholder="Enter Call ID"
                      placeholderTextColor={currentColors.icon}
                      onChangeText={setCallId}
                      value={callId}
                      autoCapitalize="none"
                    />
                    
                    <Animated.View style={{ transform: [{ scale: joinButtonAnimation }] }}>
                      <TouchableOpacity
                        style={[styles.joinButton, { backgroundColor: tintColor }]}
                        onPress={() => {
                          animateButton(joinButtonAnimation);
                          joinCall();
                        }}
                        disabled={isJoining || !callId}
                      >
                        {isJoining ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <ThemedText style={styles.buttonText} lightColor={buttonTextColorLight} darkColor={buttonTextColorDark}>
                            Join
                          </ThemedText>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                  
                  <ThemedText style={styles.orText}>- OR -</ThemedText>
                </>
              ) : (
                <View style={styles.callInfoContainer}>
                  <ThemedText style={styles.callIdInfo}>Share this Call ID:</ThemedText>
                  <ThemedText selectable style={styles.callIdValue}>{callId}</ThemedText>
                </View>
              )}
              
              <View style={styles.startCallButtonContainer}>
                {!isCaller && (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity 
                      style={[styles.startCallButton, { backgroundColor: tintColor }]}
                      onPress={() => {
                        setIsCaller(true);
                        startCall();
                      }}
                    >
                      <ThemedText style={styles.buttonText} lightColor={buttonTextColorLight} darkColor={buttonTextColorDark}>
                        Create New Call
                      </ThemedText>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.historyButton}
                      onPress={() => setShowHistory(!showHistory)}
                    >
                      <FontAwesome name="history" size={20} color={tintColor} />
                    </TouchableOpacity>
                  </View>
                )}
                
                {showHistory && (
                  <View style={styles.historyContainer}>
                    {loadingHistory ? (
                      <ActivityIndicator size="small" color={tintColor} />
                    ) : callHistory.length === 0 ? (
                      <ThemedText style={styles.noHistoryText}>No recent calls</ThemedText>
                    ) : (
                      <>
                        <ThemedText style={styles.historyTitle}>Recent Calls</ThemedText>
                        {callHistory.map((call, index) => (
                          <TouchableOpacity
                            key={call.id || index}
                            style={styles.historyItem}
                            onPress={() => {
                              setCallId(call.id);
                              setShowHistory(false);
                            }}
                          >
                            <ThemedText style={styles.historyItemText}>
                              Call {index + 1}: {new Date(call.createdAt.seconds * 1000).toLocaleString()}
                            </ThemedText>
                          </TouchableOpacity>
                        ))}
                      </>
                    )}
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  embeddedContainer: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 0,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)', // subtle border for embedded mode
  },
  remoteStream: {
    flex: 1,
    backgroundColor: 'black',
  },
  localStreamContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    height: 150,
    width: 100,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'white',
  },
  localStream: {
    height: '100%',
    width: '100%',
    backgroundColor: 'black',
  },
  retryButton: {
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  retryIcon: {
    marginRight: 8,
  },
  callControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 20,
  },
  controlButton: {
    height: 60,
    width: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },  setupControls: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 20,
  },
  setupControlsEmbedded: {
    bottom: 20,
    padding: 10,
  },
  callIdLabel: {
    marginBottom: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  callIdInputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  callIdInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 10,
    paddingHorizontal: 15,
  },
  joinButton: {
    height: 50,
    width: 80,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  orText: {
    textAlign: 'center',
    marginVertical: 10,
  },
  startCallButton: {
    height: 50,
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  historyButton: {
    height: 50,
    width: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  startCallButtonContainer: {
    marginVertical: 10,
  },
  statusContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  statusText: {
    fontSize: 16,
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  noStream: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  setupText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  waitingIndicator: {
    marginBottom: 20,
  },
  waitingContainer: {
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  callIdInfo: {
    fontSize: 16,
    marginBottom: 10,
  },
  callIdValue: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 5,
    overflow: 'hidden',
    width: '100%',
    textAlign: 'center',
  },
  callInfoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  historyContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    maxHeight: 200,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  historyItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  historyItemText: {
    fontSize: 14,
  },
  noHistoryText: {
    textAlign: 'center',
    padding: 10,
  },
  networkIndicator: {
    position: 'absolute',
    top: 50,
    left: 20,
    padding: 5,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  callQualityContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  qualityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  qualityText: {
    fontSize: 12,
    color: 'white',
  },
});
