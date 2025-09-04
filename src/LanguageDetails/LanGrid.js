import React, {
  useState,
  useEffect,
  useContext,
  useImperativeHandle,
  forwardRef,
  useCallback
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

  // Multi-schema context
  const { activeSchemaId, getSchemaState, updateSchemaState } = useMultiSchema();

  // Global context
  const {
    attributesList: globalAttributesList,
    lanAttributeRowData: globalLanAttributeRowData,
    setLanAttributeRowData,
    attributeRowData: globalAttributeRowData,
    savedEntryCodes: globalSavedEntryCodes,
    attributesWithLists: globalAttributesWithLists,
    languages,
    overlay
  } = useContext(Context);

  // Use MultiSchemaContext data if editing a specific schema, otherwise use global context
  const currentSchemaState = getSchemaState(activeSchemaId);
  const attributesList =
    activeSchemaId && currentSchemaState
      ? currentSchemaState.attributesList || []
      : globalAttributesList;
  const lanAttributeRowData =
    activeSchemaId && currentSchemaState
      ? currentSchemaState.lanAttributeRowData || {}
      : globalLanAttributeRowData;
  const attributeRowData =
    activeSchemaId && currentSchemaState
      ? currentSchemaState.attributes || []
      : globalAttributeRowData;
  const savedEntryCodes =
    activeSchemaId && currentSchemaState
      ? currentSchemaState.entryCodes || {}
      : globalSavedEntryCodes;
  const attributesWithLists =
    activeSchemaId && currentSchemaState
      ? currentSchemaState.attributesWithLists || []
      : globalAttributesWithLists;

  // Sets Language Dependent Attribute row data
  useEffect(() => {
    const newLanAttributeRowData = JSON.parse(JSON.stringify(lanAttributeRowData));
    languages.forEach((language) => {
      const overlayLang =
        languageNameToAlpha3Codes[`${language}`.toLowerCase()] || language;
      if (!newLanAttributeRowData[language]) {
        const newLanguageList = [];
        attributesList.forEach((item) => {
          // Prefer saved entry codes (user edits) for List display; fallback to overlays
          let listDisplayArray = (savedEntryCodes?.[item] || [])
            .map((row) => row?.[language])
            .filter((txt) => txt && txt.trim() !== "");
          if (listDisplayArray.length === 0) {
            const codes = overlay?.entry_code?.attribute_entry_codes?.[item] || [];
            const labelsMap = overlay?.entry?.[overlayLang]?.[item] || {};
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
            Label: overlay?.label?.[overlayLang]?.[item] || "",
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
            const codes =
              overlay?.entry_code?.attribute_entry_codes?.[item.Attribute] || [];
            const labelsMap = overlay?.entry?.[overlayLang]?.[item.Attribute] || {};
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
            Label: newLabel || overlay?.label?.[overlayLang]?.[item.Attribute] || "",
            Description: newDescription,
            List: listDisplay
          };
          newLanguageList.push(newObj);
        });
        newLanAttributeRowData[language] = newLanguageList;
      }
    });

    // Save to MultiSchemaContext if editing a specific schema
    if (activeSchemaId) {
      updateSchemaState(activeSchemaId, {
        lanAttributeRowData: newLanAttributeRowData
      });
    }

    // Also save to global context for compatibility
    setLanAttributeRowData(newLanAttributeRowData);
  }, [
    languages,
    savedEntryCodes,
    attributeRowData,
    overlay,
    activeSchemaId,
    updateSchemaState,
    setLanAttributeRowData,
    attributesList,
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
  }, [attributesList, t]);

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

  return (
    <div className="ag-theme-balham" style={{ width: 890 }}>
      <style>{gridStyles}</style>
      <AgGridReact
        ref={gridRef}
        rowData={lanAttributeRowData[currentLanguage]}
        columnDefs={columnDefs}
        onCellKeyDown={onCellKeyDown}
        domLayout="autoHeight"
        onGridReady={onGridReady}
      />
    </div>
  );
}
