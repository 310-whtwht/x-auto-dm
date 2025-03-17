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
} from "@mui/icons-material";

export function Header() {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
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
        <Tooltip title="リロード">
          <IconButton color="inherit" onClick={handleRefresh} size="large">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
