import { Channel } from 'stream-chat';
import { streamAuthService } from './streamAuthService';

class StreamChatService {
  async createChatChannel(channelId: string, participants: string[], channelName?: string) {
    try {
      const chatClient = streamAuthService.getChatClient();
      if (!chatClient) {
        throw new Error('Stream chat client not initialized');
      }      const channel = chatClient.channel('messaging', channelId, {
        members: participants,
      });

      await channel.create();
      return { success: true, channel };
    } catch (error) {
      console.error('Error creating chat channel:', error);
      return { success: false, error };
    }
  }

  async getOrCreateChannel(channelId: string, participants: string[]) {
    try {
      const chatClient = streamAuthService.getChatClient();
      if (!chatClient) {
        throw new Error('Stream chat client not initialized');
      }

      const channel = chatClient.channel('messaging', channelId, {
        members: participants,
      });

      await channel.watch();
      return { success: true, channel };
    } catch (error) {
      console.error('Error getting/creating channel:', error);
      return { success: false, error };
    }
  }
  async sendMessage(channel: Channel, message: string) {
    try {
      await channel.sendMessage({
        text: message,
      });
      return { success: true };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error };
    }
  }

  async markAsRead(channel: Channel) {
    try {
      await channel.markRead();
      return { success: true };
    } catch (error) {
      console.error('Error marking as read:', error);
      return { success: false, error };
    }
  }

  async getUserChannels() {
    try {
      const chatClient = streamAuthService.getChatClient();
      if (!chatClient) {
        throw new Error('Stream chat client not initialized');
      }

      const filters = { members: { $in: [chatClient.userID!] } };
      const sort = { last_message_at: -1 as const };
      const channels = await chatClient.queryChannels(filters, sort);

      return { success: true, channels };
    } catch (error) {
      console.error('Error getting user channels:', error);
      return { success: false, error };
    }
  }
}

export const streamChatService = new StreamChatService();
