/**
 * Utility functions for processing OCA schema data for visualization
 */

/**
 * Create a dependency map from OCA package dependencies
 * @param {Array} dependencies - Array of dependency objects
 * @returns {Object} Map of dependency IDs to dependency objects
 */
export const createDependencyMap = (dependencies) => {
  const depMap = {};
  dependencies.forEach((dep) => {
    // Dependencies have flat structure: { capture_base: {...}, overlays: {...} }
    depMap[dep.d || dep.id] = dep;
  });

  return depMap;
};

// Field truncation constant
const FIELD_NAME_MAX_LENGTH = 35;

/**
 * Process attributes from schema and create field objects
 * @param {Object} attributes - The attributes object from schema
 * @param {Object} labels - Optional labels for field names
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

    // Truncate field name if it's too long
    const truncatedName =
      fieldName.length > FIELD_NAME_MAX_LENGTH
        ? `${fieldName.substring(0, FIELD_NAME_MAX_LENGTH)}...`
        : fieldName;

    return {
      name: truncatedName,
      originalName: fieldName,
      type: value,
      isReference,
      isPlaceholder
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
 * Extract schema data directly from OCA package for visualization
 * @param {Object} ocaPackage - OCA package object
 * @param {string} language - Language code (optional)
 * @returns {Object} Processed schema data for visualization
 */
export const extractSchemaDataFromPackage = (ocaPackage, language = "eng") => {
  if (!ocaPackage) {
    return null;
  }

  // Extract labels from the bundle's overlays
  const labelOverlay =
    ocaPackage.bundle.overlays?.label?.find((l) => l.language === language) ||
    ocaPackage.bundle.overlays?.label?.[0] ||
    {};
  const labels = labelOverlay.attribute_labels || {};

  return {
    dependencies: ocaPackage.dependencies || [],
    attributes: ocaPackage.bundle.capture_base?.attributes || {},
    overlays: ocaPackage.bundle.overlays || {},
    labels
  };
};
