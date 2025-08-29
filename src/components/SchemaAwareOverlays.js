import React, { useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Box, Typography, Tooltip } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { Context } from "../App";
import { useMultiSchema } from "../context/MultiSchemaContext";
import CustomPalette from "../constants/customPalette";
import BackNextSkeleton from "./BackNextSkeleton";
import Overlays from "../Overlays/Overlays";
import { getSchemaDataById } from "../SchemaVisualization/dataUtils";

/**
 * Schema-Aware Overlays Component
 * 
 * This component handles overlays configuration for a specific schema.
 */
export default function SchemaAwareOverlays({
  pageBack,
  pageForward
}) {
  const { t } = useTranslation();
  
  // Original context for navigation and global state
  const {
    setCharacterEncodingRowData,
    setFormatRuleRowData,
    setCardinalityData,
    setAttributesWithLists,
    setSavedEntryCodes,
    OCAPackage
  } = useContext(Context);

  // Multi-schema context
  const {
    activeSchemaId,
    getSchemaState,
    updateSchemaState
  } = useMultiSchema();

  // Get current schema state
  const currentSchemaState = getSchemaState(activeSchemaId);
  const attributes = currentSchemaState?.attributes || [];
  const overlays = currentSchemaState?.overlays || {};

  // Load schema-specific overlay data and sync with global context
  useEffect(() => {
    if (!activeSchemaId || !OCAPackage) {
      return;
    }

    try {
      // Get schema data for the active schema
      const schemaData = getSchemaDataById(OCAPackage, activeSchemaId);
      
      if (schemaData) {
        const attributesList = Object.keys(schemaData.attributes || {});

        // Load character encoding data
        if (schemaData.overlays?.character_encoding) {
          const charEncodingData = attributesList.map((attrName) => ({
            Attribute: attrName,
            ...schemaData.overlays.character_encoding.attribute_character_encoding?.[attrName]
          }));
          setCharacterEncodingRowData(charEncodingData);
        }

        // Load format rule data
        if (schemaData.overlays?.format) {
          const formatData = attributesList.map((attrName) => ({
            Attribute: attrName,
            Type: schemaData.attributes[attrName] || "",
            FormatText: schemaData.overlays.format.attribute_formats?.[attrName] || ""
          }));
          setFormatRuleRowData(formatData);
        }

        // Load cardinality data
        if (schemaData.overlays?.cardinality) {
          const cardinalityData = attributesList.map((attrName) => ({
            Attribute: attrName,
            ...schemaData.overlays.cardinality.attribute_cardinality?.[attrName]
          }));
          setCardinalityData(cardinalityData);
        }

        // Load entry codes and set attributes with lists
        if (schemaData.overlays?.entry) {
          const entryCodes = {};
          const attributesWithEntries = new Set();

          Object.keys(schemaData.overlays.entry).forEach((lang) => {
            const entryOverlay = schemaData.overlays.entry[lang];
            if (Array.isArray(entryOverlay)) {
              entryOverlay.forEach((entry) => {
                if (!entryCodes[entry.attribute_name]) {
                  entryCodes[entry.attribute_name] = [];
                }
                entryCodes[entry.attribute_name].push({
                  Code: entry.entry_code,
                  [lang]: entry.entry_text || ""
                });
                attributesWithEntries.add(entry.attribute_name);
              });
            } else if (entryOverlay && typeof entryOverlay === "object") {
              Object.keys(entryOverlay).forEach((attrName) => {
                const entries = entryOverlay[attrName];
                if (Array.isArray(entries)) {
                  entries.forEach((entry) => {
                    if (!entryCodes[attrName]) {
                      entryCodes[attrName] = [];
                    }
                    entryCodes[attrName].push({
                      Code: entry.entry_code,
                      [lang]: entry.entry_text || ""
                    });
                    attributesWithEntries.add(attrName);
                  });
                }
              });
            }
          });

          setSavedEntryCodes(entryCodes);
          setAttributesWithLists(Array.from(attributesWithEntries));
        }
      }
    } catch (error) {
      console.error("Error loading schema overlay data:", error);
    }
  }, [activeSchemaId, OCAPackage, setCharacterEncodingRowData, setFormatRuleRowData, setCardinalityData, setAttributesWithLists, setSavedEntryCodes]);

  // Handle overlay updates
  const handleOverlayUpdate = (overlayType, data) => {
    const updatedOverlays = { ...overlays };
    updatedOverlays[overlayType] = data;
    
    updateSchemaState(activeSchemaId, {
      overlays: updatedOverlays
    });
  };

  // Navigation handlers
  const handlePageBack = () => {
    pageBack();
  };

  const handlePageForward = () => {
    pageForward();
  };

  return (
    <BackNextSkeleton
      isBack
      pageBack={handlePageBack}
      isForward
      pageForward={handlePageForward}
    >
      {/* Schema indicator */}
      <Box sx={{ mb: 2, p: 2, bgcolor: "primary.light", borderRadius: 1 }}>
        <Typography variant="h6" color="white">
          {t("Editing Schema")}: {currentSchemaState?.metadata?.name || activeSchemaId || t("New Schema")}
        </Typography>
        <Typography variant="body2" color="white">
          {t("Overlays Configuration")}
        </Typography>
      </Box>

      {/* Overlays Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          marginTop: 2,
          marginBottom: 2
        }}
      >
        <Typography
          sx={{
            fontSize: 22,
            fontWeight: "bold",
            color: CustomPalette.PRIMARY
          }}
        >
          {t("Overlays")}
        </Typography>
        <Box sx={{ marginLeft: "1rem", color: CustomPalette.GREY_600 }}>
          <Tooltip
            title={t("Configure additional features and constraints for your schema")}
            placement="right"
            arrow
          >
            <HelpOutlineIcon sx={{ fontSize: 15 }} />
          </Tooltip>
        </Box>
      </Box>

      {/* Overlays Component */}
      <Overlays
        attributes={attributes}
        overlays={overlays}
        onOverlayUpdate={handleOverlayUpdate}
        isSchemaAware
      />
    </BackNextSkeleton>
  );
}
