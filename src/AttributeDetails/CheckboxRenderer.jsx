import React, { useEffect, useRef } from "react";
import { useMultiSchema } from "../context/MultiSchemaContext";

const CheckboxRenderer = ({ value, rowIndex, colDef, gridRef, data }) => {
  const inputRef = useRef();
  const { activeSchemaId, getSchemaState, updateSchemaState } = useMultiSchema();

  useEffect(() => {
    inputRef.current.checked = value;
  }, [value]);

  const handleChange = (event) => {
    const { checked } = event.target;
    const node = gridRef.current.api.getRowNode(rowIndex);
    const colId = colDef.field;
    node.setDataValue(colId, checked);

    // Sync list toggle into multi-schema state for cross-step consistency
    if (activeSchemaId && data && data.Attribute) {
      const schemaState = getSchemaState(activeSchemaId) || {};
      const prevLists = Array.isArray(schemaState.attributesWithLists)
        ? schemaState.attributesWithLists
        : [];
      const prevEntryCodes = schemaState.entryCodes || {};

      let nextLists = prevLists;
      let nextEntryCodes = { ...prevEntryCodes };

      if (checked) {
        // Mark as list and ensure entry codes array exists
        if (!prevLists.includes(data.Attribute)) {
          nextLists = [...prevLists, data.Attribute];
        }
        // Always reset to an empty array when toggling on to avoid stale data reuse
        nextEntryCodes[data.Attribute] = [];
      } else {
        // Unmark as list and remove any existing entry codes for this attribute
        nextLists = prevLists.filter((a) => a !== data.Attribute);
        if (nextEntryCodes[data.Attribute]) {
          delete nextEntryCodes[data.Attribute];
        }
      }

      updateSchemaState(activeSchemaId, {
        attributesWithLists: nextLists,
        entryCodes: nextEntryCodes
      });
    }
  };

  return <input type="checkbox" ref={inputRef} onChange={handleChange} />;
};

export default CheckboxRenderer;
