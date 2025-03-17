"use client";

import { useState, useEffect } from "react";
import { User, Stats } from "@/types";

const DEFAULT_STATS: Stats = {
  total: 0,
  success: 0,
  error: 0,
  skipped: 0,
};

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const savedUsers = localStorage.getItem("users");
        if (savedUsers) {
          const loadedUsers = JSON.parse(savedUsers);
          setUsers(loadedUsers);
          updateStats(loadedUsers);
        }
      } catch (error) {
        console.error("Failed to load users:", error);
      }
    };
    loadUsers();
  }, []);

  const updateStats = (currentUsers: User[]) => {
    const newStats = currentUsers.reduce(
      (acc, user) => {
        acc.total++;
        if (user.status === "success") acc.success++;
        else if (user.status === "error") acc.error++;
        else if (user.status === "skipped") acc.skipped++;
        return acc;
      },
      { ...DEFAULT_STATS }
    );
    setStats(newStats);
  };

  const updateUser = async (userId: string, updates: Partial<User>) => {
    const updatedUsers = users.map((user) =>
      user.userId === userId ? { ...user, ...updates } : user
    );
    try {
      localStorage.setItem("users", JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
      updateStats(updatedUsers);
    } catch (error) {
      console.error("Failed to update user:", error);
    }
  };

  const addUsers = async (newUsers: User[]) => {
    console.log("addUsers: 追加前の状態", {
      現在のユーザー数: users.length,
      追加するユーザー数: newUsers.length,
    });

    const updatedUsers = [...users, ...newUsers];
    console.log("addUsers: 更新後のユーザー数", updatedUsers.length);

    try {
      localStorage.setItem("users", JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
      updateStats(updatedUsers);
      console.log("addUsers: 保存完了");
    } catch (error) {
      console.error("ユーザー追加エラー:", error);
    }
  };

  const clearAllUsers = () => {
    localStorage.removeItem("users");
    setUsers([]);
    setStats(DEFAULT_STATS);
  };

  return { users, stats, updateUser, addUsers, clearAllUsers };
}
