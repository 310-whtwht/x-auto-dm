import { Box, Container, Typography } from "@mui/material";

export function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        bgcolor: "#333",
        color: "white",
        borderTop: 1,
        borderColor: "divider",
        marginTop: "60px", // クリア/デバッグボタンの高さ分のマージン
      }}
    >
      <Container>
        <Typography variant="body2" align="center">
          &copy; 2025 X Auto DM
        </Typography>
      </Container>
    </Box>
  );
}
