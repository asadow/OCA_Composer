import React, { useRef, useContext, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Box, Typography } from "@mui/material";
import Grid from "../AttributeDetails/Grid";
import AddAttribute from "../AttributeDetails/AddAttribute";
import { Context } from "../App";
import BackNextSkeleton from "./BackNextSkeleton";
import Loading from "./Loading";
import ErrorPopup from "../ViewSchema/ErrorPopup";

/**
 * Schema-Aware Attribute Details Component
 * 
 * This component demonstrates how to refactor existing components to work with
 * the new multi-schema architecture. Instead of using global state, it uses
 * schema-specific state management.
 */
export default function SchemaAwareAttributeDetails({
  pageBack,
  pageForward,
  insertStep,
  removeStep
}) {
  const { t } = useTranslation();
  
  // New multi-schema context usage
  const {
    activeSchemaId,
    getSchemaState,
    updateSchemaState,
    switchToSchema
  } = useContext(Context);

  // Local state for UI
  const [errorMessage, setErrorMessage] = useState("");
  const [canDelete, setCanDelete] = useState(false);
  const [showAddAttribute, setShowAddAttribute] = useState(false);
  const [addByTab, setAddByTab] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [loading, setLoading] = useState(true);

  // Refs
  const navigationSafe = useRef();
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
  const attributesList = currentSchemaState?.attributesList || [];

  // Update canDelete based on current schema's attributes
  useEffect(() => {
    setCanDelete(attributes.length > 1);
  }, [attributes.length]);

  // Handle adding a new attribute to the current schema
  const handleAddAttribute = (newAttribute) => {
    const updatedAttributes = [
      ...attributes,
      {
        Attribute: newAttribute,
        Flagged: false,
        List: false,
        Type: "",
        Unit: ""
      }
    ];

    // Update schema-specific state
    updateSchemaState(activeSchemaId, {
      attributes: updatedAttributes,
      attributesList: updatedAttributes.map(attr => attr.Attribute)
    });
  };

  // Handle deleting an attribute from the current schema
  const handleDeleteAttribute = (attributeName) => {
    const updatedAttributes = attributes.filter(attr => attr.Attribute !== attributeName);
    
    updateSchemaState(activeSchemaId, {
      attributes: updatedAttributes,
      attributesList: updatedAttributes.map(attr => attr.Attribute)
    });
  };

  // Handle updating an attribute in the current schema
  const handleUpdateAttribute = (index, field, value) => {
    const updatedAttributes = [...attributes];
    updatedAttributes[index] = {
      ...updatedAttributes[index],
      [field]: value
    };

    updateSchemaState(activeSchemaId, {
      attributes: updatedAttributes
    });
  };

  // Navigation handlers
  const pageBackSave = () => {
    if (navigationSafe.current === true) {
      pageBack();
    }
  };

  const pageForwardSave = () => {
    // Validate current schema's attributes before proceeding
    const hasBlankTypes = attributes.some(attr => !attr.Type);
    
    if (hasBlankTypes) {
      setShowCard(true);
      return;
    }

    // Mark navigation as safe
    navigationSafe.current = true;
    pageForward();
  };

  // Loading state
  useEffect(() => {
    if (attributes.length > 0) {
      setLoading(false);
    }
  }, [attributes]);

  return (
    <BackNextSkeleton
      isBack
      pageBack={pageBackSave}
      isForward
      pageForward={pageForwardSave}
    >
      {loading && attributes.length > 40 && <Loading />}
      
      {showCard && (
        <ErrorPopup onClose={() => setShowCard(false)}>
          <Box>
            <Typography variant="h5" sx={{ mb: 1 }}>
              {t("There are one or more blank entries in the Type column.")}
            </Typography>
            <Typography variant="h6" fontWeight="semibold">
              {t("Please provide valid data types for all attributes.")}
            </Typography>
          </Box>
        </ErrorPopup>
      )}
      
      {errorMessage.length > 0 && (
        <Alert
          severity="error"
          style={{
            position: "fixed",
            top: 10,
            left: 100,
            right: 100,
            zIndex: 9999
          }}
        >
          {errorMessage}
        </Alert>
      )}

      {/* Schema indicator */}
      <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
        <Typography variant="h6" color="white">
          {t("Editing Schema")}: {currentSchemaState?.metadata?.name || activeSchemaId}
        </Typography>
        <Typography variant="body2" color="white">
          {t("Attributes")}: {attributes.length}
        </Typography>
      </Box>

      <div ref={refContainer}>
        <Grid
          gridRef={gridRef}
          addButton1={addButton1}
          addButton2={addButton2}
          setErrorMessage={setErrorMessage}
          canDelete={canDelete}
          setCanDelete={setCanDelete}
          setAddByTab={setAddByTab}
          typesObjectRef={typesObjectRef}
          setLoading={setLoading}
          // Pass schema-specific data
          attributes={attributes}
          onAddAttribute={handleAddAttribute}
          onDeleteAttribute={handleDeleteAttribute}
          onUpdateAttribute={handleUpdateAttribute}
        />
      </div>
      
      <AddAttribute
        addButton1={addButton1}
        addButton2={addButton2}
        gridRef={gridRef}
        setErrorMessage={setErrorMessage}
        setCanDelete={setCanDelete}
        showAddAttribute={showAddAttribute}
        setShowAddAttribute={setShowAddAttribute}
        addByTab={addByTab}
        setAddByTab={setAddByTab}
        typesObjectRef={typesObjectRef}
        // Pass schema-specific handlers
        onAddAttribute={handleAddAttribute}
        currentAttributes={attributes}
      />
    </BackNextSkeleton>
  );
}
