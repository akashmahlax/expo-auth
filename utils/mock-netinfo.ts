// This module provides a fallback for NetInfo when it's not available
// Useful for development mode when native modules aren't fully linked
export type NetInfoState = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: string;
  details: any;
};

export type Callback = (state: NetInfoState) => void;
export type Unsubscribe = () => void;

class MockNetInfo {
  static isConnected = {
    fetch: () => Promise.resolve(true),
    addEventListener: (callback: (isConnected: boolean) => void): Unsubscribe => {
      // Return a mock connection state
      setTimeout(() => {
        callback(true);
      }, 100);
      
      // Return a mock unsubscribe function
      return () => {};
    }
  };

  static fetch = (): Promise<NetInfoState> => Promise.resolve({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
    details: {
      isConnectionExpensive: false,
      cellularGeneration: '4g'
    }
  });

  static addEventListener = (type: string, callback: Callback): Unsubscribe => {
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
}

// We know there's a real NetInfo module that we should try to use first
let RealNetInfo: typeof MockNetInfo;

try {
  // Try to import the real NetInfo
  RealNetInfo = require('@react-native-community/netinfo');
  console.log('Using real NetInfo');
} catch (error) {
  console.warn('Using mock NetInfo implementation');
  RealNetInfo = MockNetInfo;
}

export default RealNetInfo;
