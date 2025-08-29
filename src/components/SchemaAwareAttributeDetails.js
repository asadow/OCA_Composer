import React, { useRef, useState, useEffect, useContext, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Box, Typography } from "@mui/material";
import SchemaAwareGrid from "../AttributeDetails/SchemaAwareGrid";
import AddAttribute from "../AttributeDetails/AddAttribute";
import { useMultiSchema } from "../context/MultiSchemaContext";
import { Context } from "../App";
import BackNextSkeleton from "./BackNextSkeleton";
import Loading from "./Loading";
import ErrorPopup from "../ViewSchema/ErrorPopup";
import { getSchemaDataById } from "../SchemaVisualization/dataUtils";
import { codesToLanguages } from "../constants/isoCodes";
import CustomPalette from "../constants/customPalette";

/**
 * Schema-Aware Attribute Details Component
 * 
 * This component handles attribute details for a specific schema with proper state isolation.
 */
export default function SchemaAwareAttributeDetails({
  pageBack,
  pageForward,
  insertStep,
  removeStep
}) {
  const { t } = useTranslation();
  
  // Multi-schema context
  const {
    activeSchemaId,
    getSchemaState,
    updateSchemaState
  } = useMultiSchema();

  // Global context for navigation and other global state
  const {
    setCurrentPage,
    OCAPackage
  } = useContext(Context);

  // Local state for UI
  const [errorMessage, setErrorMessage] = useState("");
  const [canDelete, setCanDelete] = useState(false);
  const [showAddAttribute, setShowAddAttribute] = useState(false);
  const [addByTab, setAddByTab] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [loading, setLoading] = useState(true);

  // Refs
  const gridRef = useRef();
  const refContainer = useRef();
  const entryCodesRef = useRef();
  const typeBlanksRef = useRef();
  const typesObjectRef = useRef({});
  const addButton1 = useRef();
  const addButton2 = useRef();

  // Get current schema state
  const currentSchemaState = getSchemaState(activeSchemaId);
  const attributes = currentSchemaState?.attributes || [];
  const entryCodes = currentSchemaState?.entryCodes || {};
  const lanAttributeRowData = currentSchemaState?.lanAttributeRowData || {};

  // Initialize component when schema changes
  useEffect(() => {
    if (!activeSchemaId || !OCAPackage) {
      setLoading(false);
      return;
    }

    const initializeComponent = async () => {
      try {
        setLoading(true);
        
        // Get schema data for the active schema
        const schemaData = getSchemaDataById(OCAPackage, activeSchemaId);
        
        if (schemaData) {
          // If schema is not initialized, initialize it
          if (!currentSchemaState?.initialized) {
            // The schema will be initialized by the MultiSchemaContext
            // We just need to wait for it to be ready
            return;
          }

          // Update canDelete based on attributes count
          setCanDelete(attributes.length > 1);

          // Initialize typesObjectRef with loaded types
          typesObjectRef.current = attributes.reduce((acc, attr) => {
            acc[attr.Attribute] = attr.Type || "";
            return acc;
          }, {});

          setLoading(false);
        } else {
          setErrorMessage(t("Schema not found"));
          setLoading(false);
        }
      } catch (error) {
        console.error("Error initializing SchemaAwareAttributeDetails:", error);
        setErrorMessage(t("Error loading schema data"));
        setLoading(false);
      }
    };

    initializeComponent();
  }, [activeSchemaId, OCAPackage, currentSchemaState?.initialized, attributes, t]);

  // Handle attribute updates
  const handleAttributeUpdate = useCallback((updatedAttributes) => {
    if (!activeSchemaId) return;

    updateSchemaState(activeSchemaId, {
      attributes: updatedAttributes,
      attributesList: updatedAttributes.map((attr) => attr.Attribute)
    });

    // Update canDelete
    setCanDelete(updatedAttributes.length > 1);

    // Update typesObjectRef
    typesObjectRef.current = updatedAttributes.reduce((acc, attr) => {
      acc[attr.Attribute] = attr.Type || "";
      return acc;
    }, {});
  }, [activeSchemaId, updateSchemaState]);

  // Handle entry codes update
  const handleEntryCodesUpdate = useCallback((updatedEntryCodes) => {
    if (!activeSchemaId) return;

    updateSchemaState(activeSchemaId, {
      entryCodes: updatedEntryCodes,
      attributesWithLists: Object.keys(updatedEntryCodes)
    });
  }, [activeSchemaId, updateSchemaState]);

  // Handle language data update
  const handleLanguageDataUpdate = useCallback((updatedLanguageData) => {
    if (!activeSchemaId) return;

    updateSchemaState(activeSchemaId, {
      lanAttributeRowData: updatedLanguageData
    });
  }, [activeSchemaId, updateSchemaState]);

  // Handle attribute deletion
  const handleAttributeDelete = useCallback((deletedAttributes) => {
    if (!activeSchemaId) return;

    // Update attributes list
    const updatedAttributes = attributes.filter(
      (attr) => !deletedAttributes.includes(attr.Attribute)
    );

    // Update entry codes
    const updatedEntryCodes = { ...entryCodes };
    deletedAttributes.forEach((attrName) => {
      delete updatedEntryCodes[attrName];
    });

    // Update language data
    const updatedLanguageData = { ...lanAttributeRowData };
    Object.keys(updatedLanguageData).forEach((lang) => {
      updatedLanguageData[lang] = updatedLanguageData[lang].filter(
        (item) => !deletedAttributes.includes(item.Attribute)
      );
    });

    // Update schema state
    updateSchemaState(activeSchemaId, {
      attributes: updatedAttributes,
      attributesList: updatedAttributes.map((attr) => attr.Attribute),
      entryCodes: updatedEntryCodes,
      attributesWithLists: Object.keys(updatedEntryCodes),
      lanAttributeRowData: updatedLanguageData
    });

    // Update canDelete
    setCanDelete(updatedAttributes.length > 1);
  }, [activeSchemaId, attributes, entryCodes, lanAttributeRowData, updateSchemaState]);

  // Navigation handlers
  const handlePageBack = () => {
    pageBack();
  };

  const handlePageForward = () => {
    // Validate that we have attributes
    if (!attributes || attributes.length === 0) {
      setErrorMessage(t("Please add at least one attribute"));
      return;
    }

    // Validate attribute names
    const invalidAttributes = attributes.filter((attr) => 
      !attr.Attribute || attr.Attribute.trim() === ""
    );
    
    if (invalidAttributes.length > 0) {
      setErrorMessage(t("All attributes must have names"));
      return;
    }

    // Check for duplicate attribute names
    const attributeNames = attributes.map((attr) => attr.Attribute);
    const uniqueNames = new Set(attributeNames);
    if (uniqueNames.size !== attributeNames.length) {
      setErrorMessage(t("Attribute names must be unique"));
      return;
    }

    // Clear any errors and proceed
    setErrorMessage("");
    pageForward();
  };

  if (loading) {
    return <Loading />;
  }

  if (!activeSchemaId) {
    return (
      <BackNextSkeleton isBack pageBack={handlePageBack}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {t("No active schema selected")}
        </Alert>
      </BackNextSkeleton>
    );
  }

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
          {t("Editing Schema")}: {currentSchemaState?.metadata?.name || activeSchemaId}
        </Typography>
        <Typography variant="body2" color="white">
          {t("Attributes")}: {attributes.length}
        </Typography>
        {Object.keys(entryCodes).length > 0 && (
          <Typography variant="body2" color="white">
            {t("Attributes with Entry Codes")}: {Object.keys(entryCodes).length}
          </Typography>
        )}
      </Box>

      {/* Error display */}
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMessage("")}>
          {errorMessage}
        </Alert>
      )}

      {/* Add Attribute Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ mb: 2, color: CustomPalette.PRIMARY }}>
          {t("Add Attribute")}
        </Typography>
        <AddAttribute
          showAddAttribute={showAddAttribute}
          setShowAddAttribute={setShowAddAttribute}
          addByTab={addByTab}
          setAddByTab={setAddByTab}
          onAttributeAdd={(newAttribute) => {
            const updatedAttributes = [...attributes, newAttribute];
            handleAttributeUpdate(updatedAttributes);
            setShowAddAttribute(false);
          }}
          refs={{ addButton1, addButton2 }}
        />
      </Box>

      {/* Attributes Grid */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ mb: 2, color: CustomPalette.PRIMARY }}>
          {t("Attribute Details")}
        </Typography>
        <SchemaAwareGrid
          ref={gridRef}
          attributes={attributes}
          entryCodes={entryCodes}
          lanAttributeRowData={lanAttributeRowData}
          canDelete={canDelete}
          onAttributeUpdate={handleAttributeUpdate}
          onEntryCodesUpdate={handleEntryCodesUpdate}
          onLanguageDataUpdate={handleLanguageDataUpdate}
          onAttributeDelete={handleAttributeDelete}
          typesObjectRef={typesObjectRef}
          refs={{ refContainer, entryCodesRef, typeBlanksRef }}
        />
      </Box>

      {/* Entry Codes Section */}
      {Object.keys(entryCodes).length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ mb: 2, color: CustomPalette.PRIMARY }}>
            {t("Entry Codes")}
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: CustomPalette.GREY_600 }}>
            {t("Configure entry codes for attributes with predefined values")}
          </Typography>
          {/* Entry codes component would go here */}
        </Box>
      )}

      {/* Language Details Section */}
      {Object.keys(lanAttributeRowData).length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ mb: 2, color: CustomPalette.PRIMARY }}>
            {t("Language-dependent Attribute Details")}
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: CustomPalette.GREY_600 }}>
            {t("Configure labels and descriptions for different languages")}
          </Typography>
          {/* Language details component would go here */}
        </Box>
      )}
    </BackNextSkeleton>
  );
}
