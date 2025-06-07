/**
 * WebRTC Helper Functions for Video Calling
 */
import {
    MediaStream,
    RTCPeerConnection,
    RTCSessionDescription,
    mediaDevices
} from 'react-native-webrtc';

import { auth, db } from '@/firebaseConfig';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    updateDoc,
    where
} from 'firebase/firestore';

// ICE Server configuration
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

/**
 * Get user media stream (camera and microphone)
 * @returns {Promise<MediaStream>} - The local media stream
 */
export const getUserMedia = async () => {
  try {
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: {
        facingMode: 'user',
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 }
      }
    });
    return stream;
  } catch (error) {
    console.error('Error accessing media devices:', error);
    throw new Error('Failed to access camera or microphone');
  }
};

/**
 * Create a new call
 * @param {MediaStream} localStream - The local media stream
 * @returns {Promise<{callId: string, peerConnection: RTCPeerConnection, cleanup: Function}>} - Call info and cleanup function
 */
export const createCall = async (localStream) => {
  if (!localStream || !auth.currentUser) {
    throw new Error('Missing local stream or user not authenticated');
  }

  // Create peer connection
  const pc = new RTCPeerConnection(configuration);
  
  // Add tracks to peer connection
  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream);
  });
  
  // Create offer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  
  // Create call document in Firestore
  const callsRef = collection(db, 'calls');
  const callDoc = await addDoc(callsRef, {
    offer: {
      type: offer.type,
      sdp: offer.sdp
    },
    createdAt: new Date(),
    createdBy: auth.currentUser.uid
  });
  
  // Set up ICE candidate handling
  pc.onicecandidate = async (event) => {
    if (event.candidate) {
      await addDoc(
        collection(db, 'calls', callDoc.id, 'callerCandidates'), 
        event.candidate.toJSON()
      );
    }
  };
  
  // Listen for answer
  const callListener = onSnapshot(doc(db, 'calls', callDoc.id), async (docSnapshot) => {
    const data = docSnapshot.data();
    if (!pc.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      await pc.setRemoteDescription(answerDescription);
    }
  });
  
  // Listen for remote ICE candidates
  const candidatesListener = onSnapshot(
    collection(db, 'calls', callDoc.id, 'calleeCandidates'),
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.addIceCandidate(candidate);
        }
      });
    }
  );
  
  // Return call information and cleanup function
  return {
    callId: callDoc.id,
    peerConnection: pc,
    cleanup: () => {
      callListener();
      candidatesListener();
      pc.close();
      // Clean up the call document
      deleteDoc(doc(db, 'calls', callDoc.id)).catch(console.error);
    }
  };
};

/**
 * Join an existing call
 * @param {string} callId - The ID of the call to join
 * @param {MediaStream} localStream - The local media stream
 * @returns {Promise<{peerConnection: RTCPeerConnection, cleanup: Function}>} - Peer connection and cleanup function
 */
export const joinCall = async (callId, localStream) => {
  if (!callId || !localStream || !auth.currentUser) {
    throw new Error('Missing call ID, local stream, or user not authenticated');
  }

  // Check if call exists
  const callDoc = doc(db, 'calls', callId);
  const callSnapshot = await getDoc(callDoc);
  
  if (!callSnapshot.exists()) {
    throw new Error('Call not found');
  }
  
  const callData = callSnapshot.data();
  
  // Create peer connection
  const pc = new RTCPeerConnection(configuration);
  
  // Add local tracks to peer connection
  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream);
  });
  
  // Set remote description (offer)
  const offerDescription = new RTCSessionDescription(callData.offer);
  await pc.setRemoteDescription(offerDescription);
  
  // Create answer
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  
  // Update call document with answer
  await updateDoc(callDoc, {
    answer: {
      type: answer.type,
      sdp: answer.sdp
    },
    answeredBy: auth.currentUser.uid
  });
  
  // Set up ICE candidate handling
  pc.onicecandidate = async (event) => {
    if (event.candidate) {
      await addDoc(
        collection(db, 'calls', callId, 'calleeCandidates'),
        event.candidate.toJSON()
      );
    }
  };
  
  // Listen for remote ICE candidates
  const candidatesListener = onSnapshot(
    collection(db, 'calls', callId, 'callerCandidates'),
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.addIceCandidate(candidate);
        }
      });
    }
  );
  
  // Return peer connection and cleanup function
  return {
    peerConnection: pc,
    cleanup: () => {
      candidatesListener();
      pc.close();
    }
  };
};

/**
 * Toggle audio track
 * @param {MediaStream} stream - The media stream to modify
 * @returns {boolean} - New muted state (true if muted)
 */
export const toggleAudio = (stream) => {
  if (!stream) return false;
  
  const audioTrack = stream.getAudioTracks()[0];
  if (!audioTrack) return false;
  
  audioTrack.enabled = !audioTrack.enabled;
  return !audioTrack.enabled; // Return the muted state
};

/**
 * Toggle video track
 * @param {MediaStream} stream - The media stream to modify
 * @returns {boolean} - New video state (true if enabled)
 */
export const toggleVideo = (stream) => {
  if (!stream) return false;
  
  const videoTrack = stream.getVideoTracks()[0];
  if (!videoTrack) return false;
  
  videoTrack.enabled = !videoTrack.enabled;
  return videoTrack.enabled; // Return the video enabled state
};

/**
 * Switch between front and back cameras
 * @param {MediaStream} stream - The media stream to modify
 */
export const switchCamera = (stream) => {
  if (!stream) return;
  
  const videoTrack = stream.getVideoTracks()[0];
  if (videoTrack && videoTrack._switchCamera) {
    videoTrack._switchCamera();
  }
};

/**
 * End a call and clean up resources
 * @param {MediaStream} localStream - The local media stream
 * @param {RTCPeerConnection} peerConnection - The WebRTC peer connection
 * @param {string} callId - The ID of the call to end
 * @param {boolean} isCaller - Whether the user is the call creator
 */
export const endCall = async (localStream, peerConnection, callId, isCaller) => {
  // Stop all tracks in the local stream
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }
  
  // Close the peer connection
  if (peerConnection) {
    peerConnection.close();
  }
  
  // Delete the call document if user is the caller
  if (callId && isCaller) {
    try {
      await deleteDoc(doc(db, 'calls', callId));
    } catch (error) {
      console.error('Error deleting call document:', error);
    }
  }
};

/**
 * Get call history for the current user
 * @param {number} limit - Maximum number of calls to return
 * @returns {Promise<Array>} - Array of call objects
 */
export const getCallHistory = async (limit = 10) => {
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }

  try {
    // Query calls where the user was either the creator or participant
    const userId = auth.currentUser.uid;
    
    // Get calls created by the user
    const createdCallsQuery = collection(db, 'calls');
    const createdCallsSnapshot = await getDocs(
      query(
        createdCallsQuery, 
        where('createdBy', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limit)
      )
    );
    
    // Get calls answered by the user
    const answeredCallsQuery = collection(db, 'calls');
    const answeredCallsSnapshot = await getDocs(
      query(
        answeredCallsQuery, 
        where('answeredBy', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limit)
      )
    );
    
    // Combine and format results
    const createdCalls = createdCallsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      role: 'creator'
    }));
    
    const answeredCalls = answeredCallsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      role: 'participant'
    }));
    
    // Merge, sort by date, and limit
    const allCalls = [...createdCalls, ...answeredCalls]
      .sort((a, b) => {
        const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
        return dateB - dateA;
      })
      .slice(0, limit);
      
    return allCalls;
  } catch (error) {
    console.error('Error fetching call history:', error);
    throw new Error('Failed to fetch call history');
  }
};
