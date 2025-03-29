export interface User {
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
  skipped: number;
}
