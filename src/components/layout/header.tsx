"use client";

import { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Email as EmailIcon,
  Refresh as RefreshIcon,
  Help as HelpIcon,
} from "@mui/icons-material";
import { HelpDialog } from "@/components/help/help-dialog";

export function Header() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <>
      <AppBar
        position="static"
        sx={{
          bgcolor: "#333",
          color: "white", // テキストを白に
        }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <EmailIcon sx={{ mr: 1 }} />
            <Typography variant="h6" component="h1">
              X Auto DM
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton
              color="inherit"
              onClick={() => setIsHelpOpen(true)}
              aria-label="ヘルプ"
            >
              <HelpIcon />
            </IconButton>
            <Tooltip title="リロード">
              <IconButton color="inherit" onClick={handleRefresh} size="large">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <HelpDialog open={isHelpOpen} onOpenChange={setIsHelpOpen} />
    </>
  );
}
