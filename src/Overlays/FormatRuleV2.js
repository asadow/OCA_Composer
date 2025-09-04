import { Box, Link } from "@mui/material";
import React, { useCallback, useContext, useMemo, useRef, useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import { useTranslation } from "react-i18next";
import { Context } from "../App";
import { useMultiSchema } from "../context/MultiSchemaContext";
import "ag-grid-community/styles/ag-theme-balham.css";
import BackNextSkeleton from "../components/BackNextSkeleton";
import CellHeader from "../components/CellHeader";
import { gridStyles, preWrapWordBreak, greyCellStyle } from "../constants/styles";
import TypeTooltip from "../AttributeDetails/TypeTooltip";
import DeleteConfirmation from "./DeleteConfirmation";
import { FormatRuleTypeRenderer, TrashCanButton } from "./FormatRuleCellRender";
import Loading from "../components/Loading";
import {
  CUSTOM_FORMAT_RULE
} from "../constants/constants";

const allowOverflowStyle = {
  ...preWrapWordBreak,
  overflow: "auto"
};

const FormatRulesV2 = () => {
  const { t } = useTranslation();
  const {
    setCurrentPage
  } = useContext(Context);
  
  // Use MultiSchema context with standard pattern
  const { 
    activeSchemaId, 
    editingSchemaId, 
    getSchemaState, 
    updateSchemaState,
    updateOverlaySelection,
    setSelectedOverlay
  } = useMultiSchema();
  
  const currentSchemaId = activeSchemaId || editingSchemaId;
  const schemaState = getSchemaState(currentSchemaId);
  
  const updateCurrentSchema = useCallback((updates) => {
    if (currentSchemaId) {
      updateSchemaState(currentSchemaId, updates);
    }
  }, [currentSchemaId, updateSchemaState]);
  
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [loading, setLoading] = useState(true);
  const gridRef = useRef();
  
  // Initialize format rule data from schema attributes if not exists
  useEffect(() => {
    if (schemaState?.attributes && !schemaState?.formatRuleData) {
      // Only create if formatRuleData doesn't exist at all
      const newFormatRuleData = schemaState.attributes.map((attr) => ({
        Attribute: attr.Attribute,
        Type: attr.Type || "Text",
        "Format Rule": "",
        [CUSTOM_FORMAT_RULE]: ""
      }));
      updateCurrentSchema({ formatRuleData: newFormatRuleData });
    } else if (schemaState?.attributes && schemaState?.formatRuleData) {
      // Ensure all attributes are represented in formatRuleData, but preserve existing values
      const existingRules = new Map(schemaState.formatRuleData.map((rule) => [rule.Attribute, rule]));
      const completeFormatRuleData = schemaState.attributes.map((attr) => {
        const existingRule = existingRules.get(attr.Attribute);
        return existingRule ? {
          ...existingRule,
          Type: attr.Type || "Text" // Update type in case it changed
        } : {
          Attribute: attr.Attribute,
          Type: attr.Type || "Text",
          "Format Rule": "",
          [CUSTOM_FORMAT_RULE]: ""
        };
      });
      
      // Only update if we're adding new attributes (length difference) or if any attribute is missing
      const needsUpdate = completeFormatRuleData.length !== schemaState.formatRuleData.length ||
        schemaState.attributes.some((attr) => !existingRules.has(attr.Attribute));
      
      if (needsUpdate) {
        updateCurrentSchema({ formatRuleData: completeFormatRuleData });
      }
    }
    // Set loading to false once data is ready or if we already have data
    if (schemaState?.formatRuleData || schemaState?.attributes) {
      setLoading(false);
    }
  }, [schemaState?.attributes, schemaState?.formatRuleData, updateCurrentSchema]);
  
  // Always get data from schema state - no fallback needed
  const formatRuleRowData = useMemo(() => 
    schemaState?.formatRuleData || []
  , [schemaState?.formatRuleData]);
  
  const rangeRowData = useMemo(() => 
    schemaState?.rangeData || []
  , [schemaState?.rangeData]);
  
  const setFormatRuleRowData = useCallback((newData) => {
    updateCurrentSchema({ formatRuleData: newData });
  }, [updateCurrentSchema]);
  
  const setRangeRowData = useCallback((newData) => {
    updateCurrentSchema({ rangeData: newData });
  }, [updateCurrentSchema]);

  const handleSave = useCallback(() => {
    gridRef.current.api.stopEditing();
    const newFormatRuleRowData = gridRef.current.api
      .getRenderedNodes()
      ?.map((node) => node?.data);
    setFormatRuleRowData(newFormatRuleRowData);

    const newRangeRowData = [];

    newFormatRuleRowData.forEach((row) => {
      if (
        (row.Type !== "Numeric" && row.Type !== "DateTime") ||
        (!row["Format Rule"] && !row[CUSTOM_FORMAT_RULE])
      ) {
        return;
      }

      const existingRangeRow = rangeRowData.find(
        (rangeRow) => rangeRow.Attribute === row.Attribute
      );

      if (existingRangeRow) {
        newRangeRowData.push({
          ...existingRangeRow,
          FormatRule: row["Format Rule"] || row[CUSTOM_FORMAT_RULE]
        });
      } else {
        newRangeRowData.push({
          Attribute: row.Attribute,
          Type: row.Type,
          FormatRule: row["Format Rule"] || row[CUSTOM_FORMAT_RULE],
          LowerBound: "",
          LowerInclusive: false,
          UpperBound: "",
          UpperInclusive: false
        });
      }
    });

    setRangeRowData(newRangeRowData);

    if (newRangeRowData.length === 0) {
      updateOverlaySelection(currentSchemaId, "Add range rule for data", { selected: false });
    }
  }, [rangeRowData, setFormatRuleRowData, setRangeRowData, updateOverlaySelection, currentSchemaId]);

  const handleDeleteCurrentOverlay = useCallback(() => {
    // Save current changes before deleting overlay
    handleSave();
    updateOverlaySelection(currentSchemaId, "Add format rule for data", { selected: false });
    updateOverlaySelection(currentSchemaId, "Add range rule for data", { selected: false });
    setCurrentPage("Overlays");
  }, [handleSave, updateOverlaySelection, currentSchemaId, setCurrentPage]);

  const handleForward = useCallback(() => {
    handleSave();
    setSelectedOverlay(currentSchemaId, "");
    setCurrentPage("Overlays");
  }, [handleSave, setSelectedOverlay, currentSchemaId, setCurrentPage]);

  // Save changes when component unmounts (user navigates away)
  useEffect(() => {
    const currentGridRef = gridRef.current;
    return () => {
      // Save on unmount
      if (currentGridRef?.api) {
        const newFormatRuleRowData = currentGridRef.api
          .getRenderedNodes()
          ?.map((node) => node?.data);
        if (newFormatRuleRowData) {
          setFormatRuleRowData(newFormatRuleRowData);
        }
      }
    };
  }, [setFormatRuleRowData]);

  const columnDefs = useMemo(
    () => [
      {
        field: "Attribute",
        editable: false,
        width: 180,
        cellStyle: () => allowOverflowStyle,
        headerComponent: CellHeader,
        headerComponentParams: {
          headerText: t("Attributes"),
          helpText: t("This is the name for the attribute and, for example...")
        }
      },
      {
        field: "Type",
        editable: false,
        width: 150,
        autoHeight: true,
        cellStyle: () => greyCellStyle,
        headerComponent: CellHeader,
        headerComponentParams: {
          headerText: t("Type"),
          helpText: <TypeTooltip />
        }
      },
      {
        field: "Format Rule",
        headerComponent: CellHeader,
        headerComponentParams: {
          headerText: t("Format Rule"),
          helpText: t(
            "Select the formatting rule that applies to data for each attribute"
          )
        },
        cellRendererFramework: FormatRuleTypeRenderer,
        width: 200,
        cellRendererParams: (params) => ({
          onRefresh: () => {
            // Immediately save the current grid data to schema context
            const newFormatRuleRowData = gridRef.current.api
              .getRenderedNodes()
              ?.map((node) => node?.data);
            if (newFormatRuleRowData) {
              setFormatRuleRowData(newFormatRuleRowData);
            }
            gridRef.current.api.redrawRows({ rowNodes: [params.node] });
          }
        })
      },
      {
        field: CUSTOM_FORMAT_RULE,
        headerComponent: CellHeader,
        headerComponentParams: {
          headerText: t("Custom Format Rule"),
          helpText: t("Enter a custom regular expression for the attribute's data")
        },
        // A custom format rule can be provided only if no built-in format rule is selected
        editable: (params) => !params.node.data["Format Rule"],
        autoHeight: true,
        width: 200,
        wrapText: true
      },
      {
        headerName: "",
        field: "Delete",
        cellRendererFramework: TrashCanButton,
        width: 60,
        cellRendererParams: (params) => ({
          onRefresh: () => {
            // Immediately save the current grid data to schema context
            const newFormatRuleRowData = gridRef.current.api
              .getRenderedNodes()
              ?.map((node) => node?.data);
            if (newFormatRuleRowData) {
              setFormatRuleRowData(newFormatRuleRowData);
            }
            gridRef.current.api.redrawRows({ rowNodes: [params.node] });
          }
        })
      }
    ],
    [t, setFormatRuleRowData]
  );

  const onGridReady = useCallback(() => {
    setLoading(false);
  }, []);

  const handleKeyPress = (params) => {
    if (params.colDef.field !== CUSTOM_FORMAT_RULE) return;

    params.node.updateData({
      ...params.node.data,
      [CUSTOM_FORMAT_RULE]: params.event.target.value
    });

    // Force refresh the format rule cell to update its disabled state
    const formatRuleColumn = params.columnApi.getColumn("FormatRule");
    if (formatRuleColumn) {
      params.api.refreshCells({
        force: true,
        rowNodes: [params.node],
        columns: [formatRuleColumn]
      });
    }
  };

  return (
    <BackNextSkeleton
      isForward
      pageForward={handleForward}
      isBack
      pageBack={() => setShowDeleteConfirmation(true)}
      backText="Remove overlay"
    >
      {loading && formatRuleRowData?.length > 40 && <Loading />}
      {showDeleteConfirmation && (
        <DeleteConfirmation
          removeFromSelected={handleDeleteCurrentOverlay}
          closeModal={() => setShowDeleteConfirmation(false)}
        />
      )}
      <Box
        sx={{
          margin: "2rem",
          gap: "3rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}
      >
        <Box className="ag-theme-balham" sx={{ width: 790 }}>
          <style>{gridStyles}</style>
          <AgGridReact
            ref={gridRef}
            rowData={formatRuleRowData}
            columnDefs={columnDefs}
            domLayout="autoHeight"
            suppressHorizontalScroll
            rowHeight={50}
            onGridReady={onGridReady}
            onCellKeyDown={handleKeyPress}
          />
        </Box>
        <Box
          sx={{
            width: "80%"
          }}
        >
          {t("All format rules are documented in the")}{" "}
          <Link
            href="https://github.com/agrifooddatacanada/format_options"
            target="_blank"
            rel="noreferrer"
          >
            {t("format GitHub repository")}
          </Link>
          . {t("Request a new format to be added by")}{" "}
          <Link
            href="https://github.com/agrifooddatacanada/format_options/issues"
            rel="noreferrer"
            target="_blank"
          >
            {t("raising an issue in the repository")}
          </Link>{" "}
          {t("or email us at")} <Link href="mailto:adc@uoguelph.ca">adc@uoguelph.ca</Link>
          .
        </Box>
      </Box>
    </BackNextSkeleton>
  );
};

export default FormatRulesV2;
