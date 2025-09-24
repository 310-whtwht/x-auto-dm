"use client";

import { User } from "@/types";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Checkbox, Box, Tooltip, Typography, Link } from "@mui/material";

interface DataTableProps {
  data: User[];
  onUserUpdate: (userId: string, updates: Partial<User>) => void;
}

export function DataTable({ data, onUserUpdate }: DataTableProps) {
  // データが変更されたときにselectAllの状態を更新
  const selectAll = data.length > 0 && data.every((user) => user.isSend);

  const handleCheckboxChange = (uniqueId: string) => {
    const user = data.find((u) => u.uniqueId === uniqueId);
    if (user) {
      onUserUpdate(uniqueId, { isSend: !user.isSend });
    }
  };

  const handleSelectAll = () => {
    const newValue = !selectAll;
    data.forEach((user) => {
      onUserUpdate(user.uniqueId, { isSend: newValue });
    });
  };

  const columns: GridColDef[] = [
    {
      field: "select",
      headerName: "送信対象",
      width: 100,
      renderHeader: () => (
        <Checkbox
          checked={selectAll}
          indeterminate={data.some((user) => user.isSend) && !selectAll}
          onChange={handleSelectAll}
        />
      ),
      renderCell: (params) => (
        <Checkbox
          checked={params.row.isSend}
          onChange={() => handleCheckboxChange(params.row.uniqueId)}
        />
      ),
    },
    {
      field: "userId",
      headerName: "User ID",
      width: 200,
      renderCell: (params) => {
        const userId = params.value as string;
        const xUrl = `https://x.com/${userId.replace("@", "")}`;
        return (
          <Link
            href={xUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              textDecoration: "none",
              "&:hover": {
                textDecoration: "underline",
              },
            }}
          >
            {params.value}
          </Link>
        );
      },
    },
    {
      field: "nickname",
      headerName: "ニックネーム",
      width: 150,
      editable: true,
      preProcessEditCellProps: (params) => {
        const hasError = params.props.value.trim() === "";
        return { ...params.props, error: hasError };
      },
    },
    {
      field: "name",
      headerName: "Name",
      width: 150,
    },
    {
      field: "profile",
      headerName: "Profile",
      width: 200,
      flex: 1,
      renderCell: (params) => {
        const profile = params.value as string;
        return (
          <Tooltip
            title={
              <Typography sx={{ p: 1, maxWidth: 400 }}>{profile}</Typography>
            }
            arrow
            placement="top-start"
            enterDelay={500}
            leaveDelay={0}
            onClose={() => {}}
            componentsProps={{
              tooltip: {
                sx: {
                  bgcolor: "background.paper",
                  color: "text.primary",
                  boxShadow: 1,
                  "& .MuiTooltip-arrow": {
                    color: "background.paper",
                  },
                  maxWidth: 400,
                },
              },
            }}
          >
            <Box
              sx={{
                width: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              {profile}
            </Box>
          </Tooltip>
        );
      },
    },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: (params) => {
        const status = params.value as string;
        const color = getStatusColor(status);
        return (
          <Box
            sx={{
              backgroundColor: color.bg,
              color: color.text,
              px: 1,
              py: 0.5,
              borderRadius: 1,
              fontSize: "0.875rem",
            }}
          >
            {status}
          </Box>
        );
      },
    },
  ];

  const rows = data.map((user) => ({
    id: user.uniqueId,
    ...user,
  }));

  return (
    <Box sx={{ height: 400, width: "100%" }}>
      <DataGrid
        rows={rows}
        columns={columns}
        disableRowSelectionOnClick
        processRowUpdate={(updatedRow, originalRow) => {
          onUserUpdate(updatedRow.uniqueId, {
            nickname: updatedRow.nickname,
            isSend: updatedRow.isSend,
          });
          return updatedRow;
        }}
        onProcessRowUpdateError={(error) => {
          console.error("Error updating row:", error);
        }}
      />
    </Box>
  );
}

function getStatusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case "success":
      return { bg: "#e8f5e9", text: "#2e7d32" };
    case "error":
      return { bg: "#ffebee", text: "#c62828" };
    case "skipped":
      return { bg: "#fff3e0", text: "#ef6c00" };
    default:
      return { bg: "#f5f5f5", text: "#616161" };
  }
}
