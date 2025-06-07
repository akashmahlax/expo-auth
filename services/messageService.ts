import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, Timestamp, updateDoc, where } from 'firebase/firestore';

import { auth, db } from '@/firebaseConfig';
import { Message } from '@/types/user';

// Send a message to another user
export const sendMessage = async (
  receiverId: string,
  content: string,
  sessionId?: string
): Promise<string> => {
  if (!auth.currentUser) throw new Error('No authenticated user');
  
  const senderId = auth.currentUser.uid;
  
  // Create the message
  const messageData: Omit<Message, 'id'> = {
    senderId,
    receiverId,
    content,
    timestamp: serverTimestamp(),
    read: false,
    sessionId
  };
  
  const docRef = await addDoc(collection(db, 'messages'), messageData);
  return docRef.id;
};

// Mark messages as read
export const markMessagesAsRead = async (senderId: string): Promise<void> => {
  if (!auth.currentUser) throw new Error('No authenticated user');
  
  const userId = auth.currentUser.uid;
  
  // Find all unread messages from this sender
  const messagesQuery = query(
    collection(db, 'messages'),
    where('senderId', '==', senderId),
    where('receiverId', '==', userId),
    where('read', '==', false)
  );
  
  const querySnapshot = await getDocs(messagesQuery);
  
  // Update each message
  const batch = querySnapshot.docs.map(async (doc) => {
    await updateDoc(doc.ref, { read: true });
  });
  
  await Promise.all(batch);
};

// Get conversation history with a specific user
export const getConversation = async (otherUserId: string): Promise<Message[]> => {
  if (!auth.currentUser) throw new Error('No authenticated user');
  
  const userId = auth.currentUser.uid;
  
  // Get messages sent to and from the other user
  const messagesQuery = query(
    collection(db, 'messages'),
    where('senderId', 'in', [userId, otherUserId]),
    where('receiverId', 'in', [userId, otherUserId]),
    orderBy('timestamp', 'asc')
  );
  
  const querySnapshot = await getDocs(messagesQuery);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Message));
};

// Listen to conversation updates in real-time
export const listenToConversation = (
  otherUserId: string, 
  callback: (messages: Message[]) => void
) => {
  if (!auth.currentUser) throw new Error('No authenticated user');
  
  const userId = auth.currentUser.uid;
  
  // Query for messages in this conversation
  const messagesQuery = query(
    collection(db, 'messages'),
    where('senderId', 'in', [userId, otherUserId]),
    where('receiverId', 'in', [userId, otherUserId]),
    orderBy('timestamp', 'asc')
  );
  
  // Set up real-time listener
  const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Message));
    
    callback(messages);
  });
  
  // Return unsubscribe function
  return unsubscribe;
};

// Get all conversations (distinct users the current user has chatted with)
export const getAllConversations = async () => {
  if (!auth.currentUser) throw new Error('No authenticated user');
  
  const userId = auth.currentUser.uid;
  
  // Get messages sent by the current user
  const sentMessagesQuery = query(
    collection(db, 'messages'),
    where('senderId', '==', userId),
    orderBy('timestamp', 'desc')
  );
  
  const sentSnapshot = await getDocs(sentMessagesQuery);
  
  // Get messages received by the current user
  const receivedMessagesQuery = query(
    collection(db, 'messages'),
    where('receiverId', '==', userId),
    orderBy('timestamp', 'desc')
  );
  
  const receivedSnapshot = await getDocs(receivedMessagesQuery);
  
  // Combine and process message data
  const contacts = new Map();
  
  // Process sent messages
  sentSnapshot.docs.forEach(doc => {
    const data = doc.data() as Message;
    if (!contacts.has(data.receiverId)) {
      contacts.set(data.receiverId, {
        userId: data.receiverId,
        lastMessage: data.content,
        lastMessageTimestamp: data.timestamp,
        unreadCount: 0
      });
    }
  });
  
  // Process received messages
  receivedSnapshot.docs.forEach(doc => {
    const data = doc.data() as Message;
    if (!contacts.has(data.senderId)) {
      contacts.set(data.senderId, {
        userId: data.senderId,
        lastMessage: data.content,
        lastMessageTimestamp: data.timestamp,
        unreadCount: data.read ? 0 : 1
      });
    } else if (!data.read) {
      // Increment unread count if this is a newer message and not read
      const contact = contacts.get(data.senderId);
      contact.unreadCount++;
      contacts.set(data.senderId, contact);
    }
  });
  
  // Get user profiles for each contact
  const contactsWithProfiles = await Promise.all(
    Array.from(contacts.values()).map(async contact => {
      const userDoc = await getDoc(doc(db, 'users', contact.userId));
      return {
        ...contact,
        profile: userDoc.exists() ? userDoc.data() : null
      };
    })
  );
  
  // Sort by most recent message
  return contactsWithProfiles.sort((a, b) => {
    const timestampA = a.lastMessageTimestamp instanceof Timestamp 
      ? a.lastMessageTimestamp.toMillis() 
      : new Date(a.lastMessageTimestamp).getTime();
    
    const timestampB = b.lastMessageTimestamp instanceof Timestamp 
      ? b.lastMessageTimestamp.toMillis() 
      : new Date(b.lastMessageTimestamp).getTime();
    
    return timestampB - timestampA;
  });
};
