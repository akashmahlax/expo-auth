import { FontAwesome } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Platform,
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

import CallHistory from '@/components/CallHistory';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { auth } from '@/firebaseConfig';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  createCall,
  getCallHistory,
  getUserMedia,
  joinCall as joinCallHelper,
  switchCamera as switchCameraHelper,
  toggleAudio as toggleAudioHelper,
  toggleVideo as toggleVideoHelper
} from '@/utils/webrtc-helper';

export default function VideoCallScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const tintColor = currentColors.tint;
  const textColor = currentColors.text;  // WebRTC state
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
    // Call history
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Animation values
  const controlsAnimation = useState(new Animated.Value(1))[0];
  const joinButtonAnimation = useState(new Animated.Value(1))[0];  // Clean up resources when component unmounts or call ends
  const cleanup = async () => {
    try {
      // First stop all tracks in the local stream directly
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      // Close peer connection directly
      if (peerConnection) {
        peerConnection.close();
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
      
      // Reset state
      setLocalStream(null);
      setRemoteStream(null);
      setPeerConnection(null);
      setCallId('');
      setIsCallStarted(false);
      setCallStatus('');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };

  // Handle back button press to properly clean up resources
  useEffect(() => {
    const backAction = () => {
      if (isCallStarted) {
        Alert.alert('End Call', 'Are you sure you want to end the call?', [
          { text: 'Cancel', style: 'cancel', onPress: () => {} },
          { text: 'End Call', style: 'destructive', onPress: () => {
            cleanup().then(() => {
              if (Platform.OS === 'android') {
                // For Android we need to handle the back action manually
                BackHandler.exitApp();
              }
            });
          }}
        ]);
        return true; // Prevent default back action
      }
      return false; // Let default back action happen
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => {
      backHandler.remove();
      cleanup();
    };
  }, [isCallStarted]);
  // Set up local stream
  useEffect(() => {
    const setupLocalStream = async () => {
      try {
        const stream = await getUserMedia();
        setLocalStream(stream);
      } catch (error) {
        console.error('Error accessing media devices:', error);
        Alert.alert(
          'Permission Error', 
          'Failed to access camera or microphone. Please check your permissions.',
          [{ text: 'OK' }]
        );
      }
    };

    setupLocalStream();
  }, []);

  // Fetch call history when component mounts
  useEffect(() => {
    const fetchCallHistory = async () => {
      if (!auth.currentUser) return;
      
      try {
        setLoadingHistory(true);
        const history = await getCallHistory(10);
        setCallHistory(history);
      } catch (error) {
        console.error('Error fetching call history:', error);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchCallHistory();
  }, []);  // Custom hook to periodically refresh call history
  useEffect(() => {    let intervalId: ReturnType<typeof setInterval>;
    
    // Only refresh history if we're showing it and not in a call
    if (showHistory && !isCallStarted && auth.currentUser) {
      // Initial load
      const loadHistory = async () => {
        setLoadingHistory(true);
        try {
          const history = await getCallHistory(10);
          setCallHistory(history);
        } catch (error) {
          console.error('Error loading call history:', error);
        } finally {
          setLoadingHistory(false);
        }
      };
      
      loadHistory();
      
      // Set up interval to refresh every 10 seconds
      intervalId = setInterval(async () => {
        try {
          const history = await getCallHistory(10);
          setCallHistory(history);
        } catch (error) {
          console.error('Error refreshing call history:', error);
        }
      }, 10000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [showHistory, isCallStarted]);  // Create a new call
  const startCall = async (retryCount = 0) => {
    if (!localStream) return;

    try {
      setCallStatus('Creating call...');
      setIsCaller(true);
      
      // Use the helper function to create a call
      const { callId: newCallId, peerConnection: pc } = await createCall(localStream);
      
      // Update state
      setPeerConnection(pc);
      setCallId(newCallId);
      setIsCallStarted(true);
      setCallStatus('Call created! Waiting for someone to join...');
      
      // Add event handler for remote stream using a compatible method
      // Use a simple polling approach to check for remote stream
      const streamCheckInterval = setInterval(() => {
        const remoteStr = getRemoteStreamSafely(pc);
        if (remoteStr) {
          setRemoteStream(remoteStr);
          setCallStatus('Call connected!');
          
          // Hide status after a moment
          setTimeout(() => setCallStatus(''), 2000);
          
          // Clear the interval once we have the stream
          clearInterval(streamCheckInterval);
        }
      }, 1000);
      
      // Set a timeout to clear the interval if no stream is received
      setTimeout(() => {
        clearInterval(streamCheckInterval);
        
        // After a reasonable timeout, refresh the call history to see our new call
        if (isCallStarted && isCaller) {
          const fetchCallHistory = async () => {
            try {
              const history = await getCallHistory(10);
              setCallHistory(history);
            } catch (error) {
              console.error('Error refreshing call history:', error);
            }
          };
          
          fetchCallHistory();
        }
      }, 10000);
      
    } catch (error) {
      console.error('Error starting call:', error);
      setCallStatus('Failed to start call');
      setIsCaller(false);
      
      // Offer retry option if error occurs
      if (retryCount < 2) {
        Alert.alert(
          'Connection Error', 
          'Failed to create the call. Would you like to retry?', 
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Retry', 
              onPress: () => {
                setTimeout(() => startCall(retryCount + 1), 1000);
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to start call after multiple attempts. Please try again later.');
      }
    }
  };// Join an existing call
  const joinCall = async (retryCount = 0) => {
    if (!localStream || !callId || !auth.currentUser) {
      Alert.alert('Error', 'Please enter a valid call ID');
      return;
    }

    try {
      setIsJoining(true);
      setCallStatus('Joining call...');
      
      // Use the helper function to join the call
      const { peerConnection: pc } = await joinCallHelper(callId, localStream);
      
      // Update state with the peer connection
      setPeerConnection(pc);
        // Add event handler for remote stream using a compatible method
      // Use a simple polling approach to check for remote stream
      const streamCheckInterval = setInterval(() => {
        const remoteStr = getRemoteStreamSafely(pc);
        if (remoteStr) {
          setRemoteStream(remoteStr);
          setCallStatus('Call connected!');
          
          // Hide status after a moment
          setTimeout(() => setCallStatus(''), 2000);
          
          // Clear the interval once we have the stream
          clearInterval(streamCheckInterval);
        }
      }, 1000);
      
      // Set a timeout to clear the interval if no stream is received
      setTimeout(() => {
        clearInterval(streamCheckInterval);
        
        // If we still don't have a remote stream after the timeout, show an error
        if (!remoteStream && isCallStarted) {
          setCallStatus('Connection timeout. No remote stream detected.');
          
          // Offer retry option if we haven't exceeded max retries
          if (retryCount < 2) {
            Alert.alert(
              'Connection Issue', 
              'Failed to establish connection with the other participant.', 
              [
                { text: 'End Call', style: 'cancel', onPress: cleanup },
                { 
                  text: 'Retry', 
                  onPress: () => {
                    cleanup();
                    setTimeout(() => joinCall(retryCount + 1), 1000);
                  }
                }
              ]
            );
          } else {
            Alert.alert(
              'Connection Failed', 
              'Could not establish a connection after multiple attempts.', 
              [{ text: 'End Call', onPress: cleanup }]
            );
          }
        }
      }, 30000);
      
      setIsCallStarted(true);
      setCallStatus('Joining call...');
      setIsJoining(false);
      
    } catch (error) {
      console.error('Error joining call:', error);
      setIsJoining(false);
      setCallStatus('Failed to join call');
      
      // Offer retry option if error occurs
      if (retryCount < 2) {
        Alert.alert(
          'Connection Error', 
          'Failed to join the call. Would you like to retry?', 
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Retry', 
              onPress: () => {
                setTimeout(() => joinCall(retryCount + 1), 1000);
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to join call after multiple attempts. Please check the ID and try again.');
      }
    }
  };
    // Handle selecting a call from history
  const handleSelectCall = (selectedCallId: string) => {
    setCallId(selectedCallId);
    setShowHistory(false);
    joinCall();
  };
  // Toggle mute
  const toggleMute = () => {
    if (localStream) {
      const newMuteState = toggleAudioHelper(localStream);
      setIsMuted(newMuteState);
    }
  };
  // Toggle camera
  const toggleCamera = () => {
    if (localStream) {
      const newVideoState = toggleVideoHelper(localStream);
      setIsVideoEnabled(newVideoState);
    }
  };
  // Switch camera between front and back
  const switchCamera = () => {
    if (localStream) {
      switchCameraHelper(localStream);
    }
  };

  // End call
  const endCall = async () => {
    Alert.alert('End Call', 'Are you sure you want to end the call?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End Call', style: 'destructive', onPress: async () => {
        await cleanup();
        setCallStatus('Call ended');
      }}
    ]);
  };

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

  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const isConnected = state.isConnected ?? true;
      setNetworkStatus(isConnected);
      
      if (!isConnected && isCallStarted) {
        setCallStatus('Network connection lost');
      } else if (isConnected && isCallStarted && callStatus === 'Network connection lost') {
        setCallStatus('Network connection restored');
        setTimeout(() => setCallStatus(''), 2000);
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [isCallStarted, callStatus]);  // Monitor call quality
  const [callQuality, setCallQuality] = useState<'good' | 'medium' | 'poor'>('good');
  
  // Function to monitor connection quality
  useEffect(() => {
    if (!peerConnection || !isCallStarted) return;
    
    const qualityCheckInterval = setInterval(() => {
      // Using any type to bypass TypeScript constraints
      const pc = peerConnection as any;
      
      try {
        // Check for connection stats if the method exists
        if (typeof pc.getStats === 'function') {
          pc.getStats().then((stats: any) => {
            let packetLoss = 0;
            let roundTripTime = 0;
            let hasData = false;
            
            // Different WebRTC implementations may have different stats formats
            if (stats.forEach) {
              stats.forEach((stat: any) => {
                if (stat.type === 'inbound-rtp' && stat.packetsLost) {
                  packetLoss = stat.packetsLost;
                  hasData = true;
                }
                
                if (stat.type === 'candidate-pair' && stat.currentRoundTripTime) {
                  roundTripTime = stat.currentRoundTripTime * 1000; // Convert to ms
                  hasData = true;
                }
              });
            }
            
            if (hasData) {
              // Determine quality based on packet loss and round trip time
              if (packetLoss > 5 || roundTripTime > 300) {
                setCallQuality('poor');
              } else if (packetLoss > 2 || roundTripTime > 150) {
                setCallQuality('medium');
              } else {
                setCallQuality('good');
              }
            }
          });
        }
      } catch (error) {
        console.error('Error checking call quality:', error);
      }
    }, 5000);
    
    return () => {
      clearInterval(qualityCheckInterval);
    };
  }, [peerConnection, isCallStarted]);  // Helper function to safely get remote streams
  const getRemoteStreamSafely = (pc: RTCPeerConnection | null): MediaStream | null => {
    if (!pc) return null;
    
    // Try different methods to get remote stream based on implementation
    try {
      // Try to access _remoteStreams using type casting to bypass TypeScript
      const anyPC = pc as any;
      
      // Check if _remoteStreams is available
      if (anyPC._remoteStreams) {
        // Handle if it's a Map 
        if (anyPC._remoteStreams instanceof Map) {
          const values = Array.from(anyPC._remoteStreams.values());          if (values.length > 0) {
            return values[0] as MediaStream;
          }
        } 
        // Handle if it's an array
        else if (Array.isArray(anyPC._remoteStreams) && anyPC._remoteStreams.length > 0) {
          return anyPC._remoteStreams[0];
        }
      }
      
      // Handle remoteStreams property (common in React Native WebRTC)
      if (anyPC.remoteStreams && anyPC.remoteStreams.length > 0) {
        return anyPC.remoteStreams[0];
      }
      
      // Try to create a stream from receivers if available
      if (typeof pc.getReceivers === 'function') {
        const receivers = pc.getReceivers();
        if (receivers && receivers.length > 0) {
          // Find non-null tracks
          const validTracks: any[] = [];
          receivers.forEach(receiver => {
            if (receiver.track) {
              validTracks.push(receiver.track);
            }
          });
          
          if (validTracks.length > 0) {
            // Create new stream with these tracks
            const newStream = new MediaStream();
            validTracks.forEach(track => {
              try {
                newStream.addTrack(track);
              } catch (e) {
                console.error('Error adding track to stream:', e);
              }
            });
            return newStream;
          }
        }
      }
    } catch (e) {
      console.error('Error getting remote stream:', e);
    }
    
    return null;
  };

  // Monitor peer connection state for unexpected disconnections
  useEffect(() => {
    if (!peerConnection || !isCallStarted) return;
    
    // Use a polling approach since the event-based approach might not be compatible
    const connectionCheckInterval = setInterval(() => {
      // Using any to bypass TypeScript constraints
      const pc = peerConnection as any;
      
      try {
        // Check connection state if available
        if (pc.connectionState === 'disconnected' || 
            pc.connectionState === 'failed' || 
            pc.connectionState === 'closed' ||
            pc.iceConnectionState === 'disconnected' ||
            pc.iceConnectionState === 'failed' ||
            pc.iceConnectionState === 'closed') {
          
          // Connection has been lost
          setCallStatus('Connection lost');
          
          // Automatically try to cleanup and end the call
          Alert.alert(
            'Call Disconnected',
            'The connection with the other participant has been lost.',
            [{ text: 'OK', onPress: cleanup }]
          );
          
          // Clear the interval
          clearInterval(connectionCheckInterval);
        }
      } catch (error) {
        console.error('Error checking connection state:', error);
      }
    }, 2000);
    
    return () => {
      clearInterval(connectionCheckInterval);
    };
  }, [peerConnection, isCallStarted]);

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity 
        activeOpacity={1} 
        style={styles.videoContainer}
        onPress={showControls}
      >        {/* Remote Stream (full screen) */}
        {remoteStream ? (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={styles.remoteStream}
            objectFit="cover"
          />
        ) : (
          <View style={[styles.noStream, { backgroundColor: colorScheme === 'dark' ? '#222' : '#eee' }]}>
            <ThemedText style={styles.noStreamText}>
              {isCallStarted ? 'Waiting for other participant...' : 'Start or join a call'}
            </ThemedText>
            
            {isCallStarted && (
              <View style={styles.waitingContainer}>
                <ActivityIndicator size="large" color={tintColor} style={styles.waitingSpinner} />
                <ThemedText style={styles.waitingText}>
                  Waiting for someone to join...
                </ThemedText>
                {isCaller && (
                  <ThemedText style={styles.sharePrompt}>
                    Share your Call ID to invite someone
                  </ThemedText>
                )}
              </View>
            )}
          </View>
        )}

        {/* Local Stream (picture-in-picture) */}
        {localStream && (
          <View style={styles.localStreamContainer}>
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.localStream}
              objectFit="cover"
              zOrder={1}
            />
          </View>
        )}
        
        {/* Call Status */}
        {callStatus || !networkStatus ? (
          <View style={styles.statusContainer}>
            <ThemedText style={styles.statusText}>
              {!networkStatus ? 'No network connection' : callStatus}
            </ThemedText>
          </View>
        ) : null}
        
        {/* Network Status */}
        {isCallStarted && (
          <View style={[
            styles.networkIndicator, 
            { backgroundColor: networkStatus ? '#4CAF50' : '#F44336' }
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
            ]} />
            <ThemedText style={styles.qualityText}>
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
            </TouchableOpacity>            <TouchableOpacity 
              style={[styles.controlButton, { backgroundColor: isVideoEnabled ? 'rgba(0,0,0,0.6)' : '#d32f2f' }]}
              onPress={toggleCamera}
            >
              {renderVideoToggleIcon()}
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Controls for starting/joining call */}
        {!isCallStarted && (
          <View style={styles.setupControls}>
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
                  <Animated.View style={{transform: [{ scale: joinButtonAnimation }]}}>
                    <TouchableOpacity 
                      style={[styles.joinButton, { backgroundColor: tintColor }]}
                      onPress={() => {
                        animateButton(joinButtonAnimation);
                        joinCall();
                      }}
                      disabled={isJoining || !callId}
                    >
                      {isJoining ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <ThemedText style={styles.buttonText} lightColor="#FFFFFF" darkColor="#000000">
                          Join
                        </ThemedText>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </>
            ) : (              <View style={styles.callInfoContainer}>
                <ThemedText style={styles.callInfoText}>Share this Call ID:</ThemedText>
                <TouchableOpacity 
                  style={styles.callIdTextContainer}
                  onPress={() => {
                    // Copy call ID to clipboard
                    try {
                      if (Platform.OS === 'web') {
                        navigator.clipboard.writeText(callId);
                      } else {
                        // For React Native, we'd use Clipboard API but we'll just show an alert for now
                        Alert.alert(
                          'Call ID', 
                          `Your call ID is: ${callId}`, 
                          [{ text: 'OK' }]
                        );
                      }
                    } catch (error) {
                      console.error('Error copying call ID:', error);
                    }
                  }}
                >
                  <ThemedText style={styles.callIdText}>{callId}</ThemedText>
                  <FontAwesome name="copy" size={16} color={textColor} style={styles.copyIcon} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.startCallButtonContainer}>
              {!isCaller && (                <View style={styles.buttonRow}>                  <TouchableOpacity 
                    style={[styles.startCallButton, { backgroundColor: tintColor }]}
                    onPress={() => startCall(0)}
                  >
                    <ThemedText style={styles.buttonText} lightColor="#FFFFFF" darkColor="#000000">
                      Start New Call
                    </ThemedText>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.historyButton, { borderColor: tintColor }]}
                    onPress={() => setShowHistory(!showHistory)}
                  >
                    <ThemedText style={[styles.historyButtonText, { color: tintColor }]}>
                      {showHistory ? 'Hide History' : 'View History'}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Call History */}
              {showHistory && !isCallStarted && (
                <View style={styles.historyContainer}>
                  {loadingHistory ? (
                    <ActivityIndicator size="large" color={tintColor} />
                  ) : (
                    <CallHistory 
                      calls={callHistory} 
                      onSelectCall={handleSelectCall} 
                    />
                  )}
                </View>
              )}
            </View>
          </View>
        )}
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
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
  },
  setupControls: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 20,
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
  startCallButton: {
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
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
  noStreamText: {
    fontSize: 18,
  },
  startCallButtonContainer: {
    alignItems: 'center',
  },
  callInfoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  callInfoText: {
    fontSize: 16,
    marginBottom: 10,
  },  callIdText: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 5,
  },
  callIdTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  copyIcon: {
    marginLeft: 10,
    opacity: 0.7,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  historyButton: {
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    backgroundColor: 'transparent',
  },
  historyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },  historyContainer: {
    marginTop: 20,
    width: '100%',
    maxHeight: 200,
  },  networkIndicator: {
    position: 'absolute',
    top: 40,
    left: 20,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.7,
  },
  callQualityContainer: {
    position: 'absolute',
    top: 40,
    right: 130, // Position to the right of local stream
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 15,
    padding: 5,
  },
  qualityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },  qualityText: {
    fontSize: 12,
    color: 'white',
  },
  waitingContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  waitingSpinner: {
    marginBottom: 10,
  },
  waitingText: {
    fontSize: 16,
    marginBottom: 5,
  },
  sharePrompt: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 10,
    fontStyle: 'italic',
  },  callQualityIcon: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.7,
  },
});
