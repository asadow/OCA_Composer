import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Box, Typography } from "@mui/material";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import SchemaAwareTypeRenderer from "./SchemaAwareTypeRenderer";
import SchemaAwareCheckboxRenderer from "./SchemaAwareCheckboxRenderer";
import SchemaAwareDeleteRenderer from "./SchemaAwareDeleteRenderer";
import { CustomPalette } from "../constants/customPalette";

const SchemaAwareGrid = React.forwardRef(({
  attributes = [],
  entryCodes = {},
  canDelete = false,
  onAttributeUpdate,
  onEntryCodesUpdate,
  onAttributeDelete,
  typesObjectRef,
  refs = {}
}, ref) => {
  const { t } = useTranslation();
  const [rowData, setRowData] = useState([]);

  // Update row data when attributes change
  useEffect(() => {
    const updatedRowData = attributes.map((attr) => ({
      ...attr,
      List: !!entryCodes[attr.Attribute]
    }));
    setRowData(updatedRowData);
  }, [attributes, entryCodes]);

  // Column definitions
  const columnDefs = [
    {
      headerName: t("Attribute"),
      field: "Attribute",
      editable: true,
      cellEditor: "agTextCellEditor",
      cellEditorParams: {
        maxLength: 50
      },
      width: 200,
      resizable: true
    },
    {
      headerName: t("Type"),
      field: "Type",
      cellRenderer: SchemaAwareTypeRenderer,
      cellRendererParams: {
        typesObjectRef,
        onTypeChange: (attributeName, newType) => {
          const updatedAttributes = attributes.map((attr) => 
            attr.Attribute === attributeName 
              ? { ...attr, Type: newType }
              : attr
          );
          onAttributeUpdate(updatedAttributes);
        }
      },
      width: 150,
      resizable: true
    },
    {
      headerName: t("Description"),
      field: "Description",
      editable: true,
      cellEditor: "agTextCellEditor",
      cellEditorParams: {
        maxLength: 200
      },
      width: 250,
      resizable: true
    },
    {
      headerName: t("Required"),
      field: "Required",
      cellRenderer: SchemaAwareCheckboxRenderer,
      cellRendererParams: {
        onRequiredChange: (attributeName, required) => {
          const updatedAttributes = attributes.map((attr) => 
            attr.Attribute === attributeName 
              ? { ...attr, Required: required }
              : attr
          );
          onAttributeUpdate(updatedAttributes);
        }
      },
      width: 100,
      resizable: true
    },
    {
      headerName: t("List"),
      field: "List",
      cellRenderer: SchemaAwareCheckboxRenderer,
      cellRendererParams: {
        onListChange: (attributeName, isList) => {
          if (isList) {
            // Add entry codes for this attribute
            const updatedEntryCodes = {
              ...entryCodes,
              [attributeName]: []
            };
            onEntryCodesUpdate(updatedEntryCodes);
          } else {
            // Remove entry codes for this attribute
            const updatedEntryCodes = { ...entryCodes };
            delete updatedEntryCodes[attributeName];
            onEntryCodesUpdate(updatedEntryCodes);
          }
        }
      },
      width: 100,
      resizable: true
    },
    {
      headerName: t("Unit"),
      field: "Unit",
      editable: true,
      cellEditor: "agTextCellEditor",
      cellEditorParams: {
        maxLength: 50
      },
      width: 150,
      resizable: true
    }
  ];

  // Add delete column if deletion is allowed
  if (canDelete) {
    columnDefs.push({
      headerName: t("Delete"),
      cellRenderer: SchemaAwareDeleteRenderer,
      cellRendererParams: {
        onDelete: (attributeName) => {
          onAttributeDelete([attributeName]);
        }
      },
      width: 100,
      resizable: true
    });
  }

  // Grid options
  const gridOptions = {
    defaultColDef: {
      sortable: true,
      filter: true,
      floatingFilter: true
    },
    rowData,
    columnDefs,
    rowSelection: "single",
    animateRows: true,
    suppressRowClickSelection: true,
    onGridReady: (params) => {
      if (ref) {
        ref.current = params.api;
      }
    },
    onCellValueChanged: (params) => {
      const { data, field, newValue } = params;
      const updatedAttributes = attributes.map((attr) => 
        attr.Attribute === data.Attribute 
          ? { ...attr, [field]: newValue }
          : attr
      );
      onAttributeUpdate(updatedAttributes);
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {t("Total Attributes")}: {attributes.length}
        </Typography>
        {Object.keys(entryCodes).length > 0 && (
          <Typography variant="body2" color="text.secondary">
            {t("Attributes with Entry Codes")}: {Object.keys(entryCodes).length}
          </Typography>
        )}
      </Box>

      <div
        className="ag-theme-alpine"
        style={{
          height: "400px",
          width: "100%",
          border: `1px solid ${CustomPalette.GREY_300}`,
          borderRadius: "4px"
        }}
      >
        <AgGridReact
          {...gridOptions}
          ref={refs.refContainer}
        />
      </div>
    </Box>
  );
});

SchemaAwareGrid.displayName = "SchemaAwareGrid";

export default SchemaAwareGrid;


