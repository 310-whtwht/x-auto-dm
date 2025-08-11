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
        <Box sx={{ pt: 2, pb: 1 }}>
          {errors.length > 0 && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  抽出設定
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
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                送信設定
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  送信間隔（秒）
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  label="最小"
                  size="small"
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
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  &nbsp;
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  label="最大"
                  size="small"
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
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  1日の送信上限
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  label="送信上限（件）"
                  size="small"
                  inputProps={{ min: 1, max: 500 }}
                  value={localSettings.dailyLimit}
                  onChange={(e) =>
                    handleDailyLimitChange(Number(e.target.value))
                  }
                  error={
                    localSettings.dailyLimit < 1 ||
                    localSettings.dailyLimit > 500
                  }
                  helperText="1件から500件の間で設定してください"
                />
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ mb: 3 }} />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  DM送信文言
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    ニックネームを挿入するには <code>${"${nick_name}"}</code>{" "}
                    を使用してください。
                    <br />
                    例：「<code>${"${nick_name}"}</code>さん、はじめまして！」
                  </Typography>
                  <Typography variant="body2" color="error">
                    ⚠️ 絵文字・特殊文字は使用できません。
                  </Typography>
                </Alert>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    mb: 2,
                  }}
                >
                  <Button
                    variant="outlined"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={handleAddMessage}
                    disabled={localSettings.messages.length >= 5}
                    size="small"
                  >
                    文言を追加
                  </Button>
                </Box>
                {localSettings.messages.map((message, index) => (
                  <Box
                    key={index}
                    sx={{
                      mb: 3,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1,
                    }}
                  >
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label={`送信文言 ${index + 1}`}
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
                      <Tooltip title="この文言を削除">
                        <IconButton
                          onClick={() => handleDeleteMessage(index)}
                          color="error"
                          sx={{ mt: 1 }}
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                ))}
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  その他の設定
                </Typography>
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
              </Box>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions
        sx={{
          display: "flex",
          justifyContent: "space-between",
          px: 3,
          pb: 3,
          pt: 3,
          borderTop: 1,
          borderColor: "divider",
          bgcolor: (theme) =>
            theme.palette.mode === "dark"
              ? "rgba(255, 255, 255, 0.02)"
              : "rgba(0, 0, 0, 0.02)",
        }}
      >
        <Button
          variant="outlined"
          color="error"
          onClick={handleReset}
          size="large"
        >
          設定クリア
        </Button>
        <Button variant="contained" onClick={handleSave} size="large">
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
