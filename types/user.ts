// User and counselor types for the mental wellness app

import { FieldValue, Timestamp } from 'firebase/firestore';

export type UserRole = 'user' | 'counsellor' | 'admin';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  type: UserRole;
  createdAt: Date | Timestamp | FieldValue;
  lastLogin?: Date | Timestamp | FieldValue;
  updatedAt?: Date | Timestamp | FieldValue;
  bio?: string;
  phoneNumber?: string;
}

export interface CounsellorProfile extends UserProfile {
  type: 'counsellor';
  verificationStatus: VerificationStatus;
  specialties?: string[];
  certifications?: string[];
  education?: string;
  experience?: string;
  hourlyRate?: number;
  availability?: {
    [key: string]: { // day of week
      slots: {
        start: string; // Time in format "HH:MM"
        end: string;
      }[]
    }
  };
  certificateURLs?: string[]; // URLs to certificates stored in Firebase Storage
  verifiedAt?: Date | Timestamp | FieldValue | null;
  verifiedBy?: string | null;
  verificationComments?: string | null;
}

export interface Certificate {
  id: string;
  counsellorId: string;
  name: string;
  fileURL: string;
  fileType: string;
  uploadedAt: Date | Timestamp | FieldValue;
  verifiedAt?: Date | Timestamp | FieldValue | null;
  verifiedBy?: string | null;
  status: VerificationStatus;
  comments?: string;
}

export interface Session {
  id: string;
  userId: string;
  counsellorId: string;
  startTime: Date | Timestamp | FieldValue;
  endTime: Date | Timestamp | FieldValue;
  status: 'scheduled' | 'completed' | 'cancelled' | 'in-progress';
  callId?: string;
  notes?: string;
  rating?: number;
  feedback?: string;
  createdAt: Date | Timestamp | FieldValue;
  updatedAt?: Date | Timestamp | FieldValue;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date | Timestamp | FieldValue;
  read: boolean;
  sessionId?: string;
}
