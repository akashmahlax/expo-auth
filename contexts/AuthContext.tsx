import { User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';

import { auth, db } from '@/firebaseConfig';
import { CounsellorProfile, UserProfile } from '@/types/user';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  profile: UserProfile | CounsellorProfile | null;
  isUser: boolean;
  isCounsellor: boolean;
  isVerifiedCounsellor: boolean;
  isAdmin: boolean;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  profile: null,
  isUser: false,
  isCounsellor: false,
  isVerifiedCounsellor: false,
  isAdmin: false,
  updateUserProfile: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | CounsellorProfile | null>(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setProfile(null);
        setLoading(false);
        return;
      }
      
      // Get user profile from Firestore
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userProfileListener = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile | CounsellorProfile);
        } else {
          // Create default profile for new users
          const newProfile: UserProfile = {
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || '',
            photoURL: currentUser.photoURL || '',
            type: 'user',
            createdAt: Timestamp.now()
          };
          setDoc(userDocRef, newProfile);
          setProfile(newProfile);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching user profile:", error);
        setLoading(false);
      });
      
      return () => userProfileListener();
    });

    return () => unsubscribe();
  }, []);

  // Derive role-based booleans from profile
  const isUser = profile?.type === 'user';
  const isCounsellor = profile?.type === 'counsellor';
  const isVerifiedCounsellor = 
    profile?.type === 'counsellor' && 
    (profile as CounsellorProfile).verificationStatus === 'verified';
  const isAdmin = profile?.type === 'admin';

  // Function to update user profile data
  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('No authenticated user');
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, { ...data, updatedAt: Timestamp.now() }, { merge: true });
  };

  const value = {
    user,
    loading,
    profile,
    isUser,
    isCounsellor,
    isVerifiedCounsellor,
    isAdmin,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
