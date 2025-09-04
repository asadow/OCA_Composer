import React, {
  useState,
  useEffect,
  useContext,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useMemo
} from "react";
import { useTranslation } from "react-i18next";
import { AgGridReact } from "ag-grid-react";
import { Context } from "../App";
import { useMultiSchema } from "../context/MultiSchemaContext";
import CellHeader from "../components/CellHeader";
import { greyCellStyle, gridStyles, preWrapWordBreak } from "../constants/styles";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-balham.css";
import { MAX_ATTR_DESCRIPTION_CHARS, MAX_ATTR_LABEL_CHARS } from "../constants/constants";
import { languageNameToAlpha3Codes } from "../constants/isoCodes";

const textareaStyle = {
  width: "98%",
  height: "100%",
  resize: "none",
  outline: "none",
  fontFamily:
    // eslint-disable-next-line quotes
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
  fontSize: "12px"
};

// Compact renderer moved to module scope to avoid defining components during render
const CompactListRenderer = ({ value }) => {
  const text = value || "";
  return (
    <span
      title={text}
      style={{
        display: "inline-block",
        maxWidth: "100%",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }}
    >
      {text}
    </span>
  );
};

const TextareaCellEditor = forwardRef((props, ref) => {
  const [value, setValue] = useState(props.value);

  useEffect(() => {
    setValue(props.value);
  }, [props.value]);

  useImperativeHandle(ref, () => ({
    getValue() {
      return value;
    },

    isCancelBeforeStart() {
      return false;
    },

    isCancelAfterEnd() {
      return false;
    }
  }));

  return (
    <textarea
      maxLength={MAX_ATTR_DESCRIPTION_CHARS}
      style={textareaStyle}
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
});

export default function LanGrid({ gridRef, currentLanguage, setLoading }) {
  const { t } = useTranslation();

  // Use MultiSchemaContext
  const {
    activeSchemaId,
    editingSchemaId,
    getSchemaState,
    updateSchemaState,
    getCompleteSchema
  } = useMultiSchema();

  const currentSchemaId = activeSchemaId || editingSchemaId;

  // Global context (for languages and fallback overlay)
  const { languages, overlay: globalOverlay } = useContext(Context);

  // Get schema-specific overlay data from unified context, formatted for LanGrid
  const overlay = useMemo(() => {
    const completeSchema = getCompleteSchema(currentSchemaId);
    const rawOverlays = completeSchema?.overlays;
    
    if (!rawOverlays) {
      return globalOverlay || {};
    }

    // Transform OCA overlay format to LanGrid expected format
    const transformedOverlay = {
      label: {},
      entry: {}
    };

    // Process label overlays
    if (rawOverlays.label && Array.isArray(rawOverlays.label)) {
      rawOverlays.label.forEach((labelOverlay) => {
        const lang = labelOverlay.language;
        if (lang && labelOverlay.attribute_labels) {
          transformedOverlay.label[lang] = labelOverlay.attribute_labels;
        }
      });
    }

    // Process entry overlays
    if (rawOverlays.entry && Array.isArray(rawOverlays.entry)) {
      rawOverlays.entry.forEach((entryOverlay) => {
        const lang = entryOverlay.language;
        if (lang && entryOverlay.attribute_entries) {
          transformedOverlay.entry[lang] = entryOverlay.attribute_entries;
        }
      });
    }

    return transformedOverlay;
  }, [getCompleteSchema, currentSchemaId, globalOverlay]);

  // Get schema state data with stable references
  const schemaState = getSchemaState(currentSchemaId);
  const attributesList = useMemo(() => schemaState?.attributesList || [], [schemaState?.attributesList]);
  const lanAttributeRowData = useMemo(() => schemaState?.lanAttributeRowData || {}, [schemaState?.lanAttributeRowData]);
  const attributeRowData = useMemo(() => schemaState?.attributes || [], [schemaState?.attributes]);
  const attributesWithLists = useMemo(() => schemaState?.attributesWithLists || [], [schemaState?.attributesWithLists]);

  // Fallback: if attributesList not persisted for this schema yet, derive from attributes
  const effectiveAttributesList = useMemo(() => {
    if (Array.isArray(attributesList) && attributesList.length > 0) return attributesList;
    if (Array.isArray(attributeRowData) && attributeRowData.length > 0) {
      return attributeRowData.map((r) => r.Attribute);
    }
    return [];
  }, [attributesList, attributeRowData]);

  // Debug which schema/state this grid renders from
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("LanGrid: schema state", {
      currentSchemaId,
      activeSchemaId,
      editingSchemaId,
      attributesList,
      attributeRowDataLength: Array.isArray(attributeRowData) ? attributeRowData.length : 0,
      effectiveAttributesList,
      hasOverlay: !!overlay,
      overlayKeys: Object.keys(overlay || {})
    });
  }, [currentSchemaId, activeSchemaId, editingSchemaId, attributesList, attributeRowData, effectiveAttributesList, overlay]);

  // Sets Language Dependent Attribute row data
  useEffect(() => {
    if (!currentSchemaId) return;
    
    // Get entry codes inside useEffect to avoid dependency issues
    const currentSavedEntryCodes = getSchemaState(currentSchemaId)?.entryCodes || {};
    
    // Recompute from scratch for the current schema to avoid leaking rows across schemas
    const newLanAttributeRowData = {};

    // Build schema-scoped overlay maps (labels, entries, codes) from overlay context
    const labelByLang = {};
    const entriesByLang = {};
    
    // Get entry codes from schema state (same as ViewSchema)
    const entryCodesMap = currentSavedEntryCodes;
    
    // Use overlay data from context
    if (overlay?.label) {
      Object.keys(overlay.label).forEach((lang) => {
        labelByLang[lang] = overlay.label[lang] || {};
      });
    }
    if (overlay?.entry) {
      Object.keys(overlay.entry).forEach((lang) => {
        entriesByLang[lang] = overlay.entry[lang] || {};
      });
    }
    languages.forEach((language) => {
      const overlayLang =
        languageNameToAlpha3Codes[`${language}`.toLowerCase()] || language;
      if (!newLanAttributeRowData[language]) {
        const newLanguageList = [];
        effectiveAttributesList.forEach((item) => {
          // Prefer saved entry codes (user edits) for List display; fallback to overlays
          const overlayLangKey = languageNameToAlpha3Codes[`${language}`.toLowerCase()] || language;
          let listDisplayArray = (currentSavedEntryCodes?.[item] || [])
            .map((row) => row?.[overlayLangKey] || row?.[language])
            .filter((txt) => txt && txt.trim() !== "");
          
          if (item === 'q3' || item === 'q4') {
            console.log(`LanGrid List Debug - ${item} DETAILED:`, {
              language,
              savedEntryCodesForItem: currentSavedEntryCodes?.[item],
              firstRow: currentSavedEntryCodes?.[item]?.[0],
              listDisplayArray
            });
          }
          
          if (listDisplayArray.length === 0) {
            // Use same logic as ViewSchema - entryCodesMap contains arrays of objects
            const codesForAttr = Array.isArray(entryCodesMap[item]) 
              ? entryCodesMap[item] 
              : [];
            const overlayLangKey = languageNameToAlpha3Codes[`${language}`.toLowerCase()] || language;
            const labelForLang = (row) =>
              row[language] || row[overlayLangKey] || row.English || row.eng || row.Code;
            listDisplayArray = codesForAttr
              .map((row) => labelForLang(row))
              .filter(Boolean);
              
            if (item === 'q3' || item === 'q4') {
              console.log(`LanGrid List Debug - ${item} FALLBACK DETAILED:`, {
                codesForAttr,
                firstCodesRow: codesForAttr[0],
                overlayLangKey,
                listDisplayArray
              });
            }
          }
          const listDisplayString = listDisplayArray.join(" | ");
          let listDisplay = listDisplayString || "Not a List";
          if (listDisplayArray.length > 3) {
            const shown = listDisplayArray.slice(0, 3).join(" | ");
            const remaining = listDisplayArray.length - 3;
            listDisplay = `${shown} +${remaining} more`;
          }
          newLanguageList.push({
            Attribute: item,
            Label: (labelByLang?.[overlayLang]?.[item]) || "",
            Description: "",
            List: listDisplay
          });
        });
        newLanAttributeRowData[language] = newLanguageList;
      } else {
        const newLanguageList = [];
        attributeRowData.forEach((item) => {
          // Find existing data for this attribute in this language
          const existingData = newLanAttributeRowData[language].find(
            (i) => i.Attribute === item.Attribute
          );

          const newLabel = existingData ? existingData.Label : "";
          const newDescription = existingData ? existingData.Description : "";
          // Prefer saved entry codes (user edits) for List display; fallback to overlays
          const overlayLangKey = languageNameToAlpha3Codes[`${language}`.toLowerCase()] || language;
          let listDisplayArray = (currentSavedEntryCodes?.[item.Attribute] || [])
            .map((row) => row?.[overlayLangKey] || row?.[language])
            .filter((txt) => txt && txt.trim() !== "");
          if (listDisplayArray.length === 0) {
            // Use same logic as ViewSchema - entryCodesMap contains arrays of objects
            const codesForAttr = Array.isArray(entryCodesMap[item.Attribute]) 
              ? entryCodesMap[item.Attribute] 
              : [];
            const overlayLangKey = languageNameToAlpha3Codes[`${language}`.toLowerCase()] || language;
            const labelForLang = (row) =>
              row[language] || row[overlayLangKey] || row.English || row.eng || row.Code;
            listDisplayArray = codesForAttr
              .map((row) => labelForLang(row))
              .filter(Boolean);
          }
          const listDisplayString = listDisplayArray.join(" | ");
          let listDisplay = listDisplayString || "Not a List";
          if (listDisplayArray.length > 3) {
            const shown = listDisplayArray.slice(0, 3).join(" | ");
            const remaining = listDisplayArray.length - 3;
            listDisplay = `${shown} +${remaining} more`;
          }

          const newObj = {
            Attribute: item.Attribute,
            Label: newLabel || (labelByLang?.[overlayLang]?.[item.Attribute]) || "",
            Description: newDescription,
            List: listDisplay
          };
          newLanguageList.push(newObj);
        });
        newLanAttributeRowData[language] = newLanguageList;
      }
    });

    // Save to schema state
    if (currentSchemaId) {
      updateSchemaState(currentSchemaId, {
        lanAttributeRowData: newLanAttributeRowData
      });
    }
  }, [
    languages,
    attributeRowData,
    overlay,
    currentSchemaId,
    updateSchemaState,
    effectiveAttributesList,
    getSchemaState
  ]);

  const [columnDefs, setColumnDefs] = useState([]);

  useEffect(() => {
    setColumnDefs([
      {
        field: "Attribute",
        editable: false,
        width: 120,
        autoHeight: true,
        cellStyle: () => preWrapWordBreak,
        headerComponent: CellHeader,
        headerComponentParams: {
          headerText: t("Attribute"),
          helpText: t("This is the name for the attribute and, for example...")
        }
      },
      {
        field: "Label",
        editable: true,
        width: 250,
        autoHeight: true,
        cellStyle: () => preWrapWordBreak,
        headerComponent: CellHeader,
        headerComponentParams: {
          headerText: t("Label"),
          constraint: t("max label chars", { maxLabelChars: MAX_ATTR_LABEL_CHARS }),
          helpText: t("This is the language specific label for an attribute")
        },
        cellEditorParams: {
          maxLength: MAX_ATTR_LABEL_CHARS
        }
      },
      {
        field: "Description",
        editable: true,
        width: 260,
        cellEditor: TextareaCellEditor,
        autoHeight: true,
        cellStyle: () => preWrapWordBreak,
        headerComponent: CellHeader,
        headerComponentParams: {
          headerText: t("Description"),
          constraint: t("max description chars", {
            maxDescriptionChars: MAX_ATTR_DESCRIPTION_CHARS
          }),
          helpText: t("This is a language specific description of the attribute...")
        }
      },
      {
        field: "List",
        headerName: t("List"),
        editable: false,
        flex: 2,
        minWidth: 320,
        tooltipField: "List",
        cellRenderer: CompactListRenderer,
        cellStyle: (params) =>
          attributesWithLists.includes(params.data.Attribute) ? {} : greyCellStyle
      }
    ]);
  }, [effectiveAttributesList, t, attributesWithLists]);

  const onCellKeyDown = (e) => {
    const keyPressed = e.event.code;
    const isLabelRow = e.column.colId === "Label";

    if (keyPressed === "Enter" && isLabelRow) {
      const { api } = e;
      const editingRowIndex = e.rowIndex;
      api.setFocusedCell(editingRowIndex + 1, "Label");
    }
  };

  const onGridReady = useCallback(() => {
    setLoading(false);
  }, [setLoading]);

  const onCellValueChanged = useCallback((event) => {
    const { colDef, data, newValue } = event;
    const attributeName = data.Attribute;
    const { field } = colDef;

    // Update local lanAttributeRowData
    const updatedLanAttributeRowData = { ...lanAttributeRowData };
    if (!updatedLanAttributeRowData[currentLanguage]) {
      updatedLanAttributeRowData[currentLanguage] = [];
    }
    
    updatedLanAttributeRowData[currentLanguage] = updatedLanAttributeRowData[currentLanguage].map((row) => 
      row.Attribute === attributeName 
        ? { ...row, [field]: newValue }
        : row
    );

    // Update schema state
    if (currentSchemaId) {
      updateSchemaState(currentSchemaId, {
        lanAttributeRowData: updatedLanAttributeRowData
      });
    }
  }, [lanAttributeRowData, currentLanguage, currentSchemaId, updateSchemaState]);

  // Memoized function to update List column data
  const updateListColumn = useCallback(() => {
    if (!currentLanguage || !currentSchemaId) return;

    const schemaState = getSchemaState(currentSchemaId);
    const savedEntryCodes = schemaState?.entryCodes || {};
    const currentLangData = schemaState?.lanAttributeRowData?.[currentLanguage] || [];
    
    // Update List column for current language
    const updatedLangData = currentLangData.map((row) => {
      const attrName = row.Attribute;
      const entryCodesForAttr = savedEntryCodes[attrName] || [];
      
      if (entryCodesForAttr.length > 0) {
        const listItems = entryCodesForAttr
          .map((codeRow) => codeRow[currentLanguage] || codeRow.Code)
          .filter(Boolean);
        
        let listDisplay = listItems.join(" | ") || "Not a List";
        if (listItems.length > 3) {
          const shown = listItems.slice(0, 3).join(" | ");
          const remaining = listItems.length - 3;
          listDisplay = `${shown} +${remaining} more`;
        }
        
        return { ...row, List: listDisplay };
      }
      return { ...row, List: "Not a List" };
    });

    // Only update if the List values actually changed (to prevent infinite loops)
    const listDataChanged = currentLangData.some((row, index) => {
      const newRow = updatedLangData[index];
      return newRow && row.List !== newRow.List;
    });

    if (listDataChanged) {
      const updatedLanAttributeRowData = {
        ...schemaState.lanAttributeRowData,
        [currentLanguage]: updatedLangData
      };
      
      updateSchemaState(currentSchemaId, {
        lanAttributeRowData: updatedLanAttributeRowData
      });
    }
  }, [currentLanguage, currentSchemaId, getSchemaState, updateSchemaState]);

  // Refresh List data when currentLanguage changes
  useEffect(() => {
    updateListColumn();
  }, [updateListColumn]);

  return (
    <div className="ag-theme-balham" style={{ width: 890 }}>
      <style>{gridStyles}</style>
      {lanAttributeRowData[currentLanguage] && lanAttributeRowData[currentLanguage].length > 0 ? (
        <AgGridReact
          ref={gridRef}
          rowData={lanAttributeRowData[currentLanguage]}
          columnDefs={columnDefs}
          onCellKeyDown={onCellKeyDown}
          onCellValueChanged={onCellValueChanged}
          domLayout="autoHeight"
          onGridReady={onGridReady}
        />
      ) : (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          {t("No attributes available")}
        </div>
      )}
    </div>
  );
}
