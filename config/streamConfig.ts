// Stream.io Configuration
// Replace these with your actual Stream.io API keys

export const STREAM_CONFIG = {
  // Video API Key - Get from https://getstream.io/dashboard/
  VIDEO_API_KEY: 'YOUR_STREAM_VIDEO_API_KEY',
  
  // Chat API Key - Get from https://getstream.io/dashboard/
  CHAT_API_KEY: 'YOUR_STREAM_CHAT_API_KEY',
  
  // Backend URL for token generation (implement this)
  BACKEND_URL: 'https://your-backend.com/api',
};

// For development only - replace with proper backend token generation
export const generateDevelopmentToken = (userId: string): string => {
  // This is a mock token for development
  // In production, your backend should generate proper JWT tokens
  return `dev_token_${userId}_${Date.now()}`;
};

// Instructions for setup:
// 1. Sign up at https://getstream.io/
// 2. Create a new app
// 3. Get your API keys from the dashboard
// 4. Replace the API keys above
// 5. Set up token generation on your backend
// 6. Update the BACKEND_URL
