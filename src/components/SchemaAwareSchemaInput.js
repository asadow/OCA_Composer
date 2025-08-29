import React, { useState } from "react";
import { TextField, Typography, Box, Tooltip } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { useTranslation } from "react-i18next";
import CustomPalette from "../constants/customPalette";

/**
 * Schema-Aware Schema Input Component
 * 
 * A simplified version of SchemaInput that works with the multi-schema architecture.
 */
export default function SchemaAwareSchemaInput({
  currentLanguage,
  setCurrentLanguage,
  schemaName,
  schemaDescription,
  onSchemaNameChange,
  onSchemaDescriptionChange,
  editingSchemaId
}) {
  const { t } = useTranslation();

  const handleNameChange = (e) => {
    onSchemaNameChange(e.target.value);
  };

  const handleDescriptionChange = (e) => {
    onSchemaDescriptionChange(e.target.value);
  };

  return (
    <Box sx={{ mr: 4, width: "22rem" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          mt: 1,
          height: "10.5rem",
        }}
      >
        {/* Schema Name */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 1
          }}
        >
          <Typography
            sx={{
              fontSize: 16,
              fontWeight: "bold",
              color: CustomPalette.PRIMARY
            }}
          >
            {t("Name of Schema")}
          </Typography>
          <Box sx={{ marginLeft: "0.5rem", color: CustomPalette.GREY_600 }}>
            <Tooltip
              title={t("The name of the schema being created or edited")}
              placement="right"
              arrow
            >
              <HelpOutlineIcon sx={{ fontSize: 15 }} />
            </Tooltip>
          </Box>
        </Box>
        
        <TextField
          id="schema-name"
          variant="outlined"
          size="small"
          value={schemaName}
          onChange={handleNameChange}
          placeholder={t("Enter schema name")}
          sx={{
            mb: 2,
            "& .MuiOutlinedInput-root": {
              "& fieldset": {
                borderColor: CustomPalette.GREY_400,
              },
              "&:hover fieldset": {
                borderColor: CustomPalette.PRIMARY,
              },
              "&.Mui-focused fieldset": {
                borderColor: CustomPalette.PRIMARY,
              },
            },
          }}
        />

        {/* Schema Description */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 1
          }}
        >
          <Typography
            sx={{
              fontSize: 16,
              fontWeight: "bold",
              color: CustomPalette.PRIMARY
            }}
          >
            {t("Description")}
          </Typography>
          <Box sx={{ marginLeft: "0.5rem", color: CustomPalette.GREY_600 }}>
            <Tooltip
              title={t("A description of what this schema represents")}
              placement="right"
              arrow
            >
              <HelpOutlineIcon sx={{ fontSize: 15 }} />
            </Tooltip>
          </Box>
        </Box>
        
        <TextField
          id="schema-description"
          variant="outlined"
          size="small"
          multiline
          rows={3}
          value={schemaDescription}
          onChange={handleDescriptionChange}
          placeholder={t("Enter schema description")}
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": {
                borderColor: CustomPalette.GREY_400,
              },
              "&:hover fieldset": {
                borderColor: CustomPalette.PRIMARY,
              },
              "&.Mui-focused fieldset": {
                borderColor: CustomPalette.PRIMARY,
              },
            },
          }}
        />
      </Box>
    </Box>
  );
}



