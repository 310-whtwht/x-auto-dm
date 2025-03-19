import { openDB, DBSchema } from "idb";
import { User, Settings } from "@/types";

interface XDMDatabase extends DBSchema {
  users: {
    key: string;
    value: User;
    indexes: { "by-status": string };
  };
  settings: {
    key: "settings";
    value: Settings;
  };
}

const DB_NAME = "x-dm-db";
const DB_VERSION = 1;

export async function initDB() {
  return openDB<XDMDatabase>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("users")) {
        const userStore = db.createObjectStore("users", { keyPath: "userId" });
        userStore.createIndex("by-status", "status");
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings");
      }
    },
  });
}

export async function getDefaultSettings(): Promise<Settings> {
  return {
    xUserId: "",
    xPassword: "",
    interval: {
      min: 60,
      max: 120,
    },
    dailyLimit: 20,
    messages: ["", "", "", "", ""],
    skipExisting: true,
    followBeforeDM: true,
    followerUrl: "",
  };
}

export async function getSettings(): Promise<Settings> {
  const db = await initDB();
  const settings = await db.get("settings", "settings");
  return settings || (await getDefaultSettings());
}

export async function saveSettings(settings: Settings): Promise<void> {
  const db = await initDB();
  await db.put("settings", settings, "settings");
}

export async function saveUsers(users: User[]): Promise<void> {
  const db = await initDB();
  const tx = db.transaction("users", "readwrite");
  await Promise.all([...users.map((user) => tx.store.put(user)), tx.done]);
}

export async function getUsers(): Promise<User[]> {
  const db = await initDB();
  return db.getAll("users");
}

export async function clearUsers(): Promise<void> {
  const db = await initDB();
  const tx = db.transaction("users", "readwrite");
  await tx.store.clear();
  await tx.done;
}
