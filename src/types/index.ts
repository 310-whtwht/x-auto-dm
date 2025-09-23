export interface User {
  uniqueId: string;
  userId: string;
  name: string;
  nickname: string;
  profile: string;
  status: "pending" | "followed" | "success" | "error";
  isSend: boolean;
}

export interface Settings {
  xUserId: string;
  xPassword: string;
  followerUrl: string;
  interval: {
    min: number;
    max: number;
  };
  dailyLimit: number;
  messages: string[];
  skipExisting: boolean;
  followBeforeDM: boolean;
}

export interface Stats {
  total: number;
  success: number;
  error: number;
  followed: number;
}

// Electron API の型定義
declare global {
  interface Window {
    electron: {
      getDesktopPath: () => string;
      invoke: (channel: string, data?: any) => Promise<any>;
      send: (channel: string, data?: any) => void;
      on: (channel: string, func: (...args: any[]) => void) => () => void;
      platform: string;
      getSettings: () => Promise<any>;
      setSettings: (settings: any) => Promise<boolean>;
      getChromePath: () => Promise<string>;
      setChromePath: (chromePath: string) => Promise<boolean>;
      scrapeFollowers: (
        targetUsername: string,
        customUrl?: string
      ) => Promise<{
        success: boolean;
        followers?: any[];
        csvPath?: string;
        count?: number;
        error?: string;
      }>;
      sendDM: (
        user: User,
        message: string,
        settings: {
          interval: {
            min: number;
            max: number;
          };
          dailyLimit: number;
          followBeforeDM: boolean;
        }
      ) => Promise<{
        success: boolean;
        error?: string;
        status: string;
      }>;
    };
  }
}
