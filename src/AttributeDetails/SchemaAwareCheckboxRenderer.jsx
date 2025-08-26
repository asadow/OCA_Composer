import React from "react";
import { Checkbox } from "@mui/material";

const SchemaAwareCheckboxRenderer = ({ value, data, onRequiredChange, onListChange }) => {
  const handleChange = (event) => {
    const checked = event.target.checked;
    
    if (onRequiredChange) {
      onRequiredChange(data?.Attribute, checked);
    }
    
    if (onListChange) {
      onListChange(data?.Attribute, checked);
    }
  };

  return (
    <Checkbox
      checked={value || false}
      onChange={handleChange}
      size="small"
      sx={{ 
        padding: "2px",
        "& .MuiSvgIcon-root": {
          fontSize: "1.2rem"
        }
      }}
    />
  );
};

export default SchemaAwareCheckboxRenderer;



