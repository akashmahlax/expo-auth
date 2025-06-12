// User and counselor types for the mental wellness app

import { Key } from 'react';

export type UserRole = 'user' | 'counsellor' | 'admin';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  type: UserRole;
  createdAt: Date | string;
  lastLogin?: Date | string;
  bio?: string;
  phoneNumber?: string;
  // Backward compatibility alias
  name?: string; // alias for displayName
}

export interface CounsellorProfile extends UserProfile {
  id: Key | null | undefined;
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
  profilePicture?: string;
  rating?: number;
  isVerified?: boolean;
  // Backward compatibility aliases
  name?: string; // alias for displayName
  specializations?: string[]; // alias for specialties
}

export interface Certificate {
  id: string;
  counsellorId: string;
  name: string;
  fileURL: string;
  fileType: string;
  uploadedAt: Date | string;
  verifiedAt?: Date | string;
  verifiedBy?: string;
  status: VerificationStatus;
  comments?: string;
}

export interface Session {
  id: string;
  userId: string;
  counsellorId: string;
  startTime: Date | string;
  endTime: Date | string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'in-progress';
  callId?: string;
  notes?: string;
  rating?: number;
  feedback?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date | string;
  read: boolean;
  sessionId?: string;
}
