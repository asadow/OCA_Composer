import React, { useContext, useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Box, Typography } from "@mui/material";
import { Context } from "../App";
import SingleTable from "./SingleTable";
import { removeSpacesAndColonFromArrayOfObjects } from "../constants/removeSpaces";
import BackNextSkeleton from "../components/BackNextSkeleton";
import WarningEntryCodeDelete from "./WarningEntryCodeDelete";
import { useMultiSchema } from "../context/MultiSchemaContext";

const errorMessages = {
  fieldEmpty: "Please fill out all fields",
  quoteMisuse: "Fields cannot contain quotes or commas"
};

export default function EntryCodes() {
  const { t } = useTranslation();
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [selectedAttributesList, setSelectedAttributesList] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  // Multi-schema context
  const { activeSchemaId, getSchemaState, updateSchemaState } = useMultiSchema();
  
  // Global context
  const {
    attributeRowData: globalAttributeRowData,
    entryCodeRowData: globalEntryCodeRowData,
    setEntryCodeRowData,
    setSavedEntryCodes,
    attributesWithLists: globalAttributesWithLists,
    setCurrentPage,
    languages
  } = useContext(Context);

  // Use MultiSchemaContext data if editing a specific schema, otherwise use global context
  const currentSchemaState = getSchemaState(activeSchemaId);
  const attributeRowData = activeSchemaId && currentSchemaState ? currentSchemaState.attributes || [] : globalAttributeRowData;
  const entryCodeRowData = activeSchemaId && currentSchemaState ? currentSchemaState.entryCodes || {} : globalEntryCodeRowData;
  const attributesWithLists = activeSchemaId && currentSchemaState ? currentSchemaState.attributesWithLists || [] : globalAttributesWithLists;
  const [chosenTable, setChosenTable] = useState(0);
  const codeRefs = useRef();
  const pageForwardDisabledRef = useRef(false);
  const [showWarning, setShowWarning] = useState(false);

  // Create codeRefs so there can be multiple grids on the page
  useEffect(() => {
    if (!codeRefs.current) {
      codeRefs.current = attributesWithLists.map(() => React.createRef());
    }
  }, [attributesWithLists]);

  // Create data object and array for only attributes that have lists
  useEffect(() => {
    const filteredAttributes = attributeRowData.filter((item) => item.List === true);
    const attributeArray = filteredAttributes.map((item) => item.Attribute);
    setSelectedAttributes(filteredAttributes);
    setSelectedAttributesList(attributeArray);

    // Align entry code row arrays to the exact order of selected attributes to avoid index drift
    // Source of truth for existing codes is the schema state's entryCodeRowData (object keyed by attribute)
    const emptyRow = (() => {
      const row = { Code: "" };
      languages.forEach((lang) => {
        row[lang] = "";
      });
      return row;
    })();
    const alignedEntryCodesArray = attributeArray.map((attr) => {
      const rowsForAttr = Array.isArray(entryCodeRowData[attr])
        ? entryCodeRowData[attr]
        : [emptyRow];
      // Deep clone to decouple grid edits
      return rowsForAttr.map((r) => ({ ...r }));
    });
    setEntryCodeRowData(alignedEntryCodesArray);

    // If no attributes are marked as lists, redirect to LanguageDetails
    if (filteredAttributes.length === 0) {
      setCurrentPage("LanguageDetails");
    }
  }, [attributeRowData, languages, entryCodeRowData, setEntryCodeRowData, setCurrentPage]);

  const handleSave = () => {
    codeRefs.current.forEach((grid) => {
      grid.current.api.stopEditing();
    });

    const newEntryCodeObject = {};
    attributesWithLists.forEach((item) => {
      const newEntryCodeArray = [];
      // Check if entryCodeRowData exists for this attribute
      if (entryCodeRowData[item] && Array.isArray(entryCodeRowData[item])) {
        entryCodeRowData[item].forEach((obj) => {
          const newObj = {};
          newObj.Code = obj.Code;
          languages.forEach((language) => {
            newObj[language] = obj[language] || "";
          });
          newEntryCodeArray.push(newObj);
        });
      }

      newEntryCodeObject[item] = newEntryCodeArray;
    });

    // setSavedEntryCodes(newEntryCodeObject);
    const values = Object.values(newEntryCodeObject);
    values.forEach((item) => {
      item.forEach((obj) => {
        const values = Object.values(obj);
        values.forEach((value) => {
          if (!value) {
            pageForwardDisabledRef.current = true;
            setErrorMessage(t(errorMessages.fieldEmpty));
            setTimeout(() => {
              setErrorMessage("");
            }, [2000]);
          }
        });
      });
    });

    const keys = Object.keys(newEntryCodeObject);
    const newEntryCodesObject = {};
    keys.forEach((item) => {
      newEntryCodesObject[item] = removeSpacesAndColonFromArrayOfObjects(
        newEntryCodeObject[item]
      );
    });

    // Save to MultiSchemaContext if editing a specific schema
    if (activeSchemaId) {
      updateSchemaState(activeSchemaId, {
        entryCodes: newEntryCodesObject
      });
    }
    
    // Also save to global context for compatibility
    setSavedEntryCodes(newEntryCodesObject);
  };

  const pageBackSave = () => {
    handleSave();
    setCurrentPage("Details");
  };

  // Quotes, commas and blanks in these fields cause issues with the excel export (they interfere with the drop-down menu formatting)
  const pageForwardSave = () => {
    pageForwardDisabledRef.current = false;
    handleSave();
    if (!pageForwardDisabledRef.current) {
      setCurrentPage("LanguageDetails");
    }
  };

  const allCodesDisplay = selectedAttributesList.map((item, index) => (
    <SingleTable
      attribute={selectedAttributes[index]}
      key={selectedAttributes[index].Attribute}
      index={index}
      codeRefs={codeRefs}
      chosenTable={chosenTable}
      setChosenTable={setChosenTable}
      setShowCard={setShowWarning}
    />
  ));

  return (
    <BackNextSkeleton
      isBack
      pageBack={pageBackSave}
      isForward
      pageForward={pageForwardSave}
      errorMessage={errorMessage}
    >
      {showWarning && (
        <WarningEntryCodeDelete
          title={t("Warning")}
          fieldArray={[
            t("Your current entry codes for this attribute will be overwritten")
          ]}
          setShowCard={setShowWarning}
          handleForward={() => setCurrentPage("UploadEntryCodes")}
        />
      )}
      <Box sx={{ width: "90%", margin: "auto" }}>
        <Typography
          sx={{
            fontSize: 15,
            textAlign: "left",
            margin: "1rem 0 1rem 0",
            width: 500
          }}
        >
          {t(
            "You indicated in the previous step that one or more attributes is a list. Please add or upload entry codes:"
          )}
        </Typography>
        {selectedAttributes.length > 0 && allCodesDisplay}
      </Box>
    </BackNextSkeleton>
  );
}
