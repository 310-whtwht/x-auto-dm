import { User } from "@/types";
import Papa from "papaparse";
import dayjs from "dayjs";
import { addUniqueIdsToUsers } from "@/lib/utils";

export const exportToCsv = (users: User[]) => {
  // 引数として渡された最新のユーザーデータを使用
  const latestUsers: User[] = users;
  console.log("CSVエクスポート: 使用するユーザーデータ", {
    ユーザー数: latestUsers.length,
    ユーザー一覧: latestUsers.map((u) => ({
      userId: u.userId,
      status: u.status,
    })),
  });

  const data = latestUsers.map((user: User) => ({
    userId: user.userId,
    name: user.name,
    nickname: user.nickname,
    profile: user.profile,
    status: user.status,
    isSend: user.isSend,
  }));

  const csv = Papa.unparse(data, {
    quotes: true,
    header: true,
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `dm_users_${dayjs().format("YYYY-MM-DD")}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const importFromCsv = async (file: File): Promise<User[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        try {
          const usersWithoutUniqueId = results.data
            .map((row: any) => ({
              userId: row.userId || "",
              name: row.name || "",
              nickname: row.nickname || "",
              profile: row.profile || "",
              status:
                (row.status as "pending" | "followed" | "success" | "error") ||
                "pending",
              isSend:
                row.isSend === "true" || row.isSend === undefined
                  ? true
                  : row.isSend === "true",
            }))
            .filter((user) => user.userId && user.name);

          // uniqueIdを自動的に付与
          const users = addUniqueIdsToUsers(usersWithoutUniqueId);
          resolve(users);
        } catch (error) {
          reject(new Error("CSVファイルの形式が正しくありません"));
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};
