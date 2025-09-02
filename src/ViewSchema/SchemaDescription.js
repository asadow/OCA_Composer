import React, { useContext } from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Context } from "../App";
import { useMultiSchema } from "../context/MultiSchemaContext";

export default function SchemaDescription({ currentLanguage }) {
  const { t } = useTranslation();
  const { schemaDescription, divisionGroup } = useContext(Context);
  const { activeSchemaId, getSchemaState } = useMultiSchema();

  // Prefer current schema state's metadata if available
  const schemaState = activeSchemaId ? getSchemaState(activeSchemaId) : null;
  const currentMeta = schemaState?.metadata || {};
  const metaForLang = currentMeta; // metadata stores display names (English/French)

  const schemaName =
    metaForLang?.name || schemaDescription?.[currentLanguage]?.name || t("Unknown");
  const schemaDescriptionText =
    metaForLang?.description ||
    schemaDescription?.[currentLanguage]?.description ||
    t("No description available");
  const classification =
    divisionGroup?.group || divisionGroup?.division || t("Not classified");

  return (
    <Box>
      <Typography
        sx={{
          fontSize: 15,
          fontWeight: "bold",
          textAlign: "left",
          margin: "1rem 0 0.5rem 0"
        }}
      >
        {t("Name of Schema")}
      </Typography>
      <Box
        sx={{
          textAlign: "left",
          width: "30rem",
          overflowY: "auto"
        }}
      >
        {schemaName}
      </Box>
      <Typography
        sx={{
          fontSize: 15,
          fontWeight: "bold",
          textAlign: "left",
          margin: "1rem 0 0.5rem 0"
        }}
      >
        {t("Description")}
      </Typography>
      <Box
        sx={{
          textAlign: "left",
          width: "30rem"
        }}
      >
        {schemaDescriptionText}
      </Box>
      <Typography
        sx={{
          fontSize: 15,
          fontWeight: "bold",
          textAlign: "left",
          margin: "1rem 0 0.5rem 0"
        }}
      >
        {t("Classification")}
      </Typography>
      <Box
        sx={{
          textAlign: "left",
          width: "30rem",
          overflowY: "auto"
        }}
      >
        {classification}
      </Box>
    </Box>
  );
}
