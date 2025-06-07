// This module provides a fallback for NetInfo when it's not available
// Useful for development mode when native modules aren't fully linked

// Improved mock implementation that resolves TypeError and works in development
class MockNetInfo {
  static isConnected = {
    fetch: () => Promise.resolve(true),
    addEventListener: (callback) => {
      // Return a mock connection state
      setTimeout(() => {
        callback({ isConnected: true });
      }, 100);
      
      // Return a mock unsubscribe function
      return () => {};
    }
  };

  static fetch = () => Promise.resolve({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
    details: {
      isConnectionExpensive: false,
      cellularGeneration: '4g'
    }
  });

  static addEventListener = (type, callback) => {
    // Return a mock connection state
    setTimeout(() => {
      callback({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: {
          isConnectionExpensive: false,
          cellularGeneration: '4g'
        }
      });
    }, 100);
    
    // Return a mock unsubscribe function
    return () => {};
  };

  static useNetInfo = () => ({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
    details: {
      isConnectionExpensive: false,
      cellularGeneration: '4g'
    }
  });
}

// Export the mock NetInfo to avoid native module errors
// This approach ensures we don't crash when the native module isn't available
let NetInfo;
try {
  // Try to get the real NetInfo implementation first
  const RealNetInfo = require('@react-native-community/netinfo');
  
  // If we get here, the real implementation is available
  console.log('Successfully loaded real NetInfo module');
  NetInfo = RealNetInfo;
} catch (error) {
  // If the real implementation fails, use our mock
  console.warn('NetInfo native module not available, using mock implementation');
  NetInfo = MockNetInfo;
}

export default NetInfo;
