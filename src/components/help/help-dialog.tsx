"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Stack,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";

type HelpDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">使用方法</Typography>
            <Typography variant="caption">※１〜3の順番で操作してください</Typography>
          </Stack>
          <IconButton onClick={() => onOpenChange(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, color: "primary.main" }}>
            ①X(Twitter)へのログイン手順：
          </Typography>
          <Typography component="div" sx={{ mb: 1 }}>
            1. ホーム画面の「Chrome起動」ボタンをクリックしてブラウザを起動
          </Typography>
          <Typography component="div">
            2. 起動したブラウザでX(Twitter)に手動でログインしてください
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, color: "primary.main" }}>
            ②ユーザー提出手順：
          </Typography>
          <Typography component="div" sx={{ mb: 1 }}>
            1. 設定画面で、フォロワーURLを設定
          </Typography>
          <Typography component="div" sx={{ mb: 1 }}>
            2. ホーム画面の「抽出」ボタンをクリックすると抽出処理が開始します
          </Typography>
          <Typography component="div">
            3. 抽出処理が終わるとデスクトップ画面にcsvファイルとして吐き出されます
          </Typography>
        </Box>

        <Box>
          <Typography variant="h6" sx={{ mb: 2, color: "primary.main" }}>
            ③DM処理手順：
          </Typography>
          <Typography component="div" sx={{ mb: 1 }}>
            1. ホーム画面の「CSVインポート」ボタンを押して、②で作成されたcsvファイルを取り込みます
          </Typography>
          <Typography component="div" sx={{ mb: 2 }}>
            2. 「送信ボタン」を押すと送信処理が開始します
          </Typography>
          <Typography component="div" sx={{ 
            backgroundColor: "action.hover",
            p: 2,
            borderRadius: 1
          }}>
            ※ステータスがpending、followed、errorのアカウントが送信対象となります。
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}