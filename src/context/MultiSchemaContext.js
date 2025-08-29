import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo
} from "react";
import { getSchemaDataById } from "../SchemaVisualization/dataUtils";

// Create the multi-schema context
const MultiSchemaContext = createContext();

// Default schema state structure
const createDefaultSchemaState = () => ({
  // Schema metadata
  metadata: {
    name: "",
    description: "",
    languages: ["English"]
  },
  // Schema attributes
  attributes: [],
  attributesList: [],
  // Schema overlays
  overlays: {
    label: {},
    unit: {},
    cardinality: {},
    format: {},
    character_encoding: {},
    conformance: {},
    entry: {}
  },
  // Entry codes
  entryCodes: {},
  attributesWithLists: [],
  // Overlay-specific data
  characterEncodingData: [],
  formatRuleData: [],
  cardinalityData: [],
  dataStandardsData: [],
  rangeData: [],
  unitData: [],
  unitFramedData: [],
  attributeFramingData: [],
  // Language-specific data
  lanAttributeRowData: {},
  // Flags
  frameAllUnits: false,
  frameAllAttributes: false,
  unframedUnitList: [],
  unframedAttributeList: [],
  unitFramedThatAlreadyExist: {},
  // Lifecycle
  initialized: false,
  // Persisted user removals
  deletedAttributes: []
});

// Multi-schema provider component
export const MultiSchemaProvider = ({ children }) => {
  const PERSIST_VERSION = 2;

  // Multi-schema state
  const [schemaStates, setSchemaStates] = useState({});
  const [activeSchemaId, setActiveSchemaId] = useState(null);
  const [schemaNavigationHistory, setSchemaNavigationHistory] = useState([]);
  const [modifiedSchemas, setModifiedSchemas] = useState(new Set());
  const [currentPackageId, setCurrentPackageId] = useState(null);
  
  // Step management callback


  // Refs for persistence
  const saveTimerRef = useRef(null);
  const lastSavedState = useRef({});

  // Get state for a specific schema
  const getSchemaState = useCallback(
    (schemaId) => schemaStates[schemaId] || createDefaultSchemaState(),
    [schemaStates]
  );

  // Update state for a specific schema
  const updateSchemaState = useCallback(
    (schemaId, updates) => {
      setSchemaStates((prev) => ({
        ...prev,
        [schemaId]: {
          ...getSchemaState(schemaId),
          ...updates
        }
      }));

      // Mark schema as modified
      setModifiedSchemas((prev) => new Set([...prev, schemaId]));
    },
    [getSchemaState]
  );

  // Track deleted attributes
  const addDeletedAttributes = useCallback((schemaId, attributeNames) => {
    if (!Array.isArray(attributeNames) || attributeNames.length === 0) return;
    setSchemaStates((prev) => {
      const prevState = prev[schemaId] || createDefaultSchemaState();
      const existing = new Set(prevState.deletedAttributes || []);
      attributeNames.forEach((n) => existing.add(n));
      return {
        ...prev,
        [schemaId]: {
          ...prevState,
          deletedAttributes: Array.from(existing)
        }
      };
    });
    setModifiedSchemas((prev) => new Set([...prev, schemaId]));
  }, []);

  const getDeletedAttributes = useCallback(
    (schemaId) => {
      const state = getSchemaState(schemaId);
      return new Set(state.deletedAttributes || []);
    },
    [getSchemaState]
  );

  // Initialize schema from OCA package
  const initializeSchemaFromOCA = useCallback((schemaId, ocaPackage) => {
    const schemaData = getSchemaDataById(ocaPackage, schemaId);
    if (!schemaData) return;

    // Normalizer helpers
    const normalizeType = (rawType) => {
      if (!rawType) return "";
      if (Array.isArray(rawType)) {
        const first = rawType[0];
        if (typeof first === "string") {
          const inner = first.trim();
          if (inner.startsWith("refn:") || inner.startsWith("refs:"))
            return "Array[Child Schema]";
          const mapped =
            {
              text: "Text",
              numeric: "Numeric",
              boolean: "Boolean",
              binary: "Binary",
              binaryfile: "Binaryfile",
              datetime: "DateTime"
            }[inner.toLowerCase()] || inner;
          return `Array[${mapped}]`;
        }
        return "Array[Text]";
      }
      if (typeof rawType !== "string") return "";
      const t = rawType.trim();
      if (t.startsWith("refn:") || t.startsWith("refs:")) return "Child Schema";
      const arrayMatch = t.match(/^array\[(.+)\]$/i);
      if (arrayMatch) {
        const inner = arrayMatch[1];
        if (
          inner.toLowerCase().startsWith("refn:") ||
          inner.toLowerCase().startsWith("refs:")
        )
          return "Array[Child Schema]";
        const mapped =
          {
            text: "Text",
            numeric: "Numeric",
            boolean: "Boolean",
            binary: "Binary",
            binaryfile: "Binaryfile",
            datetime: "DateTime"
          }[inner.toLowerCase()] || inner;
        return `Array[${mapped}]`;
      }
      switch (t.toLowerCase()) {
        case "text":
          return "Text";
        case "numeric":
          return "Numeric";
        case "boolean":
          return "Boolean";
        case "binary":
          return "Binary";
        case "binaryfile":
          return "Binaryfile";
        case "datetime":
          return "DateTime";
        default:
          return rawType;
      }
    };

    // Build attributes
    const attributes = Object.entries(schemaData.attributes || {}).map(
      ([name, type]) => ({
        Attribute: name,
        Type: normalizeType(type),
        Description: "",
        Required: false,
        List: false,
        Unit: ""
      })
    );

    // Parse entry overlays to mark lists and construct entry codes
    const entryCodes = {};
    const listSet = new Set();
    const entryOverlay = schemaData.overlays?.entry;
    const addEntry = (attrName, code, lang, text) => {
      listSet.add(attrName);
      if (!entryCodes[attrName]) entryCodes[attrName] = [];
      let row = entryCodes[attrName].find((r) => r.Code === code);
      if (!row) {
        row = { Code: code };
        entryCodes[attrName].push(row);
      }
      row[lang] = text || "";
    };

    if (Array.isArray(entryOverlay)) {
      entryOverlay.forEach((o) => {
        const lang = o.language || "eng";
        const attrMap = o.attribute_entries || {};
        Object.entries(attrMap).forEach(([attr, codeMap]) => {
          Object.entries(codeMap || {}).forEach(([code, text]) =>
            addEntry(attr, code, lang, text)
          );
        });
      });
    } else if (entryOverlay && typeof entryOverlay === "object") {
      Object.entries(entryOverlay).forEach(([lang, o]) => {
        const attrMap = o?.attribute_entries || {};
        Object.entries(attrMap).forEach(([attr, codeMap]) => {
          Object.entries(codeMap || {}).forEach(([code, text]) =>
            addEntry(attr, code, lang, text)
          );
        });
      });
    }

    const attributesWithLists = attributes.map((a) => ({
      ...a,
      List: listSet.has(a.Attribute)
    }));

    // Parse label overlays for language-specific data
    const lanAttributeRowData = {};
    const labelOverlays = schemaData.overlays?.label;
    if (Array.isArray(labelOverlays)) {
      labelOverlays.forEach((overlay) => {
        if (overlay && overlay.language) {
          const lang = overlay.language;
          lanAttributeRowData[lang] = attributesWithLists.map((attr) => ({
            Attribute: attr.Attribute,
            Label: overlay.attribute_labels?.[attr.Attribute] || "",
            Description: overlay.attribute_descriptions?.[attr.Attribute] || "",
            List: attr.List
          }));
        }
      });
    } else if (labelOverlays && typeof labelOverlays === "object") {
      Object.entries(labelOverlays).forEach(([lang, overlay]) => {
        if (overlay) {
          lanAttributeRowData[lang] = attributesWithLists.map((attr) => ({
            Attribute: attr.Attribute,
            Label: overlay.attribute_labels?.[attr.Attribute] || "",
            Description: overlay.attribute_descriptions?.[attr.Attribute] || "",
            List: attr.List
          }));
        }
      });
    }

    // Parse other overlays
    const characterEncodingData = [];
    const formatRuleData = [];
    const cardinalityData = [];
    const dataStandardsData = [];
    const rangeData = [];
    const unitData = [];
    const unitFramedData = [];
    const attributeFramingData = [];

    // Character encoding overlay
    const charEncodingOverlay = schemaData.overlays?.character_encoding;
    if (charEncodingOverlay?.attribute_character_encoding) {
      Object.entries(charEncodingOverlay.attribute_character_encoding).forEach(
        ([attr, encoding]) => {
          characterEncodingData.push({
            Attribute: attr,
            "Character Encoding": encoding || ""
          });
        }
      );
    }

    // Format overlay
    const formatOverlay = schemaData.overlays?.format;
    if (formatOverlay?.attribute_formats) {
      Object.entries(formatOverlay.attribute_formats).forEach(([attr, format]) => {
        formatRuleData.push({
          Attribute: attr,
          "Format Rule": format || ""
        });
      });
    }

    // Cardinality overlay
    const cardinalityOverlay = schemaData.overlays?.cardinality;
    if (cardinalityOverlay?.attribute_cardinality) {
      Object.entries(cardinalityOverlay.attribute_cardinality).forEach(
        ([attr, cardinality]) => {
          cardinalityData.push({
            Attribute: attr,
            Cardinality: cardinality || ""
          });
        }
      );
    }

    // Conformance overlay
    const conformanceOverlay = schemaData.overlays?.conformance;
    if (conformanceOverlay?.attribute_conformance) {
      Object.entries(conformanceOverlay.attribute_conformance).forEach(
        ([attr, conformance]) => {
          const attrData = attributesWithLists.find((a) => a.Attribute === attr);
          if (attrData) {
            attrData.Required = conformance === "M";
          }
        }
      );
    }

    // Unit overlay
    const unitOverlay = schemaData.overlays?.unit;
    if (unitOverlay?.attribute_units) {
      Object.entries(unitOverlay.attribute_units).forEach(([attr, unit]) => {
        unitData.push({
          Attribute: attr,
          Unit: unit || ""
        });
      });
    }

    const newState = {
      metadata: {
        name: schemaData.schemaName || schemaId,
        description: schemaData.schemaDescription || "",
        languages: ["English", "French"]
      },
      attributes: attributesWithLists,
      attributesList: attributesWithLists.map((a) => a.Attribute),
      overlays: schemaData.overlays || {},
      entryCodes,
      attributesWithLists: attributesWithLists
        .filter((a) => a.List)
        .map((a) => a.Attribute),
      lanAttributeRowData,
      characterEncodingData,
      formatRuleData,
      cardinalityData,
      dataStandardsData,
      rangeData,
      unitData,
      unitFramedData,
      attributeFramingData,
      frameAllUnits: false,
      frameAllAttributes: false,
      unframedUnitList: [],
      unframedAttributeList: [],
      unitFramedThatAlreadyExist: {},
      initialized: true
    };

    setSchemaStates((prev) => ({
      ...prev,
      [schemaId]: newState
    }));
  }, []);

  // Switch to editing a different schema
  const switchToSchema = useCallback(
    (schemaId, ocaPackage) => {
      // Canonicalize schema id so root aliases ("root", name) map to the same key
      const canonicalizeSchemaId = (pkg, id) => {
        if (!pkg) return id;
        const rootDigest = pkg.bundle?.d;
        // Collect possible root names from meta overlays if present (handle array or object)
        const rootNames = new Set();
        const metaOverlay = pkg.bundle?.overlays?.meta;
        if (Array.isArray(metaOverlay)) {
          metaOverlay.forEach((m) => {
            if (m && typeof m.name === "string") {
              rootNames.add(m.name);
            }
          });
        } else if (metaOverlay && typeof metaOverlay === "object") {
          Object.keys(metaOverlay).forEach((lang) => {
            const metaForLang = metaOverlay[lang];
            if (
              metaForLang &&
              typeof metaForLang === "object" &&
              typeof metaForLang.name === "string"
            ) {
              rootNames.add(metaForLang.name);
            }
          });
        }
        if (id === "root" || (rootDigest && id === rootDigest) || rootNames.has(id)) {
          return rootDigest || "root";
        }
        return id;
      };

      const resolvedId = canonicalizeSchemaId(ocaPackage, schemaId);

      // If state exists under the original id and not under resolved id, migrate it.
      // Also determine if initialization is needed based on current state snapshot.
      let shouldInitialize = false;
      setSchemaStates((prev) => {
        const willMigrate =
          schemaId !== resolvedId && prev[schemaId] && !prev[resolvedId];
        const hasExisting = !!(prev[resolvedId] || prev[schemaId]);
        shouldInitialize = !hasExisting;
        if (willMigrate) {
          return {
            ...prev,
            [resolvedId]: prev[schemaId]
          };
        }
        return prev;
      });

      setActiveSchemaId(resolvedId);
      setSchemaNavigationHistory((prev) => [...prev, resolvedId]);

      // Initialize schema if it doesn't exist (based on snapshot above)
      if (shouldInitialize && ocaPackage) {
        initializeSchemaFromOCA(resolvedId, ocaPackage);
      }
    },
    [initializeSchemaFromOCA]
  );

  // Check if a schema has been modified
  const isSchemaModified = useCallback(
    (schemaId) => modifiedSchemas.has(schemaId),
    [modifiedSchemas]
  );

  // Get all modified schemas
  const getModifiedSchemas = useCallback(
    () => Array.from(modifiedSchemas),
    [modifiedSchemas]
  );

  // Export schema changes back to OCA package format
  const exportSchemaChanges = useCallback(
    (ocaPackage) => {
      if (!ocaPackage || modifiedSchemas.size === 0) {
        return ocaPackage;
      }

      const modifiedPackage = JSON.parse(JSON.stringify(ocaPackage));

      // Apply changes to each modified schema
      Array.from(modifiedSchemas).forEach((schemaId) => {
        const schemaState = getSchemaState(schemaId);
        if (!schemaState.initialized) return;

        // Find the schema in the package
        let targetSchema = null;
        if (schemaId === modifiedPackage.bundle?.d) {
          targetSchema = modifiedPackage.bundle;
        } else {
          targetSchema = modifiedPackage.dependencies?.find((dep) => dep.d === schemaId);
        }

        if (!targetSchema) return;

        // Apply attribute changes - preserve original reference values
        if (schemaState.attributes && schemaState.attributes.length > 0) {
          // Start with original attributes to preserve reference values
          const originalAttributes = targetSchema.capture_base.attributes || {};
          const newAttributes = { ...originalAttributes };

          schemaState.attributes.forEach((attr) => {
            if (attr.Attribute && attr.Type) {
              // If this is a "Child Schema" display type, we need to preserve the original reference
              if (attr.Type === "Child Schema") {
                // Keep the original reference value if it exists
                if (!originalAttributes[attr.Attribute]) {
                  // If it's a new attribute with "Child Schema" type, we need to generate a reference
                  // For now, let's use a placeholder reference
                  newAttributes[attr.Attribute] = `refn:placeholder_${attr.Attribute}`;
                }
                // Otherwise, keep the existing reference value
              } else {
                // For non-reference types, store the actual type
                newAttributes[attr.Attribute] = attr.Type;
              }
            }
          });

          targetSchema.capture_base.attributes = newAttributes;
        }

        // Apply overlay changes - preserve original overlay structure
        if (schemaState.overlays) {
          // Ensure overlays object exists
          if (!targetSchema.overlays) {
            targetSchema.overlays = {};
          }

          // Merge overlay changes while preserving original structure
          Object.entries(schemaState.overlays).forEach(([overlayType, overlayData]) => {
            if (overlayData) {
              targetSchema.overlays[overlayType] = overlayData;
            }
          });
        }

        // Apply entry codes
        if (schemaState.entryCodes && Object.keys(schemaState.entryCodes).length > 0) {
          // Reconstruct entry overlay from entry codes
          const entryOverlay = {
            d: targetSchema.overlays?.entry?.d || `entry_${Date.now()}`,
            capture_base: targetSchema.capture_base.d,
            type: "spec/overlays/entry/1.1",
            language: "eng",
            attribute_entries: {}
          };

          Object.entries(schemaState.entryCodes).forEach(([attrName, codes]) => {
            if (Array.isArray(codes)) {
              entryOverlay.attribute_entries[attrName] = {};
              codes.forEach((code) => {
                if (code.Code) {
                  entryOverlay.attribute_entries[attrName][code.Code] =
                    code.eng || code.English || "";
                }
              });
            }
          });

          if (!targetSchema.overlays) targetSchema.overlays = {};
          targetSchema.overlays.entry = [entryOverlay];
        }
      });

      return modifiedPackage;
    },
    [getSchemaState, modifiedSchemas]
  );

  // Clear all schema states
  const clearAllSchemas = useCallback(() => {
    setSchemaStates({});
    setActiveSchemaId(null);
    setSchemaNavigationHistory([]);
    setModifiedSchemas(new Set());

    // Clear localStorage for all multi-schema data
    try {
      // Clear current package data
      if (currentPackageId) {
        localStorage.removeItem(`oca_composer_multischema_${currentPackageId}`);
      }

      // Clear all multi-schema entries (in case there are old ones)
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith("oca_composer_multischema_")) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      // console.warn("Failed to clear localStorage:", error);
    }
  }, [currentPackageId]);

  // Get navigation history
  const getNavigationHistory = useCallback(
    () => [...schemaNavigationHistory],
    [schemaNavigationHistory]
  );

  // Navigate back in history
  const navigateBack = useCallback(() => {
    if (schemaNavigationHistory.length > 1) {
      const newHistory = [...schemaNavigationHistory];
      newHistory.pop(); // Remove current
      const previousSchema = newHistory[newHistory.length - 1];
      setActiveSchemaId(previousSchema);
      setSchemaNavigationHistory(newHistory);
      return previousSchema;
    }
    return null;
  }, [schemaNavigationHistory]);

  // Persistence functions
  const saveToLocalStorage = useCallback(() => {
    if (!currentPackageId) return;

    const stateToSave = {
      version: PERSIST_VERSION,
      packageId: currentPackageId,
      schemaStates,
      modifiedSchemas: Array.from(modifiedSchemas),
      navigationHistory: schemaNavigationHistory
    };

    try {
      localStorage.setItem(
        `oca_composer_multischema_${currentPackageId}`,
        JSON.stringify(stateToSave)
      );
      lastSavedState.current = JSON.parse(JSON.stringify(stateToSave));
    } catch (error) {
      // console.warn("Failed to save multi-schema state to localStorage:", error);
    }
  }, [currentPackageId, schemaStates, modifiedSchemas, schemaNavigationHistory]);

  const loadFromLocalStorage = useCallback((packageId) => {
    if (!packageId) return false;

    try {
      const saved = localStorage.getItem(`oca_composer_multischema_${packageId}`);
      if (!saved) return false;

      const parsed = JSON.parse(saved);
      if (parsed.version !== PERSIST_VERSION) return false;

      setSchemaStates(parsed.schemaStates || {});
      setModifiedSchemas(new Set(parsed.modifiedSchemas || []));
      setSchemaNavigationHistory(parsed.navigationHistory || []);
      lastSavedState.current = parsed;

      return true;
    } catch (error) {
      // console.warn("Failed to load multi-schema state from localStorage:", error);
      return false;
    }
  }, []);

  // Auto-save on changes
  useEffect(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveToLocalStorage();
    }, 1000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [schemaStates, modifiedSchemas, saveToLocalStorage]);

  // Context value
  const contextValue = useMemo(
    () => ({
      // State
      schemaStates,
      activeSchemaId,
      schemaNavigationHistory,
      modifiedSchemas,
      currentPackageId,

      // Actions
      getSchemaState,
      updateSchemaState,
      addDeletedAttributes,
      getDeletedAttributes,
      initializeSchemaFromOCA,
      switchToSchema,
      isSchemaModified,
      getModifiedSchemas,
      exportSchemaChanges,
      clearAllSchemas,
      getNavigationHistory,
      navigateBack,

      // Persistence
      saveToLocalStorage,
      loadFromLocalStorage,
      setCurrentPackageId
    }),
    [
      schemaStates,
      activeSchemaId,
      schemaNavigationHistory,
      modifiedSchemas,
      currentPackageId,
      getSchemaState,
      updateSchemaState,
      addDeletedAttributes,
      getDeletedAttributes,
      initializeSchemaFromOCA,
      switchToSchema,
      isSchemaModified,
      getModifiedSchemas,
      exportSchemaChanges,
      clearAllSchemas,
      getNavigationHistory,
      navigateBack,
      saveToLocalStorage,
      loadFromLocalStorage
    ]
  );

  return (
    <MultiSchemaContext.Provider value={contextValue}>
      {children}
    </MultiSchemaContext.Provider>
  );
};

// Hook to use the multi-schema context
export const useMultiSchema = () => {
  const context = useContext(MultiSchemaContext);
  if (!context) {
    throw new Error("useMultiSchema must be used within a MultiSchemaProvider");
  }
  return context;
};
