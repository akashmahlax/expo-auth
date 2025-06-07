import { Timestamp, addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';

import { auth, db } from '@/firebaseConfig';
import { checkTimeSlotAvailable } from '@/services/availabilityService';
import { Session } from '@/types/user';

// Create a new counseling session
export const createSession = async (
  counsellorId: string,
  startTime: Date,
  endTime: Date
): Promise<string> => {
  if (!auth.currentUser) throw new Error('No authenticated user');
  
  const userId = auth.currentUser.uid;
  
  // Check if the counsellor exists and is verified
  const counsellorRef = doc(db, 'users', counsellorId);
  const counsellorSnap = await getDoc(counsellorRef);
  
  if (!counsellorSnap.exists()) {
    throw new Error('Counsellor not found');
  }
  
  if (counsellorSnap.data()?.verificationStatus !== 'verified') {
    throw new Error('This counsellor is not verified');
  }
  
  // Check counselor availability for the requested time slot
  const startHour = startTime.getHours().toString().padStart(2, '0');
  const startMinute = startTime.getMinutes().toString().padStart(2, '0');
  const endHour = endTime.getHours().toString().padStart(2, '0');
  const endMinute = endTime.getMinutes().toString().padStart(2, '0');
  
  const isAvailable = await checkTimeSlotAvailable(
    counsellorId,
    startTime,
    `${startHour}:${startMinute}`,
    `${endHour}:${endMinute}`
  );
  
  if (!isAvailable) {
    throw new Error('The counselor is not available at the selected time');
  }
  
  // Create the session
  const sessionData = {
    userId,
    counsellorId,
    startTime,
    endTime,
    status: 'scheduled',
    createdAt: serverTimestamp(),
  } as any; // Using any to bypass TS error with serverTimestamp
  
  const docRef = await addDoc(collection(db, 'sessions'), sessionData);
  return docRef.id;
};

// Get sessions for a user (either as client or counsellor)
export const getUserSessions = async (): Promise<Session[]> => {
  if (!auth.currentUser) throw new Error('No authenticated user');
  
  const userId = auth.currentUser.uid;
  
  // Get user type to determine which sessions to fetch
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) throw new Error('User profile not found');
  
  const userType = userSnap.data()?.type;
  let sessionsQuery;
  
  if (userType === 'counsellor') {
    // If counsellor, get sessions where they are the provider
    sessionsQuery = query(
      collection(db, 'sessions'),
      where('counsellorId', '==', userId),
      orderBy('startTime')
    );
  } else {
    // If regular user, get sessions where they are the client
    sessionsQuery = query(
      collection(db, 'sessions'),
      where('userId', '==', userId),
      orderBy('startTime')
    );
  }
  
  const querySnapshot = await getDocs(sessionsQuery);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Session));
};

// Get upcoming sessions
export const getUpcomingSessions = async (): Promise<Session[]> => {
  if (!auth.currentUser) throw new Error('No authenticated user');
  
  const userId = auth.currentUser.uid;
  
  // Get user type to determine which sessions to fetch
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) throw new Error('User profile not found');
  
  const userType = userSnap.data()?.type;
  let sessionsQuery;
  
  const now = Timestamp.now();
  
  if (userType === 'counsellor') {
    // If counsellor, get upcoming sessions where they are the provider
    sessionsQuery = query(
      collection(db, 'sessions'),
      where('counsellorId', '==', userId),
      where('startTime', '>=', now),
      where('status', '==', 'scheduled'),
      orderBy('startTime')
    );
  } else {
    // If regular user, get upcoming sessions where they are the client
    sessionsQuery = query(
      collection(db, 'sessions'),
      where('userId', '==', userId),
      where('startTime', '>=', now),
      where('status', '==', 'scheduled'),
      orderBy('startTime')
    );
  }
  
  const querySnapshot = await getDocs(sessionsQuery);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Session));
};

// Update a session status
export const updateSessionStatus = async (
  sessionId: string, 
  status: 'scheduled' | 'completed' | 'cancelled' | 'in-progress'
): Promise<void> => {
  if (!auth.currentUser) throw new Error('No authenticated user');
  
  const userId = auth.currentUser.uid;
  
  // Check if current user is part of this session
  const sessionRef = doc(db, 'sessions', sessionId);
  const sessionSnap = await getDoc(sessionRef);
  
  if (!sessionSnap.exists()) {
    throw new Error('Session not found');
  }
  
  const sessionData = sessionSnap.data() as Session;
  if (sessionData.userId !== userId && sessionData.counsellorId !== userId) {
    throw new Error('You do not have permission to update this session');
  }
  
  // Update the session status
  await updateDoc(sessionRef, {
    status,
    updatedAt: serverTimestamp(),
  });
};

// Add call ID to session when starting a video call
export const addCallToSession = async (sessionId: string, callId: string): Promise<void> => {
  if (!auth.currentUser) throw new Error('No authenticated user');
  
  const userId = auth.currentUser.uid;
  
  // Check if current user is part of this session
  const sessionRef = doc(db, 'sessions', sessionId);
  const sessionSnap = await getDoc(sessionRef);
  
  if (!sessionSnap.exists()) {
    throw new Error('Session not found');
  }
  
  const sessionData = sessionSnap.data() as Session;
  if (sessionData.userId !== userId && sessionData.counsellorId !== userId) {
    throw new Error('You do not have permission to update this session');
  }
  
  // Update the session with call ID and change status to in-progress
  await updateDoc(sessionRef, {
    callId,
    status: 'in-progress',
    updatedAt: serverTimestamp(),
  });
};

// Add feedback and rating to a completed session
export const addSessionFeedback = async (
  sessionId: string, 
  rating: number,
  feedback: string
): Promise<void> => {
  if (!auth.currentUser) throw new Error('No authenticated user');
  
  const userId = auth.currentUser.uid;
  
  // Check if current user is the client in this session
  const sessionRef = doc(db, 'sessions', sessionId);
  const sessionSnap = await getDoc(sessionRef);
  
  if (!sessionSnap.exists()) {
    throw new Error('Session not found');
  }
  
  const sessionData = sessionSnap.data() as Session;
  if (sessionData.userId !== userId) {
    throw new Error('Only clients can add feedback to a session');
  }
  
  if (sessionData.status !== 'completed') {
    throw new Error('Feedback can only be added to completed sessions');
  }
  
  // Update the session with feedback
  await updateDoc(sessionRef, {
    rating,
    feedback,
    updatedAt: serverTimestamp(),
  });
};
