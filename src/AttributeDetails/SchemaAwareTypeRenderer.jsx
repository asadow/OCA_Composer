import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { MenuItem, Select } from "@mui/material";

const SchemaAwareTypeRenderer = ({ value, data, onTypeChange }) => {
  const { t } = useTranslation();
  const [type, setType] = useState(value || "");

  const displayValues = [
    { value: "", label: "" },
    { value: "Binary", label: "Binaryfile" },
    { value: "Boolean", label: "Boolean" },
    { value: "DateTime", label: "DateTime" },
    { value: "Numeric", label: "Numeric" },
    { value: "Child Schema", label: "Child Schema" },
    { value: "Text", label: "Text" },
    { value: "Array[Binary]", label: "Array[Binaryfile]" },
    { value: "Array[Boolean]", label: "Array[Boolean]" },
    { value: "Array[DateTime]", label: "Array[DateTime]" },
    { value: "Array[Numeric]", label: "Array[Numeric]" },
    { value: "Array[Text]", label: "Array[Text]" },
    { value: "Array[Child Schema]", label: "Array[Child Schema]" }
  ];

  const handleChange = (event) => {
    const newType = event.target.value;
    setType(newType);
    if (onTypeChange && data?.Attribute) {
      onTypeChange(data.Attribute, newType);
    }
  };

  return (
    <Select
      value={type}
      onChange={handleChange}
      size="small"
      sx={{ 
        width: "100%",
        "& .MuiSelect-select": {
          padding: "4px 8px",
          fontSize: "0.875rem"
        }
      }}
    >
      {displayValues.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label ? t(option.label) : option.label}
        </MenuItem>
      ))}
    </Select>
  );
};

export default SchemaAwareTypeRenderer;



