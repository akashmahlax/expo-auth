import { addDoc, collection, doc, getDoc, getDocs, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { auth, db, storage } from '@/firebaseConfig';
import { Certificate, CounsellorProfile, VerificationStatus } from '@/types/user';

// Upload a certificate file to Firebase Storage
export const uploadCertificate = async (file: Blob, fileName: string, counsellorId: string): Promise<string> => {
  if (!auth.currentUser) throw new Error('No authenticated user');
  
  const fileExtension = fileName.split('.').pop();
  const storagePath = `certificates/${counsellorId}/${Date.now()}-${fileName}`;
  const storageRef = ref(storage, storagePath);
  
  // Upload the file
  await uploadBytes(storageRef, file);
  
  // Get the download URL
  const downloadURL = await getDownloadURL(storageRef);
  
  return downloadURL;
};

// Create a certificate record in Firestore
export const createCertificate = async (
  counsellorId: string, 
  name: string, 
  fileURL: string, 
  fileType: string
): Promise<Certificate> => {
  if (!auth.currentUser) throw new Error('No authenticated user');
    const certificateData: Omit<Certificate, 'id'> = {
    counsellorId,
    name,
    fileURL,
    fileType,
    uploadedAt: new Date(),
    status: 'pending',
  };
  
  // Add to certificates collection
  const docRef = await addDoc(collection(db, 'certificates'), certificateData);
  
  // Return the created certificate with its ID
  return {
    id: docRef.id,
    ...certificateData,
    uploadedAt: new Date() // Client-side timestamp for immediate display
  } as Certificate;
};

// Get all certificates for a counsellor
export const getCounsellorCertificates = async (counsellorId: string): Promise<Certificate[]> => {
  if (!auth.currentUser) throw new Error('No authenticated user');
  
  const certificatesQuery = query(
    collection(db, 'certificates'), 
    where('counsellorId', '==', counsellorId)
  );
  
  const querySnapshot = await getDocs(certificatesQuery);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Certificate));
};

// Update counsellor profile with verification data
export const updateCounsellorVerification = async (
  counsellorId: string, 
  status: VerificationStatus,
  comments?: string
): Promise<void> => {
  if (!auth.currentUser) throw new Error('No authenticated user');
  
  // Only admins should be able to update verification status
  const adminCheck = await getDoc(doc(db, 'users', auth.currentUser.uid));
  if (!adminCheck.exists() || adminCheck.data().type !== 'admin') {
    throw new Error('Only admins can update verification status');
  }
  
  // Update counsellor profile
  const userRef = doc(db, 'users', counsellorId);
  await updateDoc(userRef, {
    verificationStatus: status,
    verificationComments: comments || null,
    verifiedAt: status === 'verified' ? Timestamp.now() : null,
    verifiedBy: status === 'verified' ? auth.currentUser.uid : null,
  });
};

// Register as a counsellor (convert user to counsellor)
export const registerAsCounsellor = async (counsellorData: Partial<CounsellorProfile>): Promise<void> => {
  if (!auth.currentUser) throw new Error('No authenticated user');
  
  // Get current user profile
  const userRef = doc(db, 'users', auth.currentUser.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) throw new Error('User profile not found');
  
  // Update with counsellor-specific fields
  await updateDoc(userRef, {
    type: 'counsellor',
    verificationStatus: 'pending',
    ...counsellorData,
    updatedAt: Timestamp.now()
  });
};

// Get all counsellors (for counselor discovery)
export const getAllCounsellors = async (): Promise<CounsellorProfile[]> => {
  try {
    const counsellorsQuery = query(
      collection(db, 'users'), 
      where('type', '==', 'counsellor')
    );
    
    const querySnapshot = await getDocs(counsellorsQuery);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        // Add computed properties for backwards compatibility
        name: data.displayName,
        specializations: data.specialties,
        isVerified: data.verificationStatus === 'verified',
        rating: data.rating || 4.8,
        profilePicture: data.photoURL
      } as CounsellorProfile;
    });
  } catch (error) {
    console.error('Error fetching counsellors:', error);
    throw error;
  }
};

// Get a specific counsellor profile by ID
export const getCounsellorProfile = async (counsellorId: string): Promise<CounsellorProfile> => {
  try {
    const userRef = doc(db, 'users', counsellorId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('Counsellor not found');
    }
    
    const data = userSnap.data();
    
    // Ensure it's a counsellor profile
    if (data.type !== 'counsellor') {
      throw new Error('User is not a counsellor');
    }
    
    return {
      ...data,
      id: userSnap.id,
      uid: userSnap.id,
      // Add computed properties for backwards compatibility
      name: data.displayName,
      specializations: data.specialties,
      isVerified: data.verificationStatus === 'verified',
      rating: data.rating || 4.8,
      profilePicture: data.photoURL
    } as CounsellorProfile;
  } catch (error) {
    console.error('Error fetching counsellor profile:', error);
    throw error;
  }
};
