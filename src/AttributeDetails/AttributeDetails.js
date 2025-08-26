import React, { useRef, useContext, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Box, Typography } from "@mui/material";
import Grid from "./Grid";
import AddAttribute from "./AddAttribute";
import { Context } from "../App";
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
    attributeRowData,
    setAttributesList,
    setAttributeRowData,
    overlay,
    setOverlay,
    OCAPackage,
    editingSchemaId,
    setLanAttributeRowData,
    languages,
    setSavedEntryCodes
  } = useContext(Context);
  const [errorMessage, setErrorMessage] = useState("");
  const [canDelete, setCanDelete] = useState(attributeRowData.length !== 1);
  const [showAddAttribute, setShowAddAttribute] = useState(false);
  const [addByTab, setAddByTab] = useState(false);
  const [showCard, setShowCard] = useState(false);

  const [loading, setLoading] = useState(true);
  const navigationSafe = useRef();

  // Get the schema data for the currently editing schema
  const currentSchemaData = editingSchemaId ? getSchemaDataById(OCAPackage, editingSchemaId) : null;
  const gridRef = useRef();
  const refContainer = useRef();
  const entryCodesRef = useRef();
  const typeBlanksRef = useRef();
  const typesObjectRef = useRef({});
  const addButton1 = useRef();
  const addButton2 = useRef();

  useEffect(() => {
    const newTypesObjetRef = {};
    attributeRowData.forEach((item) => {
      newTypesObjetRef[item.Attribute] = item.Type;
    });
    typesObjectRef.current = newTypesObjetRef;
  }, [attributeRowData]);

  // When editing a specific schema, update the attribute data to match that schema
  useEffect(() => {
    if (editingSchemaId && currentSchemaData) {
      console.log("Editing schema:", editingSchemaId);
      console.log("Current schema data:", currentSchemaData);
      
                    // Import overlays data (units, labels, etc.) from the schema
       const schemaOverlays = currentSchemaData.overlays || {};
       console.log("Schema overlays:", schemaOverlays);
       
       // Convert the schema attributes to the format expected by the editor
       const schemaAttributes = currentSchemaData.attributes || {};
       const newAttributeRowData = Object.entries(schemaAttributes).map(([key, value]) => {
         // Check if this attribute has entry codes (is a list)
         const hasEntryCodes = schemaOverlays.entry && 
           schemaOverlays.entry.some((entryOverlay) => 
             entryOverlay.attribute_entries && 
             entryOverlay.attribute_entries[key]
           );
         
                   // Handle schema references (refs/refn) - these should be "Child Schema" not a type
          let displayType = value;
          if (Array.isArray(value)) {
            // If it's an array, format it as "Array[Type]" (e.g., ["Text"] -> "Array[Text]")
            const arrayType = value[0] || "Unknown";
            displayType = `Array[${arrayType}]`;
            console.log("Array value:", value, "Formatted result:", displayType);
          }
          if (displayType && (displayType.startsWith('refs:') || displayType.startsWith('refn:'))) {
            displayType = "Child Schema";
          }
         
         return {
           Attribute: key,
           Type: displayType,
           Description: "",
           Required: false,
           EntryCodes: [],
           List: hasEntryCodes // Set List to true if entry codes exist
         };
       });
       
       console.log("New attribute row data:", newAttributeRowData);
       
       // Only update if the data is different to avoid infinite loops
       if (JSON.stringify(newAttributeRowData) !== JSON.stringify(attributeRowData)) {
         setAttributeRowData(newAttributeRowData);
         
         // Also update the attributesList to show the correct attributes in Step 1
         const newAttributesList = Object.keys(schemaAttributes);
         setAttributesList(newAttributesList);
       }
      console.log("Schema overlays:", schemaOverlays);
      
      // Update the overlay context with the schema's overlay data
      if (schemaOverlays) {
        const newOverlay = { ...overlay };
        
        // Import label overlays (for Step 3 Language-dependent Attribute Details)
        if (schemaOverlays.label && Array.isArray(schemaOverlays.label)) {
          // Convert array of label overlays to the format expected by the editor
          const labelOverlays = {};
          schemaOverlays.label.forEach((labelOverlay) => {
            const lang = labelOverlay.language;
            if (lang) {
              labelOverlays[lang] = labelOverlay.attribute_labels || {};
            }
          });
          newOverlay.label = labelOverlays;
        }
        
        // Import unit overlays (for Step 4 Unit Framing)
        if (schemaOverlays.unit) {
          newOverlay.unit = schemaOverlays.unit;
        }
        
        // Import cardinality overlays (for Step 5 Cardinality)
        if (schemaOverlays.cardinality) {
          newOverlay.cardinality = schemaOverlays.cardinality;
        }
        
        // Import format overlays (for Step 6 Format Rules)
        if (schemaOverlays.format) {
          newOverlay.format = schemaOverlays.format;
        }
        
        // Import character encoding overlays
        if (schemaOverlays.character_encoding) {
          newOverlay.character_encoding = schemaOverlays.character_encoding;
        }
        
        // Import conformance overlays
        if (schemaOverlays.conformance) {
          newOverlay.conformance = schemaOverlays.conformance;
        }
        
        // Import entry overlays (for entry codes)
        if (schemaOverlays.entry && Array.isArray(schemaOverlays.entry)) {
          // Convert array of entry overlays to the format expected by the editor
          const entryOverlays = {};
          schemaOverlays.entry.forEach((entryOverlay) => {
            const lang = entryOverlay.language;
            if (lang) {
              entryOverlays[lang] = entryOverlay.attribute_entries || {};
            }
          });
          newOverlay.entry = entryOverlays;
        }
        
        console.log("Updated overlay data:", newOverlay);
        setOverlay(newOverlay);
        
        // Update language attribute row data with labels from the schema
        if (schemaOverlays.label && Array.isArray(schemaOverlays.label)) {
          const newLanAttributeRowData = {};
          
          languages.forEach((language) => {
            const langCode = language === "English" ? "eng" : language === "French" ? "fra" : language.toLowerCase();
            const labelOverlay = schemaOverlays.label.find((l) => l.language === langCode);
            
            if (labelOverlay && labelOverlay.attribute_labels) {
              const languageData = [];
              Object.entries(schemaAttributes).forEach(([key]) => {
                languageData.push({
                  Attribute: key,
                  Label: labelOverlay.attribute_labels[key] || "",
                  Description: "",
                  List: "Not a List"
                });
              });
              newLanAttributeRowData[language] = languageData;
            }
          });
          
                     if (Object.keys(newLanAttributeRowData).length > 0) {
             console.log("Updated language attribute data:", newLanAttributeRowData);
             setLanAttributeRowData(newLanAttributeRowData);
           }
         }
         
         // Import entry codes data
         if (schemaOverlays.entry && Array.isArray(schemaOverlays.entry)) {
           const newSavedEntryCodes = {};
           
           schemaOverlays.entry.forEach((entryOverlay) => {
             const lang = entryOverlay.language;
             const langCode = lang === "eng" ? "English" : lang === "fra" ? "French" : lang;
             
             Object.entries(entryOverlay.attribute_entries || {}).forEach(([attrName, entries]) => {
               if (!newSavedEntryCodes[attrName]) {
                 newSavedEntryCodes[attrName] = [];
               }
               
               Object.entries(entries).forEach(([code, value]) => {
                 // Find existing entry or create new one
                 let existingEntry = newSavedEntryCodes[attrName].find((entry) => entry.Code === code);
                 if (!existingEntry) {
                   existingEntry = { Code: code };
                   newSavedEntryCodes[attrName].push(existingEntry);
                 }
                 existingEntry[langCode] = value;
               });
             });
           });
           
           if (Object.keys(newSavedEntryCodes).length > 0) {
             console.log("Updated entry codes data:", newSavedEntryCodes);
             setSavedEntryCodes(newSavedEntryCodes);
           }
         }
       }
     }
   }, [editingSchemaId, currentSchemaData, setAttributeRowData, attributeRowData, overlay, setOverlay, setLanAttributeRowData, languages, setSavedEntryCodes]);

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

        // REVISIT
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

    // validateForward either returns an error message (string) or it removes blanks from (and sets) Attribute Row Data and returns the current array of attributes
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
      />
    </BackNextSkeleton>
  );
}
