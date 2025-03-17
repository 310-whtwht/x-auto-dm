"use client";

import { useState, useEffect } from "react";
import { User, Stats, Settings } from "@/types";
import { getUsers, saveUsers, clearUsers } from "@/lib/db";

const DEFAULT_SETTINGS: Settings = {
  xUserId: "",
  xPassword: "",
  followerUrl: "",
  interval: {
    min: 300,
    max: 600,
  },
  dailyLimit: 50,
  messages: ["${nick_name}さん、はじめまして！"],
  skipExisting: true,
  followBeforeDM: true,
};

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    success: 0,
    error: 0,
    skipped: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    updateStats();
  }, [users]);

  async function loadUsers() {
    try {
      const savedUsers = await getUsers();
      setUsers(savedUsers);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateUser(userId: string, updates: Partial<User>) {
    const updatedUsers = users.map((user) =>
      user.userId === userId ? { ...user, ...updates } : user
    );
    await saveUsers(updatedUsers);
    setUsers(updatedUsers);
  }

  async function addUsers(newUsers: User[]) {
    const updatedUsers = [...users, ...newUsers];
    await saveUsers(updatedUsers);
    setUsers(updatedUsers);
  }

  async function clearAllUsers() {
    await clearUsers();
    setUsers([]);
  }

  function updateStats() {
    const newStats = users.reduce(
      (acc, user) => {
        if (user.status === "success") acc.success++;
        else if (user.status === "error") acc.error++;
        else if (user.status === "skipped") acc.skipped++;
        return acc;
      },
      { total: 0, success: 0, error: 0, skipped: 0 }
    );
    newStats.total = newStats.success + newStats.error;
    setStats(newStats as Stats);
  }

  return {
    users,
    stats,
    isLoading,
    updateUser,
    addUsers,
    clearAllUsers,
  };
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = localStorage.getItem("settings");
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings));
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };
    loadSettings();
  }, []);

  const updateSettings = async (newSettings: Settings) => {
    try {
      localStorage.setItem("settings", JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  const resetSettings = () => {
    localStorage.removeItem("settings");
    setSettings(DEFAULT_SETTINGS);
    console.log("resetSettings", DEFAULT_SETTINGS);
    console.log(localStorage.getItem("settings"));
  };

  return { settings, updateSettings, resetSettings };
}
