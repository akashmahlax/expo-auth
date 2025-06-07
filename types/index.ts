export type UserRole = 'user' | 'counsellor';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type SessionStatus = 'booked' | 'completed' | 'canceled';

export interface User {
  uid: string;
  email: string;
  type: UserRole;
  verificationStatus?: VerificationStatus;
  certificates?: string[];
  interviewRequested?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  counsellorId: string;
  datetime: Date;
  status: SessionStatus;
  roomId: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Certificate {
  id: string;
  counsellorId: string;
  url: string;
  status: VerificationStatus;
  uploadedAt: Date;
  verifiedAt?: Date;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file';
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
  };
}

export interface VideoCall {
  id: string;
  sessionId: string;
  roomId: string;
  status: 'connecting' | 'active' | 'ended';
  startTime: Date;
  endTime?: Date;
  participants: {
    userId: string;
    counsellorId: string;
  };
} 