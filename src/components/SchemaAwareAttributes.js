import React from "react";
import { Typography, Box, Tooltip } from "@mui/material";
import { CustomPalette } from "../constants/customPalette";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { useTranslation } from "react-i18next";

/**
 * Schema-Aware Attributes Component
 * 
 * A simplified version of Attributes that works with the multi-schema architecture.
 */
export default function SchemaAwareAttributes({
  attributesList,
  currentLanguage,
  setCurrentLanguage
}) {
  const { t } = useTranslation();

  return (
    <Box sx={{ mt: 4 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 2
        }}
      >
        <Typography
          sx={{
            fontSize: 16,
            fontWeight: "bold",
            color: CustomPalette.PRIMARY
          }}
        >
          {t("Attributes")}
        </Typography>
        <Box sx={{ marginLeft: "0.5rem", color: CustomPalette.GREY_600 }}>
          <Tooltip
            title={t("The attributes/fields that will be defined in this schema")}
            placement="right"
            arrow
          >
            <HelpOutlineIcon sx={{ fontSize: 15 }} />
          </Tooltip>
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          minHeight: "3rem",
          padding: "1rem",
          border: `1px solid ${CustomPalette.GREY_400}`,
          borderRadius: "4px",
          backgroundColor: CustomPalette.GREY_50
        }}
      >
        {attributesList.length > 0 ? (
          attributesList.map((attribute, index) => (
            <Box
              key={index}
              sx={{
                padding: "0.5rem 1rem",
                backgroundColor: CustomPalette.PRIMARY,
                color: "white",
                borderRadius: "16px",
                fontSize: "0.875rem",
                fontWeight: "500"
              }}
            >
              {attribute}
            </Box>
          ))
        ) : (
          <Typography
            sx={{
              color: CustomPalette.GREY_600,
              fontStyle: "italic"
            }}
          >
            {t("No attributes defined yet. Add attributes in the next step.")}
          </Typography>
        )}
      </Box>
    </Box>
  );
}



