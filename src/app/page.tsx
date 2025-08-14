"use client";

import { useState, useRef } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { DataTable } from "@/components/ui/data-table";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { extractUsers, handleLaunchChrome } from "./actions";
import { getRandomMessage, getRandomInterval, sleep } from "@/lib/utils";
import {
  Box,
  Button,
  Grid,
  Paper,
  Typography,
  List,
  ListItem,
  Divider,
  IconButton,
} from "@mui/material";
import { useSettings } from "@/hooks/use-settings";
import { useUsers } from "@/hooks/use-users";
import { User } from "@/types";
import { LogArea } from "@/components/log-area";
import { 
  Settings as SettingsIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Send as SendIcon,
  Launch as LaunchIcon,
  Stop as StopIcon,
} from '@mui/icons-material';
import React from "react";
import { importFromCsv } from "@/lib/csv";

export default function Home() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { users, stats, updateUser, addUsers, clearAllUsers } = useUsers();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [shouldStop, setShouldStop] = useState(false);
  const [searchMode, setSearchMode] = useState<"exact" | "partial">("exact");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const addLogs = (newLogs: string[]) => {
    setLogs((prev) => [...prev, ...newLogs]);
  };

  const handleExtract = async () => {
    if (!settings.followerUrl) {
      setLogs((prev) => [...prev, "フォロワーURLを設定してください"]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: settings.followerUrl }),
      });

      const data = await response.json();
      
      if (data.success) {
        setLogs((prev) => [...prev, "フォロワー情報の抽出が完了しました"]);
        if (data.output) {
          setLogs((prev) => [...prev, data.output]);
        }
      } else {
        setLogs((prev) => [...prev, `エラー: ${data.error}`]);
      }
    } catch (error) {
      console.error("抽出エラー:", error);
      setLogs((prev) => [...prev, "エラーが発生しました"]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsSending(false);
      setLogs(prev => [...prev, "送信処理を強制停止しました"]);
    }
  };

  const handleSend = async () => {
    try {
      if (!settings.messages || settings.messages.length === 0) {
        setLogs(prev => [...prev, "メッセージテンプレートが設定されていません"]);
        return;
      }

      // 1日の送信数カウントを取得・初期化
      const today = new Date().toDateString();
      const savedDate = localStorage.getItem('lastSendDate');
      
      // 日付が変わっていたらリセット
      if (savedDate !== today) {
        localStorage.setItem('lastSendDate', today);
        localStorage.setItem('dailySendCount', '0');
      }
      
      let dailySendCount = parseInt(localStorage.getItem('dailySendCount') || '0');

      // 送信上限に達している場合は処理を中止
      if (dailySendCount >= settings.dailyLimit) {
        setLogs(prev => [...prev, `1日の送信上限(${settings.dailyLimit}件)に達しています`]);
        return;
      }

      // 残り送信可能数を計算
      const remainingLimit = settings.dailyLimit - dailySendCount;
      
      const targetUserIds = users
        .filter(user => 
          user.isSend &&
          (user.status === "followed" || user.status === "error" || user.status === "pending")
        )
        .slice(0, remainingLimit)
        .map(user => user.userId);

      if (targetUserIds.length === 0) {
        setLogs(prev => [...prev, "送信対象のユーザーが選択されていません"]);
        return;
      }

      setIsSending(true);
      setLogs(prev => [
        ...prev, 
        "DM送信処理を開始します",
        `残り送信可能数: ${remainingLimit}件`
      ]);
      abortControllerRef.current = new AbortController();

      for (const userId of targetUserIds) {
        try {
          // 送信上限の再チェック
          if (dailySendCount >= settings.dailyLimit) {
            setLogs(prev => [...prev, `1日の送信上限(${settings.dailyLimit}件)に達しました`]);
            break;
          }

          const currentUser = users.find(u => u.userId === userId);
          if (!currentUser) continue;

          const messageTemplate = settings.messages[
            Math.floor(Math.random() * settings.messages.length)
          ];

          const response = await fetch("/api/send-dm", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user: currentUser,
              message: messageTemplate,
              settings: {
                interval: {
                  min: settings.interval.min,
                  max: settings.interval.max
                },
                dailyLimit: settings.dailyLimit,
                followBeforeDM: settings.followBeforeDM
              },
              currentSendCount: dailySendCount
            }),
            signal: abortControllerRef.current.signal
          });

          const data = await response.json();
          
          if (data.success) {
            dailySendCount++;
            localStorage.setItem('dailySendCount', dailySendCount.toString());
            setLogs(prev => [
              ...prev, 
              `${userId} へのDM送信が成功しました`,
              `残り送信可能数: ${settings.dailyLimit - dailySendCount}件`
            ]);
            await updateUser(userId, { status: data.status });
          } else {
            // throw new Error(data.error || "DM送信に失敗しました");
            setLogs(prev => [...prev, `${userId}: ${data.error}`]);
            await updateUser(userId, { status: data.status });
          }

          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error: unknown) {
          if (error instanceof Error && error.name === 'AbortError') {
            throw error;
          }
          
          console.error(`Failed to send DM to ${userId}:`, error);
          const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
          setLogs(prev => [...prev, `${userId} へのDM送信が失敗: ${errorMessage}`]);
          await updateUser(userId, { status: "error" });
        }
      }

    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log("送信処理が停止されました");
      } else {
        console.error("DM送信プロセス全体でエラーが発生:", error);
        const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
        setLogs(prev => [...prev, `DM送信処理でエラーが発生: ${errorMessage}`]);
      }
    } finally {
      setIsSending(false);
      const currentCount = parseInt(localStorage.getItem('dailySendCount') || '0');
      setLogs(prev => [
        ...prev, 
        "DM送信処理が完了しました",
        `本日の送信数: ${currentCount}/${settings.dailyLimit}件`
      ]);
    }
  };

  async function handleClear() {
    if (confirm("すべてのユーザーデータを削除してもよろしいですか？")) {
      await clearAllUsers();
      setLogs((prev) => [...prev, "すべてのユーザーデータを削除しました"]);
    }
  }

  const handleDebug = () => {
    const debugUsers: User[] = [
      {
        userId: "user1",
        name: "山田太郎（営業部）",
        nickname: "山田太郎",
        profile:
          "営業部で10年以上の経験があります。主にIT企業向けの営業を担当しており、新規開拓から既存顧客のフォローまで幅広く対応しています。趣味は読書とゴルフです。休日は家族と過ごすことが多く、時々ゴルフに行くこともあります。よろしくお願いします。",
        status: "pending",
        isSend: false,
      },
      {
        userId: "user2",
        name: "鈴木花子|デザイナー",
        nickname: "鈴木花子",
        profile:
          "UIデザインとUXデザインを専門としています。これまでに100以上のWebサイトやアプリのデザインに携わってきました。デザインの傍ら、若手デザイナーの育成にも力を入れています。最近はアクセシビリティにも注目しています。",
        status: "pending",
        isSend: false,
      },
      {
        userId: "user3",
        name: "佐藤一郎@エンジニア",
        nickname: "佐藤一郎",
        profile:
          "フルスタックエンジニアとして活動中。フロントエンドはReact、バックエンドはNode.jsを主に使用しています。最近はAIやブロックチェーンにも興味があり、個人開発でいくつかプロジェクトを進めています。",
        status: "pending",
        isSend: false,
      },
      {
        userId: "user4",
        name: "田中企画",
        nickname: "田中企画",
        profile:
          "Webサービスの企画・開発に携わって8年目です。ユーザー目線を大切にした企画立案を心がけています。最近は特にBtoBのSaaSプロダクトの企画に注力しており、市場調査から要件定義まで担当しています。",
        status: "pending",
        isSend: false,
      },
    ];
    addUsers(debugUsers);
    setLogs((prev) => [...prev, "デバッグユーザーを追加しました"]);
  };

  const handleImportClick = () => {
    if (users.length > 0) {
      if (confirm("既存のデータは全て削除されます。CSVをインポートしますか？")) {
        fileInputRef.current?.click();
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await clearAllUsers();
      
      const users = await importFromCsv(file);
      addUsers(users);
      
      setLogs(prev => [
        ...prev, 
        "既存のデータを削除しました",
        `${users.length}件のユーザーを読み込みました`
      ]);
    } catch (error) {
      console.error('CSVインポートエラー:', error);
      setLogs(prev => [...prev, 'CSVの読み込みに失敗しました']);
    }
    
    event.target.value = '';
  };

  const launchChromeHandler = async () => {
    try {
      const result = await handleLaunchChrome();
      if (result.success) {
        setLogs(prev => [...prev, "Chromeの起動に成功しました"]);
      } else {
        setLogs(prev => [...prev, `Chromeの起動に失敗しました: ${result.error}`]);
      }
    } catch (error) {
      console.error('Failed to launch Chrome:', error);
      setLogs(prev => [...prev, "Chromeの起動中にエラーが発生しました"]);
    }
  };



  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      maxWidth: '100vw',
      overflow: 'hidden'
    }}>
      <Header />

      <Box component="main" sx={{ 
        flexGrow: 1, 
        p: 4,
        overflowY: 'auto',
        overflowX: 'hidden'
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2 
        }}>
          <Box sx={{ 
            display: 'flex', 
            gap: 1,
            alignItems: 'center' 
          }}>
            <IconButton
              onClick={() => setIsSettingsOpen(true)}
              color="primary"
              size="large"
            >
              <SettingsIcon />
            </IconButton>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<LaunchIcon />}
              onClick={launchChromeHandler}
              size="small"
            >
              Chrome起動
            </Button>

          </Box>

          <Box sx={{ 
            display: 'flex', 
            gap: 1 
          }}>
            <input
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleImportCSV}
            />
            <Button
              variant="contained"
              onClick={handleImportClick}
              disabled={isLoading}
              startIcon={<DownloadIcon />}
            >
              CSVインポート
            </Button>
            <Button
              variant="contained"
              onClick={handleExtract}
              disabled={isLoading}
              startIcon={<UploadIcon />}
            >
              抽出
            </Button>
            <Button
              variant="contained"
              color={isSending ? "error" : "success"}
              startIcon={isSending ? <StopIcon /> : <SendIcon />}
              onClick={isSending ? handleStop : handleSend}
              disabled={isLoading || users.length === 0}
            >
              {isSending ? "停止" : "送信"}
            </Button>
          </Box>
        </Box>

        {users.length > 0 ? (
          <DataTable data={users} onUserUpdate={updateUser} />
        ) : (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            {isLoading ? "データを取得中..." : "ユーザーデータはまだありません"}
          </Box>
        )}

        <Grid container spacing={3} sx={{ mt: 3 }}>
          <Grid item xs={6}>
            <Paper
              elevation={1}
              sx={{
                p: 3,
                height: "100%",
              }}
            >
              <Typography variant="h6" sx={{ mb: 2 }}>
                ログ
              </Typography>
              <LogArea logs={logs} />
            </Paper>
          </Grid>

          <Grid item xs={6}>
            <Paper
              elevation={1}
              sx={{
                p: 3,
                height: "100%",
              }}
            >
              <Typography variant="h6" sx={{ mb: 2 }}>
                実績
              </Typography>
              <List>
                <ListItem>
                  <Typography>送信数: {stats.success}</Typography>
                </ListItem>
                <Divider />
                <ListItem>
                  <Typography>失敗数: {stats.error}</Typography>
                </ListItem>
                <Divider />
                <ListItem>
                  <Typography>フォロー済: {stats.followed}</Typography>
                </ListItem>
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "space-between",
        p: 2,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        zIndex: 1
      }}>
        <Button variant="contained" color="error" onClick={handleClear}>
          クリア
        </Button>
        <Button variant="outlined" color="primary" onClick={handleDebug}>
          デバッグ
        </Button>
      </Box>

      <Footer />

      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        settings={settings}
        onSave={updateSettings}
        onReset={resetSettings}
      />
    </Box>
  );
}
