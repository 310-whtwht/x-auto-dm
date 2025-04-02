import { Box, Container, Typography } from "@mui/material";

export function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        mt: "auto",
        py: 3,
        bgcolor: "#333",
        color: "white",
        borderTop: 1,
        borderColor: "divider",
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
