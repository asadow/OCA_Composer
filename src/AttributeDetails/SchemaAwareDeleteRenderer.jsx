import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

const SchemaAwareDeleteRenderer = ({ data, onDelete }) => {
  const handleDelete = () => {
    if (onDelete && data?.Attribute) {
      onDelete(data.Attribute);
    }
  };

  return (
    <Tooltip title="Delete attribute">
      <IconButton
        onClick={handleDelete}
        size="small"
        sx={{
          color: "error.main",
          padding: "2px",
          "&:hover": {
            backgroundColor: "error.light",
            color: "white"
          }
        }}
      >
        <DeleteIcon sx={{ fontSize: "1.2rem" }} />
      </IconButton>
    </Tooltip>
  );
};

export default SchemaAwareDeleteRenderer;



