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
import { getSchemaDataById } from "../SchemaVisualization/dataUtils";
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

  // Multi-schema context
  const { activeSchemaId, getSchemaState, updateSchemaState } = useMultiSchema();

  // Global context
  const { languages, overlay, OCAPackage, editingSchemaId } = useContext(Context);

  // Use MultiSchemaContext data if editing a specific schema, otherwise use global context
  const schemaId = activeSchemaId || editingSchemaId;
  const currentSchemaState = getSchemaState(schemaId) || {};
  const attributesList = currentSchemaState.attributesList || [];
  const lanAttributeRowData = currentSchemaState.lanAttributeRowData || {};
  const attributeRowData = currentSchemaState.attributes || [];
  const savedEntryCodes = currentSchemaState.entryCodes || {};
  const attributesWithLists = currentSchemaState.attributesWithLists || [];

  // Fallback: if attributesList not persisted for this schema yet, derive from attributes
  const effectiveAttributesList = useMemo(() => {
    if (Array.isArray(attributesList) && attributesList.length > 0) return attributesList;
    if (Array.isArray(attributeRowData) && attributeRowData.length > 0) {
      return attributeRowData.map((r) => r.Attribute);
    }
    // Fallback to raw package when state hasn't been initialized for this schema
    const schemaId = activeSchemaId;
    if (OCAPackage && schemaId) {
      const schemaData = getSchemaDataById(OCAPackage, schemaId);
      if (schemaData && schemaData.attributes) {
        return Object.keys(schemaData.attributes);
      }
    }
    return [];
  }, [attributesList, attributeRowData, OCAPackage, schemaId]);

  // Debug which schema/state this grid renders from
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("LanGrid: active schema", schemaId, {
      attributesList,
      attributeRowDataLength: Array.isArray(attributeRowData) ? attributeRowData.length : 0,
      effectiveAttributesList
    });
  }, [schemaId, attributesList, attributeRowData, effectiveAttributesList]);

  // Sets Language Dependent Attribute row data
  useEffect(() => {
    // Recompute from scratch for the current schema to avoid leaking rows across schemas
    const newLanAttributeRowData = {};

    // Build schema-scoped overlay maps (labels, entries, codes) for the active schema only
    const schemaData = OCAPackage && schemaId ? getSchemaDataById(OCAPackage, schemaId) : null;
    const labelByLang = {};
    const entriesByLang = {};
    let entryCodesByAttr = {};
    if (schemaData && schemaData.overlays) {
      if (Array.isArray(schemaData.overlays.label)) {
        schemaData.overlays.label.forEach((lo) => {
          if (lo && lo.language) labelByLang[lo.language] = lo.attribute_labels || {};
        });
      }
      if (Array.isArray(schemaData.overlays.entry)) {
        schemaData.overlays.entry.forEach((eo) => {
          if (eo && eo.language) entriesByLang[eo.language] = eo.attribute_entries || {};
        });
      }
      if (schemaData.overlays.entry_code) {
        entryCodesByAttr = schemaData.overlays.entry_code.attribute_entry_codes || {};
      }
    }
    languages.forEach((language) => {
      const overlayLang =
        languageNameToAlpha3Codes[`${language}`.toLowerCase()] || language;
      if (!newLanAttributeRowData[language]) {
        const newLanguageList = [];
        effectiveAttributesList.forEach((item) => {
          // Prefer saved entry codes (user edits) for List display; fallback to overlays
          let listDisplayArray = (savedEntryCodes?.[item] || [])
            .map((row) => row?.[language])
            .filter((txt) => txt && txt.trim() !== "");
          if (listDisplayArray.length === 0) {
            const codes = entryCodesByAttr?.[item] || [];
            const labelsMap = (entriesByLang?.[overlayLang]?.[item]) || {};
            listDisplayArray = codes
              .map((code) => labelsMap[code])
              .filter((txt) => txt && txt.trim() !== "");
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
          let listDisplayArray = (savedEntryCodes?.[item.Attribute] || [])
            .map((row) => row?.[language])
            .filter((txt) => txt && txt.trim() !== "");
          if (listDisplayArray.length === 0) {
            const codes = entryCodesByAttr?.[item.Attribute] || [];
            const labelsMap = (entriesByLang?.[overlayLang]?.[item.Attribute]) || {};
            listDisplayArray = codes
              .map((code) => labelsMap[code])
              .filter((txt) => txt && txt.trim() !== "");
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

    // Save to MultiSchemaContext for the active schema only
    if (activeSchemaId) {
      updateSchemaState(activeSchemaId, {
        lanAttributeRowData: newLanAttributeRowData
      });
    }
  }, [
    languages,
    savedEntryCodes,
    attributeRowData,
    overlay,
    activeSchemaId,
    updateSchemaState,
    effectiveAttributesList,
    lanAttributeRowData
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
  }, [effectiveAttributesList, t]);

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

    // Update MultiSchemaContext
    if (schemaId) {
      updateSchemaState(schemaId, {
        lanAttributeRowData: updatedLanAttributeRowData
      });
    }
  }, [lanAttributeRowData, currentLanguage, schemaId, updateSchemaState]);

  return (
    <div className="ag-theme-balham" style={{ width: 890 }}>
      <style>{gridStyles}</style>
      <AgGridReact
        ref={gridRef}
        rowData={lanAttributeRowData[currentLanguage]}
        columnDefs={columnDefs}
        onCellKeyDown={onCellKeyDown}
        onCellValueChanged={onCellValueChanged}
        domLayout="autoHeight"
        onGridReady={onGridReady}
      />
    </div>
  );
}
