import { useEffect, useRef } from "react";
import { Box, Paper, Typography } from "@mui/material";

interface LogAreaProps {
  logs: string[];
}

export function LogArea({ logs }: LogAreaProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // 新しいログが追加されたら自動スクロール
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        mt: 2,
        height: "300px", // 固定高さ
        overflow: "auto", // スクロール可能に
        backgroundColor: "#1a1a1a", // 暗めの背景
        color: "#fff", // 白テキスト
        fontFamily: "monospace",
        "&::-webkit-scrollbar": {
          width: "8px",
        },
        "&::-webkit-scrollbar-track": {
          background: "#2d2d2d",
        },
        "&::-webkit-scrollbar-thumb": {
          background: "#888",
          borderRadius: "4px",
          "&:hover": {
            background: "#555",
          },
        },
      }}
      ref={logContainerRef}
    >
      {logs.length === 0 ? (
        <Typography sx={{ color: "#666" }}>ログはまだありません</Typography>
      ) : (
        logs.map((log, index) => (
          <Typography
            key={index}
            variant="body2"
            sx={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              mb: 0.5,
              fontSize: "0.875rem",
              lineHeight: 1.5,
              color: log.includes("エラー")
                ? "#ff6b6b"
                : log.includes("成功")
                ? "#69db7c"
                : log.startsWith("サーバーサイド:")
                ? "#4dabf7"
                : "#fff",
            }}
          >
            {log}
          </Typography>
        ))
      )}
    </Paper>
  );
}
