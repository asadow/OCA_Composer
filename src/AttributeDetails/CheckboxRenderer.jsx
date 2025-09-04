import React, { useEffect, useRef } from "react";
import { useMultiSchema } from "../context/MultiSchemaContext";

// Use AG Grid's provided node to update the cell value, rather than looking up by rowIndex
const CheckboxRenderer = ({ value, colDef, data, node, onToggleList }) => {
  const inputRef = useRef();
  const { activeSchemaId, getSchemaState, updateSchemaState } = useMultiSchema();

  useEffect(() => {
    inputRef.current.checked = value;
  }, [value]);

  const handleChange = (event) => {
    const { checked } = event.target;
    const colId = colDef.field;
    if (node && typeof node.setDataValue === "function") {
      node.setDataValue(colId, checked);
    }
    if (colId === "List" && typeof onToggleList === "function" && data?.Attribute) {
      onToggleList(data.Attribute, checked);
    }

    // Defer global context syncing to save handlers to avoid flicker during toggle
  };

  return <input type="checkbox" ref={inputRef} onChange={handleChange} />;
};

export default CheckboxRenderer;
