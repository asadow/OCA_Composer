import React, { useRef, useContext, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Box, Typography } from "@mui/material";
import Grid from "./Grid";
import AddAttribute from "./AddAttribute";
import { Context } from "../App";
import { useMultiSchema } from "../context/MultiSchemaContext";
import {
  removeSpacesFromString,
  removeSpacesFromArrayOfObjects
} from "../constants/removeSpaces";
import BackNextSkeleton from "../components/BackNextSkeleton";
import Loading from "../components/Loading";
import { hasDisallowedChars } from "../constants/utils";
import { FIELD_RANGE_OVERLAY } from "../constants/constants";
import ErrorPopup from "../ViewSchema/ErrorPopup";
import { getSchemaDataById } from "../SchemaVisualization/dataUtils";

export default function AttributeDetails({
  pageBack,
  pageForward,
  insertStep,
  removeStep
}) {
  const { t } = useTranslation();
  const {
    setAttributesWithLists,
    setCurrentPage,
    overlay,
    setOverlay,
    OCAPackage,
    editingSchemaId,
    setAttributesList: setGlobalAttributesList
  } = useContext(Context);

  // Use MultiSchemaContext for attribute data
  const { getSchemaState, updateSchemaState } = useMultiSchema();

  // Local state for the current editing session
  const [attributeRowData, setAttributeRowData] = useState([]);
  const [attributesList, setAttributesList] = useState([]);

  const [errorMessage, setErrorMessage] = useState("");
  const [canDelete, setCanDelete] = useState(false);
  const [showAddAttribute, setShowAddAttribute] = useState(false);
  const [addByTab, setAddByTab] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [loading, setLoading] = useState(true);

  const navigationSafe = useRef();
  const gridRef = useRef();
  const refContainer = useRef();
  const entryCodesRef = useRef();
  const typeBlanksRef = useRef();
  const typesObjectRef = useRef({});
  const addButton1 = useRef();
  const addButton2 = useRef();

  // Track initialization to prevent infinite loops
  const initializedSchemaRef = useRef(null);

  // Update types object when attribute data changes
  useEffect(() => {
    const newTypesObjetRef = {};
    attributeRowData.forEach((item) => {
      newTypesObjetRef[item.Attribute] = item.Type;
    });
    typesObjectRef.current = newTypesObjetRef;
  }, [attributeRowData]);

  // Initialize data when switching to edit a schema
  useEffect(() => {
    if (editingSchemaId && initializedSchemaRef.current !== editingSchemaId) {
      initializedSchemaRef.current = editingSchemaId;

      const schemaState = getSchemaState(editingSchemaId);

      // If we have existing data for this schema, use it
      if (schemaState.attributes && schemaState.attributes.length > 0) {
        setAttributeRowData(schemaState.attributes);
        setAttributesList(schemaState.attributesList || []);
      } else {
        // Initialize from OCA package if no existing data

        const schemaData = getSchemaDataById(OCAPackage, editingSchemaId);

        if (schemaData) {
          const schemaAttributes = schemaData.attributes || {};
          const newAttributeRowData = Object.entries(schemaAttributes).map(
            ([key, value]) => {
              // Check if this attribute has entry codes (is a list)
              const hasEntryCodes =
                schemaData.overlays?.entry &&
                schemaData.overlays.entry.some(
                  (entryOverlay) =>
                    entryOverlay.attribute_entries && entryOverlay.attribute_entries[key]
                );

              // Handle schema references (refs/refn) - these should be "Child Schema" not a type
              let displayType = value;
              if (Array.isArray(value)) {
                const arrayType = value[0] || "Unknown";
                displayType = `Array[${arrayType}]`;
              }
              if (
                displayType &&
                (displayType.startsWith("refs:") || displayType.startsWith("refn:"))
              ) {
                displayType = "Child Schema";
              }

              return {
                Attribute: key,
                Type: displayType,
                Description: "",
                Required: false,
                EntryCodes: [],
                List: hasEntryCodes
              };
            }
          );

          setAttributeRowData(newAttributeRowData);
          setAttributesList(Object.keys(schemaAttributes));

          // Save to MultiSchemaContext
          updateSchemaState(editingSchemaId, {
            attributes: newAttributeRowData,
            attributesList: Object.keys(schemaAttributes)
          });

          // Update overlay context with schema's overlay data
          if (schemaData.overlays) {
            const newOverlay = { ...overlay };

            // Import label overlays
            if (schemaData.overlays.label && Array.isArray(schemaData.overlays.label)) {
              const labelOverlays = {};
              schemaData.overlays.label.forEach((labelOverlay) => {
                const lang = labelOverlay.language;
                if (lang) {
                  labelOverlays[lang] = labelOverlay.attribute_labels || {};
                }
              });
              newOverlay.label = labelOverlays;
            }

            // Import other overlays
            if (schemaData.overlays.unit) newOverlay.unit = schemaData.overlays.unit;
            if (schemaData.overlays.cardinality)
              newOverlay.cardinality = schemaData.overlays.cardinality;
            if (schemaData.overlays.format)
              newOverlay.format = schemaData.overlays.format;
            if (schemaData.overlays.character_encoding)
              newOverlay.character_encoding = schemaData.overlays.character_encoding;
            if (schemaData.overlays.conformance)
              newOverlay.conformance = schemaData.overlays.conformance;

            // Import entry overlays
            if (schemaData.overlays.entry && Array.isArray(schemaData.overlays.entry)) {
              const entryOverlays = {};
              schemaData.overlays.entry.forEach((entryOverlay) => {
                const lang = entryOverlay.language;
                if (lang) {
                  entryOverlays[lang] = entryOverlay.attribute_entries || {};
                }
              });
              newOverlay.entry = entryOverlays;
            }

            setOverlay(newOverlay);
          }
        }
      }
    }
  }, [editingSchemaId, OCAPackage]);

  // Save attribute data to MultiSchemaContext whenever it changes
  useEffect(() => {
    if (editingSchemaId && attributeRowData.length > 0) {
      updateSchemaState(editingSchemaId, {
        attributes: attributeRowData,
        attributesList
      });
    }
  }, [attributeRowData, attributesList, editingSchemaId, updateSchemaState]);

  // Keep global context in sync with local state
  useEffect(() => {
    setGlobalAttributesList(attributesList);
  }, [attributesList, setGlobalAttributesList]);

  // Update canDelete when attributeRowData changes
  useEffect(() => {
    setCanDelete(attributeRowData.length !== 1);
  }, [attributeRowData.length]);

  // Stops grid editing when clicking outside grid
  useEffect(() => {
    const handleClickOutsideGrid = (event) => {
      if (
        gridRef.current.api &&
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

  const handleSave = () => {
    entryCodesRef.current = false;
    navigationSafe.current = false;
    typeBlanksRef.current = false;
    gridRef.current.api.stopEditing();

    const validateForward = () => {
      const allAttributes = [];
      const duplicateAttributes = [];
      let blankAttributes = false;

      const errorOptions = {
        duplicates: t("Please enter a unique attribute name for each attribute"),
        blankAttribute: t("Attribute names cannot be blank"),
        codeInjection: t("Attribute names cannot include HTML"),
        blankType: t("Please enter a Type for all attributes"),
        disallowedCharacters: t("AttributeDisallowedCharErrorMessage")
      };
      let codeInjection = false;
      let hasDisallowedCharacters = false;

      attributeRowData.forEach((item) => {
        const attributeName = removeSpacesFromString(item.Attribute);

        if (hasDisallowedChars(attributeName)) {
          hasDisallowedCharacters = true;
        }

        if (
          attributeName.includes("/>") ||
          attributeName.includes("</") ||
          attributeName.includes("<svg") ||
          attributeName.includes("<script")
        ) {
          codeInjection = true;
        }

        if (!allAttributes.includes(attributeName)) {
          if (!attributeName) {
            blankAttributes = true;
          } else {
            allAttributes.push(attributeName);
          }
        } else {
          duplicateAttributes.push(attributeName);
        }
      });

      if (hasDisallowedCharacters) {
        return errorOptions.disallowedCharacters;
      }

      if (duplicateAttributes.length > 0) {
        return errorOptions.duplicates;
      }

      if (blankAttributes) {
        return errorOptions.blankAttribute;
      }

      if (codeInjection) {
        return errorOptions.codeInjection;
      }

      const newAttributeRowData = attributeRowData.map((item, index) => ({
        ...item,
        Attribute:
          item.Attribute !== allAttributes[index] ? allAttributes[index] : item.Attribute,
        Type:
          typesObjectRef.current && item.Type !== typesObjectRef.current[item.Attribute]
            ? typesObjectRef.current[item.Attribute]
            : item.Type
      }));

      newAttributeRowData.forEach((item) => {
        if (!item.Type) {
          typeBlanksRef.current = true;
        }
      });

      const noSpacesArray = removeSpacesFromArrayOfObjects(newAttributeRowData);
      setAttributeRowData(noSpacesArray);

      if (overlay[FIELD_RANGE_OVERLAY].selected) {
        const hasValidAttribute = noSpacesArray.some(
          (attribute) => attribute.Type === "Numeric" || attribute.Type === "DateTime"
        );

        if (!hasValidAttribute) {
          setOverlay((prev) => ({
            ...prev,
            [FIELD_RANGE_OVERLAY]: { ...prev[FIELD_RANGE_OVERLAY], selected: false }
          }));
        }
      }

      return allAttributes;
    };

    const validationResult = validateForward();

    if (typeof validationResult === "string") {
      setErrorMessage(validateForward());
      setTimeout(() => {
        setErrorMessage("");
      }, [2000]);
    } else {
      setAttributesList(validationResult);

      const newAttributesWithLists = [];
      attributeRowData.forEach((item) => {
        if (item.List === true) {
          newAttributesWithLists.push(item.Attribute);
        }
      });

      setAttributesWithLists(newAttributesWithLists);
      if (newAttributesWithLists.length > 0) {
        entryCodesRef.current = true;
        insertStep(2, { label: "Entry Codes", page: "Codes" });
      } else {
        removeStep("Entry Codes");
      }
      navigationSafe.current = true;
    }
  };

  const pageForwardSave = () => {
    handleSave();
    if (navigationSafe.current === true) {
      if (typeBlanksRef.current === true) {
        setShowCard(true);
      } else if (entryCodesRef.current) {
        setCurrentPage("Codes");
      } else {
        pageForward();
      }
    }
  };

  const pageBackSave = () => {
    handleSave();
    if (navigationSafe.current === true) {
      pageBack();
    }
  };

  return (
    <BackNextSkeleton
      isBack
      pageBack={pageBackSave}
      isForward
      pageForward={pageForwardSave}
    >
      {loading && attributeRowData?.length > 40 && <Loading />}
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
          attributeRowData={attributeRowData}
          setAttributeRowData={setAttributeRowData}
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
        attributeRowData={attributeRowData}
        setAttributeRowData={setAttributeRowData}
      />
    </BackNextSkeleton>
  );
}
