/**
 * Utility functions for processing OCA schema data for visualization
 */

/**
 * Create a dependency map from OCA package dependencies
 * @param {Array} dependencies - Array of dependency objects
 * @returns {Object} Map of dependency IDs to dependency objects
 */
export const createDependencyMap = (dependencies) => {
  if (!dependencies || !Array.isArray(dependencies)) {
    return {};
  }

  const depMap = {};
  dependencies.forEach((dep) => {
    // Check different dependency structures
    if (dep.oca_bundle?.bundle) {
      // Structure: { oca_bundle: { bundle: {...} } }
      depMap[dep.d || dep.id] = dep.oca_bundle.bundle;
    } else if (dep.capture_base) {
      // Structure: { capture_base: {...}, overlays: {...} }
      depMap[dep.d || dep.id] = dep;
    }
  });

  return depMap;
};

/**
 * Get root schema information from OCA package
 * @returns {Object} Root schema info including attributes, dependencies, and labels
 */
export const getRootSchemaInfo = () => ({
  attributes: {},
  dependencies: [],
  labelOverlay: null,
  labels: {}
});

/**
 * Process attributes into field objects
 * @param {Object} attributes - Raw attributes object
 * @param {Object} labels - Label mapping
 * @returns {Array} Array of field objects
 */
export const processAttributes = (attributes, labels = {}) => {
  if (!attributes || typeof attributes !== "object") {
    return [];
  }

  return Object.entries(attributes).map(([key, value]) => {
    const fieldName = labels[key] || key;
    const isReference = typeof value === "string" && value.startsWith("refs:");
    const isPlaceholder = typeof value === "string" && value.startsWith("refn:");

    return {
      name: fieldName,
      type: isReference ? "Reference" : isPlaceholder ? "Placeholder" : value,
      isReference,
      isPlaceholder,
      originalValue: value,
      originalKey: key
    };
  });
};

/**
 * Get dependency information by ID
 * @param {string} depId - Dependency ID
 * @param {Object} dependencyMap - Map of dependencies
 * @param {string} language - Language code
 * @returns {Object} Dependency info with name and fields
 */
export const getDependencyInfo = (depId, dependencyMap, language = "eng") => {
  const dependency = dependencyMap[depId];
  if (!dependency) {
    return {
      name: depId,
      fields: []
    };
  }

  // Get meta overlay for name
  const metaOverlay =
    dependency.overlays?.meta?.find((m) => m.language === language) ||
    dependency.overlays?.meta?.[0];
  const name = metaOverlay?.name || depId;

  // Get label overlay for field labels
  const labelOverlay =
    dependency.overlays?.label?.find((l) => l.language === language) ||
    dependency.overlays?.label?.[0];
  const labels = labelOverlay?.attribute_labels || {};

  // Process attributes into fields
  const fields = processAttributes(dependency.capture_base?.attributes || {}, labels);

  return {
    name,
    fields
  };
};

/**
 * Check if an OCA package has hierarchical structure (dependencies)
 * @param {Object} ocaPackage - OCA package object
 * @returns {boolean} True if package has dependencies
 */
export const hasHierarchicalStructure = (ocaPackage) => {
  if (!ocaPackage) return false;

  // Check for dependencies array
  if (
    ocaPackage.dependencies &&
    Array.isArray(ocaPackage.dependencies) &&
    ocaPackage.dependencies.length > 0
  ) {
    return true;
  }

  // Check for reference attributes in capture base
  // Handle different OCA package structures
  const bundle = ocaPackage.bundle || ocaPackage.oca_bundle?.bundle || ocaPackage;
  const attributes = bundle.capture_base?.attributes || {};

  return Object.values(attributes).some(
    (value) =>
      typeof value === "string" &&
      (value.startsWith("refs:") || value.startsWith("refn:"))
  );
};

/**
 * Extract schema data directly from OCA package for visualization
 * @param {Object} ocaPackage - OCA package object
 * @param {string} language - Language code (optional)
 * @returns {Object} Processed schema data for visualization
 */
export const extractSchemaDataFromPackage = (ocaPackage, language = "eng") => {
  if (!ocaPackage) {
    return null;
  }

  // Handle different OCA package structures
  const bundle = ocaPackage.bundle || ocaPackage.oca_bundle?.bundle || ocaPackage;
  if (!bundle) {
    return null;
  }

  return {
    OCAPackage: ocaPackage,
    bundle,
    dependencies: ocaPackage.dependencies || [],
    primaryLanguage: language,
    attributes: bundle.capture_base?.attributes || {},
    overlays: bundle.overlays || {}
  };
};

/**
 * Extract schema data from context for visualization
 * @param {Object} context - React context containing schema data
 * @returns {Object} Processed schema data for visualization
 */
export const extractSchemaDataFromContext = (context) => {
  const {
    OCAPackage,
    attributeRowData = [],
    attributesList = [],
    lanAttributeRowData = {},
    languages = ["English"]
  } = context;

  if (!OCAPackage) {
    return null;
  }

  const bundle = OCAPackage.oca_bundle?.bundle;
  if (!bundle) {
    return null;
  }

  // Get the primary language (usually English)
  const primaryLanguage = languages[0] || "English";

  // Build attributes object from context data
  const attributes = {};
  attributesList.forEach((attrName, index) => {
    const attrData = attributeRowData[index];
    if (attrData) {
      attributes[attrName] = attrData.Type || "Text";
    }
  });

  // Get labels from context
  const labels = {};
  if (lanAttributeRowData[primaryLanguage]) {
    lanAttributeRowData[primaryLanguage].forEach((item, index) => {
      const attrName = attributesList[index];
      if (attrName && item.Label) {
        labels[attrName] = item.Label;
      }
    });
  }

  return {
    attributes,
    dependencies: OCAPackage.dependencies || [],
    labelOverlay: {
      attribute_labels: labels
    },
    labels,
    bundle,
    ocaPackage: OCAPackage
  };
};
