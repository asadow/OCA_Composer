import React, { useContext, useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Box, Typography, Tooltip } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import i18next from "i18next";
import { Context } from "../App";
import { useMultiSchema } from "../context/MultiSchemaContext";
import { CustomPalette } from "../constants/customPalette";
import { codesToLanguages } from "../constants/isoCodes";
import BackNextSkeleton from "./BackNextSkeleton";
import LanGrid from "../LanguageDetails/LanGrid";
import { getSchemaDataById } from "../SchemaVisualization/dataUtils";

/**
 * Schema-Aware Language Details Component
 * 
 * This component handles language-dependent attribute details for a specific schema.
 */
export default function SchemaAwareLanguageDetails({
  pageBack,
  pageForward
}) {
  const { t } = useTranslation();
  
  // Original context for navigation and languages
  const {
    languages,
    setLanAttributeRowData,
    OCAPackage
  } = useContext(Context);

  // Multi-schema context
  const {
    activeSchemaId,
    getSchemaState
  } = useMultiSchema();

  // Local state for UI
  const gridRef = useRef();
  const refContainer = useRef();

  // Language setup (copied from original LanguageDetails)
  const languageIndex = languages.findIndex(
    (item) => codesToLanguages?.[i18next.language] === item
  );
  const filteredLanguages = [...languages];
  if (languageIndex !== -1 && languageIndex !== 0) {
    const removedLanguage = filteredLanguages.splice(languageIndex, 1);
    filteredLanguages.unshift(removedLanguage[0]);
  }
  const [currentLanguage] = useState(filteredLanguages[0]);

  // Get current schema state
  const currentSchemaState = getSchemaState(activeSchemaId);

  // Load schema-specific language data and sync with global context
  useEffect(() => {
    if (!activeSchemaId || !OCAPackage) {
      return;
    }

    try {
      // Get schema data for the active schema
      const schemaData = getSchemaDataById(OCAPackage, activeSchemaId);
      
      if (schemaData) {
        // Determine attributes to display
        const attributes = (Array.isArray(currentSchemaState?.attributes)
          ? currentSchemaState.attributes.map((a) => a.Attribute)
          : Object.keys(schemaData.attributes || {}));

        // Normalize label overlays to an object keyed by language
        const labelOverlays = schemaData.overlays?.label;
        const labelsByLang = {};
        if (Array.isArray(labelOverlays)) {
          labelOverlays.forEach((overlay) => {
            if (overlay && overlay.language) {
              labelsByLang[overlay.language] = overlay;
            }
          });
        } else if (labelOverlays && typeof labelOverlays === "object") {
          Object.assign(labelsByLang, labelOverlays);
        }

        // Build initial language rows from labels
        const lanData = {};
        Object.keys(labelsByLang).forEach((lang) => {
          const labelOverlay = labelsByLang[lang] || {};
          lanData[lang] = attributes.map((attrName) => ({
            Attribute: attrName,
            Label: labelOverlay.attribute_labels?.[attrName] || "",
            Description: labelOverlay.attribute_descriptions?.[attrName] || "",
            List: false
          }));
        });

        // Derive List column from entry overlays (support array or object formats)
        const entryOverlays = schemaData.overlays?.entry;
        if (entryOverlays) {
          Object.keys(entryOverlays).forEach((lang) => {
            const entryOverlay = entryOverlays[lang];
            const attributesWithEntries = new Set();
            if (Array.isArray(entryOverlay)) {
              entryOverlay.forEach((e) => attributesWithEntries.add(e.attribute_name));
            } else if (entryOverlay && typeof entryOverlay === "object") {
              Object.keys(entryOverlay).forEach((attr) => {
                const arr = entryOverlay[attr];
                if (Array.isArray(arr) && arr.length > 0) attributesWithEntries.add(attr);
              });
            }
            if (lanData[lang]) {
              lanData[lang] = lanData[lang].map((row) => ({
                ...row,
                List: attributesWithEntries.has(row.Attribute)
              }));
            }
          });
        }

        // Sync with global context
        setLanAttributeRowData(lanData);
      }
    } catch (error) {
      console.error("Error loading schema language data:", error);
    }
  }, [activeSchemaId, OCAPackage, setLanAttributeRowData]);

  // Stops grid editing when clicking outside grid
  useEffect(() => {
    const handleClickOutsideGrid = (event) => {
      if (
        gridRef.current?.api &&
        refContainer.current &&
        !refContainer.current.contains(event.target)
      ) {
        gridRef.current.api.stopEditing();
      }
    };

    document.addEventListener("click", handleClickOutsideGrid);

    return () => {
      document.removeEventListener("click", handleClickOutsideGrid);
    };
  }, [gridRef, refContainer]);

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
          {t("Language-dependent Attribute Details")}
        </Typography>
      </Box>

      {/* Language Details Header */}
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
          {t("Language-dependent Attribute Details")}
        </Typography>
        <Box sx={{ marginLeft: "1rem", color: CustomPalette.GREY_600 }}>
          <Tooltip
            title={t("Define labels and descriptions for attributes in different languages")}
            placement="right"
            arrow
          >
            <HelpOutlineIcon sx={{ fontSize: 15 }} />
          </Tooltip>
        </Box>
      </Box>

      {/* Language Grid */}
      <div ref={refContainer}>
        <LanGrid
          gridRef={gridRef}
          currentLanguage={currentLanguage}
          setLoading={() => {}} // Empty function to prevent errors
        />
      </div>
    </BackNextSkeleton>
  );
}
