"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Checkbox,
  FormControlLabel,
  Button,
  Grid,
  Box,
  IconButton,
  DialogActions,
  Typography,
  Divider,
  Alert,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { Settings } from "@/types";
import { useState, useEffect } from "react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Settings;
  onSave: (settings: Settings) => void;
  onReset: () => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onSave,
  onReset,
}: SettingsDialogProps) {
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [errors, setErrors] = useState<string[]>([]);
  const [urlError, setUrlError] = useState<string>("");

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleReset = () => {
    onReset();
    onOpenChange(false);
  };

  const handleAddMessage = () => {
    if (localSettings.messages.length >= 5) {
      setErrors(["メッセージは最大5つまでです"]);
      return;
    }
    setLocalSettings({
      ...localSettings,
      messages: [...localSettings.messages, ""],
    });
  };

  const handleDeleteMessage = (index: number) => {
    const newMessages = localSettings.messages.filter((_, i) => i !== index);
    setLocalSettings({
      ...localSettings,
      messages: newMessages.length > 0 ? newMessages : [""],
    });
  };

  const validateSettings = () => {
    const newErrors: string[] = [];

    // 送信間隔のバリデーション
    if (localSettings.interval.min < 5 || localSettings.interval.min > 7200) {
      newErrors.push("最小送信間隔は5秒から7200秒の間で設定してください");
    }
    if (localSettings.interval.max < 5 || localSettings.interval.max > 7200) {
      newErrors.push("最大送信間隔は5秒から7200秒の間で設定してください");
    }
    if (localSettings.interval.min > localSettings.interval.max) {
      newErrors.push(
        "最小送信間隔は最大送信間隔より小さい値を設定してください"
      );
    }

    // 送信上限のバリデーション
    if (localSettings.dailyLimit < 1) {
      newErrors.push("1日の送信上限は1件以上で設定してください");
    }
    if (localSettings.dailyLimit > 500) {
      // 安全のため上限を設定
      newErrors.push("1日の送信上限は500件以下で設定してください");
    }

    // メッセージのバリデーション（既存）
    const emptyMessages = localSettings.messages.some(
      (msg) => msg.trim() === ""
    );
    if (emptyMessages) {
      newErrors.push("未入力のDM送信文言があります");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleIntervalChange = (type: "min" | "max", value: number) => {
    const newInterval = {
      ...localSettings.interval,
      [type]: value,
    };

    // 入力値の範囲チェック
    if (value < 5 || value > 7200) {
      return;
    }

    // 最小値が最大値を超えないようにチェック
    if (type === "min" && value > localSettings.interval.max) {
      return;
    }
    if (type === "max" && value < localSettings.interval.min) {
      return;
    }

    setLocalSettings({
      ...localSettings,
      interval: newInterval,
    });
  };

  const handleDailyLimitChange = (value: number) => {
    if (value < 1 || value > 500) {
      return;
    }

    setLocalSettings({
      ...localSettings,
      dailyLimit: value,
    });
  };

  // URLバリデーション関数
  const validateFollowerUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      // X(Twitter)のフォロワーURLの形式チェック
      const isValidFormat = /^https?:\/\/(twitter|x)\.com\/[a-zA-Z0-9_]+\/followers\/?$/.test(
        url
      );

      if (!isValidFormat) {
        setUrlError(
          "正しいフォロワーURLを入力してください（例：https://x.com/username/followers）"
        );
        return false;
      }

      setUrlError("");
      return true;
    } catch {
      setUrlError("有効なURLを入力してください");
      return false;
    }
  };

  // URL変更時のハンドラー
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setLocalSettings({
      ...localSettings,
      followerUrl: newUrl,
    });
    if (newUrl) {
      validateFollowerUrl(newUrl);
    } else {
      setUrlError("");
    }
  };

  const handleSave = () => {
    if (
      localSettings.followerUrl &&
      !validateFollowerUrl(localSettings.followerUrl)
    ) {
      return;
    }
    if (validateSettings()) {
      onSave(localSettings);
      onOpenChange(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        設定
        <IconButton
          onClick={() => onOpenChange(false)}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {errors.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </Alert>
          )}

          <Grid container spacing={3}>

            <Grid item xs={12}>
              <Typography
                variant="subtitle1"
                sx={{ mb: 2, fontWeight: "bold" }}
              >
                フォロワー情報
              </Typography>
              <TextField
                fullWidth
                label="フォロワーURL"
                placeholder="https://x.com/{username}/followers"
                value={localSettings.followerUrl}
                onChange={handleUrlChange}
                error={!!urlError}
                helperText={urlError}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="送信間隔（最小）(秒)"
                inputProps={{ min: 5, max: 7200 }}
                value={localSettings.interval.min}
                onChange={(e) =>
                  handleIntervalChange("min", Number(e.target.value))
                }
                error={
                  localSettings.interval.min < 5 ||
                  localSettings.interval.min > 7200
                }
                helperText="5秒から7200秒の間で設定してください"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="送信間隔（最大）(秒)"
                inputProps={{ min: 5, max: 7200 }}
                value={localSettings.interval.max}
                onChange={(e) =>
                  handleIntervalChange("max", Number(e.target.value))
                }
                error={
                  localSettings.interval.max < 5 ||
                  localSettings.interval.max > 7200 ||
                  localSettings.interval.max < localSettings.interval.min
                }
                helperText={
                  localSettings.interval.max < localSettings.interval.min
                    ? "最大値は最小値より大きい値を設定してください"
                    : "5秒から7200秒の間で設定してください"
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="1日の送信上限(件)"
                inputProps={{ min: 1, max: 500 }}
                value={localSettings.dailyLimit}
                onChange={(e) => handleDailyLimitChange(Number(e.target.value))}
                error={
                  localSettings.dailyLimit < 1 || localSettings.dailyLimit > 500
                }
                helperText="1件から500件の間で設定してください"
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                  DM送信文言
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  ニックネームを挿入するには ${"${nick_name}"}{" "}
                  を使用してください。
                  <br />
                  例：「${"${nick_name}"}さん、はじめまして！」
                </Typography>
                <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                  ⚠️絵文字・特殊文字は使用できません。
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Tooltip title="DM送信文言を追加">
                  <IconButton
                    onClick={handleAddMessage}
                    disabled={localSettings.messages.length >= 5}
                  >
                    <AddCircleOutlineIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              {localSettings.messages.map((message, index) => (
                <Box
                  key={index}
                  sx={{
                    mb: 2,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1, // アイコンとテキストエリアの間隔
                  }}
                >
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label={`DM送信文言 ${index + 1}`}
                    value={message}
                    onChange={(e) => {
                      const newMessages = [...localSettings.messages];
                      newMessages[index] = e.target.value;
                      setLocalSettings({
                        ...localSettings,
                        messages: newMessages,
                      });
                      setErrors([]);
                    }}
                    error={message.trim() === ""}
                    helperText={
                      message.trim() === "" ? "文言を入力してください" : ""
                    }
                  />
                  {localSettings.messages.length > 1 && (
                    <IconButton
                      onClick={() => handleDeleteMessage(index)}
                      sx={{
                        mt: 1, // テキストエリアのラベルに合わせて微調整
                      }}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={localSettings.skipExisting}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        skipExisting: e.target.checked,
                      })
                    }
                  />
                }
                label="既存DM送信済みユーザーをスキップする"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={localSettings.followBeforeDM}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        followBeforeDM: e.target.checked,
                      })
                    }
                  />
                }
                label="メッセージ画面遷移前にフォローする"
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions
        sx={{ display: "flex", justifyContent: "space-between", px: 3, pb: 3 }}
      >
        <Button variant="contained" color="error" onClick={handleReset}>
          設定クリア
        </Button>
        <Button variant="contained" onClick={handleSave}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
