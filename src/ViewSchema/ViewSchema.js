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
import LinkCard from "./LinkCard";
import useExportLogic from "./useExportLogic";
import Loading from "../components/Loading";
import useExportLogicV2 from "./useExportLogicV2";
import useMultiSchemaExport from "../hooks/useMultiSchemaExport";
import { CUSTOM_FORMAT_RULE } from "../constants/constants";
import { codesToLanguages } from "../constants/isoCodes";
import useGenerateReadMe from "./useGenerateReadMe";
import useGenerateReadMeV2 from "./useGenerateReadMeV2";
import {
  getFormatRuleDescription,
  updatedUnitFramingRowDataForViewSchema
} from "../constants/utils";
import ErrorPopup from "./ErrorPopup";
import CustomRouterLink from "../components/CustomRouterLink";
import SchemaVisualizationEmbed from "../SchemaVisualization/SchemaVisualizationEmbed";

export default function ViewSchema({
  pageBack,
  isExport = true,
  addClearButton,
  pageForward,
  isPageForward = true,
  isBack = false
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    languages,
    attributeRowData,
    lanAttributeRowData,
    schemaDescription,
    isZip,
    isZipEdited,
    setIsZipEdited,
    characterEncodingRowData,
    setCurrentPage,
    history,
    setHistory,
    formatRuleRowData,
    currentUnitFramedRowData,
    dataStandardsRowData,
    zipToReadme,
    jsonToReadme,
    OCAPackage,
    rangeRowData,
    attributeFramingRowData,
    currentSchemaId,
    setEditingSchemaId
  } = useContext(Context);

  // Multi-schema context
  const { 
    activeSchemaId, 
    switchToSchema, 
    exportSchemaChanges, 
    getModifiedSchemas,
    getNavigationHistory,
    navigateBack,
    getSchemaState,
    isSchemaModified
  } = useMultiSchema();

  const languageIndex = languages.findIndex(
    (item) => codesToLanguages?.[i18next.language] === item
  );
  const filteredLanguages = [...languages];
  if (languageIndex !== -1 && languageIndex !== 0) {
    const removedLanguage = filteredLanguages.splice(languageIndex, 1);
    filteredLanguages.unshift(removedLanguage[0]);
  }
  const [currentLanguage, setCurrentLanguage] = useState(filteredLanguages[0]);
  const [displayArray, setDisplayArray] = useState([]);
  const [showLink, setShowLink] = useState(false);
  const { resetToDefaults, exportDisabled } = useExportLogic();
  const { exportData: originalExportData, error: exportError, clearError } = useExportLogicV2();
  const { 
    exportData: multiSchemaExportData, 
    error: multiSchemaExportError, 
    clearError: clearMultiSchemaError,
    activeSchemaId: exportActiveSchemaId,
    modifiedSchemas
  } = useMultiSchemaExport();
  const [loading, setLoading] = useState(true);
  const [visualizationMode, setVisualizationMode] = useState("tree");

  // Get the modified OCA package for visualization
  const getModifiedOCAPackage = () => {
    if (!OCAPackage) return null;
    
    const modifiedSchemas = getModifiedSchemas();
    if (modifiedSchemas.length > 0) {
      // Return the modified package with schema changes
      return exportSchemaChanges(OCAPackage);
    }
    
    // Return the original package if no modifications
    return OCAPackage;
  };

  // Enhanced schema switching with proper navigation
  const handleSchemaSwitch = useCallback((schemaId) => {
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
  }, [activeSchemaId, switchToSchema, OCAPackage, setEditingSchemaId, setCurrentPage, navigate]);



  const { toTextFile } = useGenerateReadMe();
  const { jsonToTextFile } = useGenerateReadMeV2();
  // Always show multi-schema visualization if we have an OCA package
  const hasHierarchy = !!OCAPackage;



  // Formats language buttons in a way that can handle many languages cleanly
  // Minimizes language for cases where it's too long to fit in button size

  const displayLanguageArray = [];

  for (let i = 0; i < filteredLanguages.length; i += 7) {
    const languageRow = filteredLanguages.slice(i, i + 7).filter(Boolean);
    displayLanguageArray.push(languageRow);
  }

  const createLanguageRow = (languageArray, rowIndex) => {
    const languageRowDisplay = languageArray.map((language, index) => {
      let curveLeftTop = "0";
      let curveRightTop = "0";
      let curveRightBottom = "0";
      let curveLeftBottom = "0";

      if (languages.length > 7) {
        if (rowIndex === 0 && index === 0) {
          curveLeftBottom = "8px";
        }
        if (rowIndex === displayLanguageArray.length - 1 && index === 0) {
          curveLeftTop = "8px";
        }
        if (rowIndex === 0 && index === 6) {
          curveRightBottom = "8px";
        }
        if (
          rowIndex === displayLanguageArray.length - 1 &&
          index === languageArray.length - 1
        ) {
          curveRightTop = "8px";
        }
        if (
          rowIndex === displayLanguageArray.length - 2 &&
          displayLanguageArray[displayLanguageArray.length - 1].length < 7 &&
          index === 6
        ) {
          curveRightTop = "8px";
        }
      } else {
        if (index === 0) {
          curveLeftBottom = "8px";
          curveLeftTop = "8px";
        }
        if (index === languages.length - 1) {
          curveRightBottom = "8px";
          curveRightTop = "8px";
        }
      }

      const borderRadius = `${curveLeftTop} ${curveRightTop} ${curveRightBottom} ${curveLeftBottom}`;

      let minimizedLanguage = language.slice(0, 9);
      if (minimizedLanguage !== language) {
        minimizedLanguage += "...";
      }
      return (
        <Button
          onClick={() => {
            setCurrentLanguage(language);
          }}
          key={language}
          sx={{
            backgroundColor:
              currentLanguage === language
                ? CustomPalette.PRIMARY
                : CustomPalette.SECONDARY,
            color: "white",
            borderRadius,
            border: "none",
            fontSize: "0.7rem",
            padding: "0.3rem 0.5rem",
            minWidth: "auto",
            width: "100%",
            height: "2rem",
            "&:hover": {
              backgroundColor:
                currentLanguage === language
                  ? CustomPalette.PRIMARY
                  : CustomPalette.SECONDARY
            }
          }}
        >
          {minimizedLanguage}
        </Button>
      );
    });

    return (
      <Box
        key={rowIndex}
        sx={{
          display: "flex",
          gap: "0.1rem",
          marginBottom: "0.1rem"
        }}
      >
        {languageRowDisplay}
      </Box>
    );
  };

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
              const schemaEntryCodes = schemaState.entryCodes || {};
              
              // Create the display array in the format expected by ViewGrid
              const newDisplayArray = schemaAttributes.map(attr => {
                const hasEntryCodes = schemaEntryCodes[attr.Attribute];
                
                // Get language-specific data from schema state
                const lanAttributeData = schemaState.lanAttributeRowData || {};
                
                // Initialize language-specific fields for all available languages
                const descriptionObj = {};
                const labelObj = {};
                const listObj = {};
                
                // Initialize for all languages with proper data
                filteredLanguages.forEach(lang => {
                  // Get language-specific data for this attribute
                  const langData = lanAttributeData[lang]?.find(item => item.Attribute === attr.Attribute);
                  
                  descriptionObj[lang] = langData?.Description || attr.Description || "";
                  labelObj[lang] = langData?.Label || attr.Label || "";
                  listObj[lang] = hasEntryCodes ? "Has Entry Codes" : "Not a List";
                });
                
                // Handle schema references (refs/refn) - these should be "Child Schema" not a type
                let displayType = attr.Type || "";
                if (displayType.startsWith('refs:') || displayType.startsWith('refn:')) {
                  displayType = "Child Schema";
                }
                
                return {
                  Attribute: attr.Attribute,
                  Type: displayType,
                  Description: descriptionObj,
                  Label: labelObj,
                  Required: attr.Required || false,
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
  }, [activeSchemaId, OCAPackage, currentLanguage, attributeRowData, getSchemaState]);

  if (loading) {
    return <Loading />;
  }

  return (
    <Box sx={{ padding: "2rem" }}>


      {/* Schema Description */}
      <Box sx={{ marginBottom: "2rem" }}>
        <SchemaDescription
          schemaDescription={schemaDescription}
          currentLanguage={currentLanguage}
          setCurrentLanguage={setCurrentLanguage}
        />
      </Box>

      {/* Language Selection */}
      <Box sx={{ marginBottom: "2rem" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            marginBottom: "1rem"
          }}
        >
          <Typography
            sx={{
              fontSize: 22,
              fontWeight: "bold",
              color: CustomPalette.PRIMARY
            }}
          >
            {t("Schema Language")}
          </Typography>
          <Box sx={{ marginLeft: "1rem", color: CustomPalette.GREY_600 }}>
            <Tooltip
              title={t("Select the language for schema display")}
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
            flexDirection: "column",
            gap: "0.1rem"
          }}
        >
          {displayLanguageArray.map((languageArray, rowIndex) =>
            createLanguageRow(languageArray, rowIndex)
          )}
        </Box>
      </Box>

      {/* Schema Grid */}
      <Box sx={{ marginBottom: "2rem" }}>
        <ViewGrid
          currentLanguage={currentLanguage}
          setCurrentLanguage={setCurrentLanguage}
          displayArray={displayArray}
          setDisplayArray={setDisplayArray}
        />
      </Box>

      {/* Multi-Schema Visualization */}
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

          {/* Mode toggle buttons matching Schema Language style */}
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
              attributeRowData={attributeRowData}
              schemaDescription={schemaDescription}
              languages={filteredLanguages}
              OCAPackage={OCAPackage}
              viewMode={visualizationMode}
              height="70vh"
              currentSchemaId={activeSchemaId}
              setCurrentSchemaId={handleSchemaSwitch}
            />
          </Box>
        </>
      )}
      
      {/* Export Button */}
      {isPageForward && isExport && (!isZip || (isZip && isZipEdited)) ? (
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Box>
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
          </Box>
        </Box>
      ) : (
        <></>
      )}
      
      {/* Clear Button */}
      {addClearButton && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            marginTop: "2rem"
          }}
        >
          <Button
            color="warning"
            variant="outlined"
            onClick={resetToDefaults}
            sx={{
              alignSelf: "flex-end",
              width: "20rem",
              display: "flex",
              justifyContent: "space-around",
              p: 1,
              mb: 5
            }}
          >
            {t("Clear All Data and Restart")}
          </Button>
        </Box>
      )}
      
      {/* Error Popup */}
      {(exportError || multiSchemaExportError) && (
        <ErrorPopup onClose={() => { clearError(); clearMultiSchemaError(); }}>
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
