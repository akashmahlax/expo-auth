declare module '@/utils/mock-netinfo' {
  export type NetInfoState = {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    type: string;
    details: any;
  };
  
  type Callback = (state: NetInfoState) => void;
  type Unsubscribe = () => void;
  
  const NetInfo: {
    isConnected: {
      fetch(): Promise<boolean>;
      addEventListener(callback: (isConnected: boolean) => void): Unsubscribe;
    };
    fetch(): Promise<NetInfoState>;
    addEventListener(type: string, callback: Callback): Unsubscribe;
  };
  
  export default NetInfo;
}
