"use client";

import { useState, useEffect } from "react";
import { User, Stats } from "@/types";

const DEFAULT_STATS: Stats = {
  total: 0,
  success: 0,
  error: 0,
  followed: 0,
};

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);

  useEffect(() => {
    const loadUsers = () => {
      const saved = localStorage.getItem("users");
      if (saved) {
        const parsedUsers = JSON.parse(saved);
        setUsers(parsedUsers);
        updateStats(parsedUsers);
      }
    };

    // 初期読み込み
    loadUsers();

    // localStorageの変更を監視
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "users") {
        loadUsers();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const updateStats = (currentUsers: User[]) => {
    const newStats = currentUsers.reduce(
      (acc, user) => {
        acc.total++;
        if (user.status === "success") acc.success++;
        else if (user.status === "error") acc.error++;
        else if (user.status === "followed") acc.followed++;
        return acc;
      },
      { ...DEFAULT_STATS }
    );
    setStats(newStats);
  };

  const updateUser = async (uniqueId: string, updates: Partial<User>) => {
    setUsers((prevUsers) => {
      const newUsers = prevUsers.map((user) =>
        user.uniqueId === uniqueId ? { ...user, ...updates } : user
      );
      localStorage.setItem("users", JSON.stringify(newUsers));
      updateStats(newUsers);
      return newUsers;
    });
  };

  const addUsers = async (newUsers: User[]) => {
    console.log("addUsers: 追加前の状態", {
      現在のユーザー数: users.length,
      追加するユーザー数: newUsers.length,
    });

    // 重複チェック: 既存のuserIdを持つユーザーは除外
    const existingUserIds = new Set(users.map((user) => user.userId));
    const uniqueNewUsers = newUsers.filter(
      (user) => !existingUserIds.has(user.userId)
    );

    const skippedCount = newUsers.length - uniqueNewUsers.length;
    if (skippedCount > 0) {
      console.log(`重複ユーザー ${skippedCount}件 をスキップしました`);
    }

    const updatedUsers = [...users, ...uniqueNewUsers];
    console.log("addUsers: 更新後のユーザー数", updatedUsers.length);

    try {
      localStorage.setItem("users", JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
      updateStats(updatedUsers);
      console.log("addUsers: 保存完了");

      // 重複スキップ情報を返す
      return { added: uniqueNewUsers.length, skipped: skippedCount };
    } catch (error) {
      console.error("ユーザー追加エラー:", error);
      return { added: 0, skipped: 0 };
    }
  };

  const clearAllUsers = () => {
    localStorage.removeItem("users");
    setUsers([]);
    setStats(DEFAULT_STATS);
  };

  return { users, stats, updateUser, addUsers, clearAllUsers };
}
