import { User } from "@/types";

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getRandomMessage(messages: string[]): string {
  const validMessages = messages.filter((msg) => msg.trim() !== "");
  if (validMessages.length === 0) return "";

  const randomIndex = Math.floor(Math.random() * validMessages.length);
  return validMessages[randomIndex];
}

export function formatNickName(name: string): string {
  const parts = name.split(/[\|@｜]/);
  return parts[0].trim();
}

export function getRandomInterval(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min) * 1000; // ミリ秒に変換
}

export function validateSettings(settings: any): boolean {
  return (
    settings.xUserId &&
    settings.xPassword &&
    settings.interval.min > 0 &&
    settings.interval.max >= settings.interval.min &&
    settings.dailyLimit > 0 &&
    settings.messages.some((msg: string) => msg.trim() !== "")
  );
}

export function extractNickname(name: string): string {
  const separators = ["(", "（", "｜", "@"];
  let nickname = name;

  for (const separator of separators) {
    const index = name.indexOf(separator);
    if (index !== -1) {
      nickname = name.substring(0, index).trim();
      break;
    }
  }

  return nickname;
}

export function replaceMessageVariables(message: string, user: User): string {
  return message.replace(/\${nick_name}/g, user.nickname);
}
