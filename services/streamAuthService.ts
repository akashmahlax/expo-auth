import { StreamVideoClient, User } from '@stream-io/video-react-native-sdk';
import { StreamChat } from 'stream-chat';

import { STREAM_CONFIG, generateDevelopmentToken } from '@/config/streamConfig';

class StreamAuthService {
  private videoClient: StreamVideoClient | null = null;
  private chatClient: StreamChat | null = null;
  async initializeStream(userId: string, userName: string, userImage?: string) {
    try {
      // For development, we'll generate a temporary token
      // In production, this should come from your backend
      const token = generateDevelopmentToken(userId);

      const user: User = {
        id: userId,
        name: userName,
        image: userImage,
      };

      // Initialize Video Client
      this.videoClient = new StreamVideoClient({
        apiKey: STREAM_CONFIG.VIDEO_API_KEY,
        user,
        token,
      });

      // Initialize Chat Client
      this.chatClient = StreamChat.getInstance(STREAM_CONFIG.CHAT_API_KEY);
      await this.chatClient.connectUser(user, token);

      console.log('Stream.io initialized successfully');
      return { success: true, videoClient: this.videoClient, chatClient: this.chatClient };
    } catch (error) {
      console.error('Failed to initialize Stream.io:', error);
      return { success: false, error };
    }
  }
  // TEMPORARY: For development only - replace with backend token generation
  private generateDevelopmentToken(userId: string): string {
    // This is a mock token for development
    // In production, your backend should generate proper JWT tokens
    return `dev_token_${userId}_${Date.now()}`;
  }

  async disconnectUser() {
    try {
      if (this.chatClient) {
        await this.chatClient.disconnectUser();
      }
      if (this.videoClient) {
        await this.videoClient.disconnectUser();
      }
      this.videoClient = null;
      this.chatClient = null;
    } catch (error) {
      console.error('Error disconnecting from Stream.io:', error);
    }
  }

  getVideoClient() {
    return this.videoClient;
  }

  getChatClient() {
    return this.chatClient;
  }

  isInitialized() {
    return this.videoClient !== null && this.chatClient !== null;
  }
}

export const streamAuthService = new StreamAuthService();
