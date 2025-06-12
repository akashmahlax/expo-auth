import { Call } from '@stream-io/video-react-native-sdk';
import { streamAuthService } from './streamAuthService';

class StreamVideoService {
  async createVideoCall(callId: string, callType: 'default' | 'audio_room' = 'default') {
    try {
      const videoClient = streamAuthService.getVideoClient();
      if (!videoClient) {
        throw new Error('Stream video client not initialized');
      }

      const call = videoClient.call(callType, callId);
      await call.getOrCreate({
        data: {
          custom: {
            session_type: 'counseling',
            created_at: new Date().toISOString(),
          },
        },
      });

      return { success: true, call };
    } catch (error) {
      console.error('Error creating video call:', error);
      return { success: false, error };
    }
  }

  async joinVideoCall(callId: string): Promise<{ success: boolean; call?: Call; error?: any }> {
    try {
      const videoClient = streamAuthService.getVideoClient();
      if (!videoClient) {
        throw new Error('Stream video client not initialized');
      }

      const call = videoClient.call('default', callId);
      await call.join({ create: false });

      return { success: true, call };
    } catch (error) {
      console.error('Error joining video call:', error);
      return { success: false, error };
    }
  }

  async leaveCall(call: Call) {
    try {
      await call.leave();
      return { success: true };
    } catch (error) {
      console.error('Error leaving call:', error);
      return { success: false, error };
    }
  }

  async endCall(call: Call) {
    try {
      await call.endCall();
      return { success: true };
    } catch (error) {
      console.error('Error ending call:', error);
      return { success: false, error };
    }
  }

  async toggleCamera(call: Call) {
    try {
      await call.camera.toggle();
      return { success: true };
    } catch (error) {
      console.error('Error toggling camera:', error);
      return { success: false, error };
    }
  }

  async toggleMicrophone(call: Call) {
    try {
      await call.microphone.toggle();
      return { success: true };
    } catch (error) {
      console.error('Error toggling microphone:', error);
      return { success: false, error };
    }
  }
}

export const streamVideoService = new StreamVideoService();
