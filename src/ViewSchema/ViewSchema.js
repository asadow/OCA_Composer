import React, { useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import i18next from "i18next";
import { Box, Button, Typography, Tooltip } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { Context } from "../App";
import { useMultiSchema } from "../context/MultiSchemaContext";
import { CustomPalette } from "../constants/customPalette";
import SchemaDescription from "./SchemaDescription";
import ViewGrid from "./ViewGrid";

import useExportLogic from "./useExportLogic";
import Loading from "../components/Loading";
import useExportLogicV2 from "./useExportLogicV2";
import useMultiSchemaExport from "../hooks/useMultiSchemaExport";

import { codesToLanguages } from "../constants/isoCodes";

import ErrorPopup from "./ErrorPopup";
import CustomRouterLink from "../components/CustomRouterLink";
import SchemaVisualizationEmbed from "../SchemaVisualization/SchemaVisualizationEmbed";

export default function ViewSchema({
  isExport = true,
  addClearButton,

  isPageForward = true
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    languages,
    attributeRowData,
    schemaDescription,
    isZip,
    isZipEdited,
    setCurrentPage,
    OCAPackage,
    setEditingSchemaId
  } = useContext(Context);

  // Multi-schema context
  const {
    activeSchemaId,
    switchToSchema,
    exportSchemaChanges,
    getModifiedSchemas,
    modifiedSchemas,
    getSchemaState
  } = useMultiSchema();

  const languageIndex = languages.findIndex(
    (item) => codesToLanguages?.[i18next.language] === item
  );
  const filteredLanguages = React.useMemo(() => {
    const arr = [...languages];
    if (languageIndex !== -1 && languageIndex !== 0) {
      const removedLanguage = arr.splice(languageIndex, 1);
      arr.unshift(removedLanguage[0]);
    }
    return arr;
  }, [languages, languageIndex]);
  const [currentLanguage, setCurrentLanguage] = useState(filteredLanguages[0]);
  const [displayArray, setDisplayArray] = useState([]);
  const { resetToDefaults, exportDisabled } = useExportLogic();
  const {
    exportData: originalExportData,
    error: exportError,
    clearError
  } = useExportLogicV2();
  const {
    exportData: multiSchemaExportData,
    error: multiSchemaExportError,
    clearError: clearMultiSchemaError
  } = useMultiSchemaExport();
  const [loading, setLoading] = useState(true);
  const [visualizationMode, setVisualizationMode] = useState("detailed");
  const [updatedOCAPackage, setUpdatedOCAPackage] = useState(OCAPackage);

  // (unused helper removed)

  // Enhanced schema switching with proper navigation
  const handleSchemaSwitch = useCallback(
    (schemaId) => {
      if (schemaId && schemaId !== activeSchemaId) {
        // Use multi-schema context to switch to the selected schema
        switchToSchema(schemaId, OCAPackage);
        // Set the schema being edited
        setEditingSchemaId(schemaId);
        // Navigate to the editor step 1 (Metadata) to edit the selected schema
        // Use original components (not schema-aware) for consistent UI
        setCurrentPage("Metadata");
        navigate("/start");
      }
    },
    [
      activeSchemaId,
      switchToSchema,
      OCAPackage,
      setEditingSchemaId,
      setCurrentPage,
      navigate
    ]
  );

  // readme hooks not used on this page
  // Always show multi-schema visualization if we have an OCA package
  const hasHierarchy = !!OCAPackage;

  // Update the package data when schemas are modified
  useEffect(() => {
    if (OCAPackage) {
      if (modifiedSchemas.size > 0) {
        // Export with schema changes
        const modifiedPackage = exportSchemaChanges(OCAPackage);
        setUpdatedOCAPackage(modifiedPackage);
      } else {
        // Use original package if no changes
        setUpdatedOCAPackage(OCAPackage);
      }
    }
  }, [OCAPackage, modifiedSchemas, exportSchemaChanges]);

  // Removed in favor of global language toggle (EN/FR)

  const handleClickDownload = async () => {
    try {
      setLoading(true);

      // Use multi-schema export if we have modified schemas
      const modifiedSchemas = getModifiedSchemas();
      if (modifiedSchemas.length > 0) {
        // Export with schema changes
        const modifiedPackage = exportSchemaChanges(OCAPackage);
        // Use the multi-schema export logic
        await multiSchemaExportData(modifiedPackage);
      } else {
        // Use original export logic
        await originalExportData();
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load schema data when component mounts or when active schema changes
  useEffect(() => {
    const loadSchemaData = async () => {
      try {
        setLoading(true);

        if (OCAPackage) {
          // Always try to load data for the current schema
          let currentSchemaId = activeSchemaId;

          // If no active schema is set, use the root schema
          if (!currentSchemaId) {
            currentSchemaId = OCAPackage.bundle?.d || OCAPackage.bundle?.capture_base?.d;
          }

          if (currentSchemaId) {
            const schemaState = getSchemaState(currentSchemaId);
            if (schemaState && schemaState.initialized) {
              // Convert schema state back to the format expected by ViewGrid
              const schemaAttributes = schemaState.attributes || [];
              const formatRuleIndex = new Map(
                (schemaState.formatRuleData || []).map((r) => [
                  r.Attribute,
                  r["Format Rule"]
                ])
              );

              // Create the display array in the format expected by ViewGrid
              const newDisplayArray = schemaAttributes.map((attr) => {
                // Get language-specific data from schema state
                const lanAttributeData = schemaState.lanAttributeRowData || {};

                // Initialize language-specific fields for all available languages
                const descriptionObj = {};
                const labelObj = {};
                const listObj = {};

                // Quick helper to derive overlay language code from UI language name
                const toLangKey = (l) =>
                  l === "English"
                    ? "eng"
                    : l === "French"
                      ? "fra"
                      : (l || "").toLowerCase();

                // Build a map of attribute -> entryCodes array once
                const entryCodesMap = schemaState.entryCodes || {};
                const codesForAttr = Array.isArray(entryCodesMap[attr.Attribute])
                  ? entryCodesMap[attr.Attribute]
                  : [];

                // Initialize for all languages with proper data (accept either display name or 3-letter code)
                filteredLanguages.forEach((lang) => {
                  const langKey = toLangKey(lang);
                  const rowsByCode = lanAttributeData[langKey] || [];
                  const rowsByName = lanAttributeData[lang] || [];
                  const langData = (rowsByCode.length ? rowsByCode : rowsByName).find(
                    (item) => item.Attribute === attr.Attribute
                  );

                  descriptionObj[lang] = langData?.Description || attr.Description || "";
                  labelObj[lang] = langData?.Label || attr.Label || "";

                  // Build list text from entry codes for this language, or Not a List
                  if (codesForAttr.length > 0) {
                    const labelForLang = (row) =>
                      row[lang] || row[langKey] || row.English || row.eng || row.Code;
                    const items = codesForAttr
                      .map((row) => labelForLang(row))
                      .filter(Boolean);
                    listObj[lang] = items.length > 0 ? items.join(" | ") : "Not a List";
                  } else {
                    listObj[lang] = "Not a List";
                  }
                });

                // Handle schema references (refs/refn) - these should be "Child Schema" not a type
                let displayType = attr.Type || "";
                if (displayType.startsWith("refs:") || displayType.startsWith("refn:")) {
                  displayType = "Child Schema";
                }

                return {
                  Attribute: attr.Attribute,
                  Type: displayType,
                  Description: descriptionObj,
                  Label: labelObj,
                  Required: !!attr.Required,
                  "Format Rule": formatRuleIndex.get(attr.Attribute) || "",
                  "Character Encoding":
                    (schemaState.characterEncodingData || []).find(
                      (r) => r.Attribute === attr.Attribute
                    )?.["Character Encoding"] || "",
                  List: listObj,
                  Unit: attr.Unit || "",
                  Flagged: attr.Flagged || false
                };
              });

              setDisplayArray(newDisplayArray);
            } else {
              // Fallback to original attribute row data
              setDisplayArray(attributeRowData);
            }
          } else {
            // Use the original attribute row data
            setDisplayArray(attributeRowData);
          }
        } else {
          // Use the original attribute row data
          setDisplayArray(attributeRowData);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading schema data:", error);
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      loadSchemaData();
    }, 100);

    return () => clearTimeout(timer);
  }, [
    activeSchemaId,
    OCAPackage,
    currentLanguage,
    attributeRowData,
    getSchemaState,
    filteredLanguages
  ]);

  if (loading) {
    return <Loading />;
  }

  return (
    <Box sx={{ padding: "2rem" }}>
      {/* Header: Schema description + actions */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 2
        }}
      >
        <SchemaDescription currentLanguage={currentLanguage} />
        <Box sx={{ display: "flex", gap: 2 }}>
          {isPageForward && isExport && (!isZip || (isZip && isZipEdited)) && (
            <Button
              color="button"
              variant="contained"
              onClick={handleClickDownload}
              sx={{
                width: "13rem",
                display: "flex",
                justifyContent: "space-around",
                p: 1
              }}
              disabled={exportDisabled}
            >
              {t("Finish and Download")} <CheckCircleIcon />
            </Button>
          )}
          {addClearButton && (
            <Button
              color="warning"
              variant="outlined"
              onClick={resetToDefaults}
              sx={{
                width: "20rem",
                display: "flex",
                justifyContent: "space-around",
                p: 1
              }}
            >
              {t("Clear All Data and Restart")}
            </Button>
          )}
        </Box>
      </Box>

      {/* Multi-Schema Visualization (moved above details) */}
      {hasHierarchy && (
        <>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              marginTop: 2,
              marginBottom: 1
            }}
          >
            <Typography
              sx={{
                fontSize: 22,
                fontWeight: "bold",
                color: CustomPalette.PRIMARY
              }}
            >
              {t("Multi-Schema Visualization")}
            </Typography>
            <Box sx={{ marginLeft: "1rem", color: CustomPalette.GREY_600 }}>
              <Tooltip
                title={t("Visual representation of references between schemas")}
                placement="right"
                arrow
              >
                <HelpOutlineIcon sx={{ fontSize: 15 }} />
              </Tooltip>
            </Box>
          </Box>

          {/* Mode toggle buttons */}
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <Button
              color="button"
              variant="contained"
              onClick={() => setVisualizationMode("tree")}
              sx={{
                backgroundColor:
                  visualizationMode === "tree"
                    ? CustomPalette.PRIMARY
                    : CustomPalette.SECONDARY,
                boxShadow: "none"
              }}
            >
              {t("Tree View")}
            </Button>
            <Button
              color="button"
              variant="contained"
              onClick={() => setVisualizationMode("detailed")}
              sx={{
                backgroundColor:
                  visualizationMode === "detailed"
                    ? CustomPalette.PRIMARY
                    : CustomPalette.SECONDARY,
                boxShadow: "none"
              }}
            >
              {t("Detailed View")}
            </Button>
          </Box>

          <Box sx={{ mb: 4, width: "100%" }}>
            <SchemaVisualizationEmbed
              key={`viz-${updatedOCAPackage?.bundle?.d}-${modifiedSchemas.size}`}
              attributeRowData={attributeRowData}
              schemaDescription={schemaDescription}
              languages={filteredLanguages}
              OCAPackage={updatedOCAPackage}
              viewMode={visualizationMode}
              height="70vh"
              currentSchemaId={activeSchemaId}
              setCurrentSchemaId={handleSchemaSwitch}
            />
          </Box>
        </>
      )}

      {/* Attribute Details header and grid */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <Typography
          sx={{ fontSize: 22, fontWeight: "bold", color: CustomPalette.PRIMARY }}
        >
          {t("Attribute Details")}
        </Typography>
        <Box sx={{ marginLeft: "0.5rem", color: CustomPalette.GREY_600 }}>
          <Tooltip
            title={t(
              "This table shows each attribute with its labels, descriptions, required status, format rules, and units"
            )}
            placement="right"
            arrow
          >
            <HelpOutlineIcon sx={{ fontSize: 15 }} />
          </Tooltip>
        </Box>
      </Box>
      <Box sx={{ marginBottom: "2rem" }}>
        <ViewGrid
          currentLanguage={currentLanguage}
          setCurrentLanguage={setCurrentLanguage}
          displayArray={displayArray}
          setDisplayArray={setDisplayArray}
        />
      </Box>

      {/* Moved action buttons to header above */}

      {/* Error Popup */}
      {(exportError || multiSchemaExportError) && (
        <ErrorPopup
          onClose={() => {
            clearError();
            clearMultiSchemaError();
          }}
        >
          <Typography variant="h5" sx={{ p: 1 }}>
            <Trans
              i18nKey="SchemaExportError"
              components={[
                <CustomRouterLink
                  to="mailto:adc@uoguelph.ca"
                  text="adc@uoguelph.ca"
                  overrideStyle={{ fontWeight: "500", color: CustomPalette.PRIMARY }}
                />
              ]}
            />
          </Typography>
        </ErrorPopup>
      )}
    </Box>
  );
}
