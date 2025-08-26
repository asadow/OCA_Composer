import React, { useContext, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Box, Typography } from "@mui/material";
import { Context } from "../App";
import { useMultiSchema } from "../context/MultiSchemaContext";
import SchemaAwareSchemaInput from "./SchemaAwareSchemaInput";
import IntroCard from "../SchemaMetadata/IntroCard";
import SchemaAwareAttributes from "./SchemaAwareAttributes";
import BackNextSkeleton from "./BackNextSkeleton";
import { getSchemaDataById } from "../SchemaVisualization/dataUtils";

/**
 * Schema-Aware Schema Metadata Component
 * 
 * This component handles schema metadata for a specific schema.
 */
export default function SchemaAwareSchemaMetadata({
  pageBack,
  pageForward
}) {
  const { t } = useTranslation();
  
  // Original context for navigation and other global state
  const {
    showIntroCard,
    setShowIntroCard,
    setSchemaDescription,
    OCAPackage
  } = useContext(Context);

  // Multi-schema context
  const {
    activeSchemaId,
    getSchemaState,
    updateSchemaState
  } = useMultiSchema();

  // Local state for UI
  const [currentLanguage, setCurrentLanguage] = useState("English");

  // Get current schema state
  const currentSchemaState = getSchemaState(activeSchemaId);
  const schemaMetadata = currentSchemaState?.metadata || {};
  const attributesList = currentSchemaState?.attributesList || [];

  // Load schema-specific metadata and sync with global context
  useEffect(() => {
    if (!activeSchemaId || !OCAPackage) {
      return;
    }

    try {
      // Get schema data for the active schema
      const schemaData = getSchemaDataById(OCAPackage, activeSchemaId);
      
      if (schemaData) {
        // Update schema state with metadata
        const metadata = {
          name: schemaData.schemaName || activeSchemaId,
          description: schemaData.schemaDescription || ""
        };

        // Only update metadata and attributesList here. AttributeDetails handles full attributes.
        const nextAttributesList = Object.keys(schemaData.attributes || {});
        updateSchemaState(activeSchemaId, {
          metadata,
          attributesList: nextAttributesList
        });

        // Sync with global context
        setSchemaDescription({
          English: {
            name: metadata.name,
            description: metadata.description
          }
        });
      }
    } catch (error) {
      console.error("Error loading schema metadata:", error);
    }
  }, [activeSchemaId, OCAPackage, updateSchemaState, setSchemaDescription]);

  // Handle schema metadata updates
  const handleSchemaNameChange = (newName) => {
    updateSchemaState(activeSchemaId, {
      metadata: {
        ...schemaMetadata,
        name: newName
      }
    });

    // Sync with global context
    setSchemaDescription({
      English: {
        name: newName,
        description: schemaMetadata.description || ""
      }
    });
  };

  const handleSchemaDescriptionChange = (newDescription) => {
    updateSchemaState(activeSchemaId, {
      metadata: {
        ...schemaMetadata,
        description: newDescription
      }
    });

    // Sync with global context
    setSchemaDescription({
      English: {
        name: schemaMetadata.name || "",
        description: newDescription
      }
    });
  };

  const handleLanguageChange = (language) => {
    setCurrentLanguage(language);
  };

  // Navigation handlers
  const handlePageBack = () => {
    pageBack();
  };

  const handlePageForward = () => {
    // Validate that we have a schema name
    if (!schemaMetadata.name || schemaMetadata.name.trim() === "") {
      // Could show an error message here
      return;
    }
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
          {t("Editing Schema")}: {schemaMetadata.name || activeSchemaId || t("New Schema")}
        </Typography>
        <Typography variant="body2" color="white">
          {t("Attributes")}: {attributesList.length}
        </Typography>
      </Box>

      {/* Intro Card */}
      {showIntroCard && (
        <IntroCard
          setShowIntroCard={setShowIntroCard}
          currentLanguage={currentLanguage}
          setCurrentLanguage={handleLanguageChange}
        />
      )}

      {/* Schema Input */}
      <SchemaAwareSchemaInput
        currentLanguage={currentLanguage}
        setCurrentLanguage={handleLanguageChange}
        schemaName={schemaMetadata.name || ""}
        schemaDescription={schemaMetadata.description || ""}
        onSchemaNameChange={handleSchemaNameChange}
        onSchemaDescriptionChange={handleSchemaDescriptionChange}
        editingSchemaId={activeSchemaId}
      />

      {/* Attributes */}
      <SchemaAwareAttributes
        attributesList={attributesList}
        currentLanguage={currentLanguage}
        setCurrentLanguage={handleLanguageChange}
      />
    </BackNextSkeleton>
  );
}
