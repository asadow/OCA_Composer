/**
 * Migration Helper for transitioning from dual-context to unified MultiSchemaContext approach
 * 
 * This utility provides functions to help components gradually migrate from:
 * - Old: OCAPackage context + MultiSchemaContext
 * - New: Unified MultiSchemaContext only
 */

import { useContext } from "react";
import { Context } from "../App";
import { useMultiSchema } from "./MultiSchemaContext";
import { getSchemaDataById } from "../SchemaVisualization/dataUtils";

/**
 * Migration hook that provides both old and new data access methods
 * Use this during the transition period to gradually migrate components
 */
export const useMigrationHelper = () => {
  // Old contexts
  const { OCAPackage } = useContext(Context);
  
  // New unified context
  const { 
    getCompleteSchema, 
    getSchemaState, 
    updateSchemaState,
    activeSchemaId 
  } = useMultiSchema();

  /**
   * Get schema data - automatically tries new approach first, falls back to old
   * @param {string} schemaId - Schema ID
   * @param {string} languageCode - Language code (optional)
   * @returns {Object} Schema data
   */
  const getSchemaData = (schemaId, languageCode) => {
    // Try new unified approach first
    const completeSchema = getCompleteSchema(schemaId);
    if (completeSchema) {
      return {
        ...completeSchema,
        // Transform to expected format for backward compatibility
        attributes: completeSchema.attributes || {},
        overlays: completeSchema.overlays || {},
        schemaName: completeSchema.metadata?.name || "",
        schemaDescription: completeSchema.metadata?.description || "",
        languages: completeSchema.metadata?.languages || ["English"]
      };
    }
    
    // Fallback to old approach
    if (OCAPackage && schemaId) {
      return getSchemaDataById(OCAPackage, schemaId, languageCode);
    }
    
    return null;
  };

  /**
   * Check if component should use new unified approach
   * @param {string} schemaId - Schema ID
   * @returns {boolean} True if should use new approach
   */
  const shouldUseUnified = (schemaId) => {
    const completeSchema = getCompleteSchema(schemaId);
    return !!completeSchema;
  };

  /**
   * Get current schema ID (helper for backward compatibility)
   * @returns {string} Current schema ID
   */
  const getCurrentSchemaId = () => {
    return activeSchemaId;
  };

  /**
   * Migration status for debugging
   * @param {string} schemaId - Schema ID
   * @returns {Object} Migration status
   */
  const getMigrationStatus = (schemaId) => {
    const hasCompleteSchema = !!getCompleteSchema(schemaId);
    const hasOCAPackage = !!OCAPackage;
    const hasSchemaState = !!getSchemaState(schemaId);
    
    return {
      hasCompleteSchema,
      hasOCAPackage,
      hasSchemaState,
      canUseUnified: hasCompleteSchema,
      needsOldApproach: !hasCompleteSchema && hasOCAPackage,
      status: hasCompleteSchema ? "UNIFIED" : hasOCAPackage ? "LEGACY" : "NONE"
    };
  };

  return {
    // Data access
    getSchemaData,
    getCurrentSchemaId,
    
    // Migration helpers
    shouldUseUnified,
    getMigrationStatus,
    
    // Direct access to contexts (for gradual migration)
    OCAPackage,
    getCompleteSchema,
    getSchemaState,
    updateSchemaState,
    activeSchemaId
  };
};

/**
 * Migration logging helper for debugging
 */
export const logMigrationStatus = (componentName, schemaId, migrationHelper) => {
  const status = migrationHelper.getMigrationStatus(schemaId);
  console.log(`[Migration] ${componentName}:`, {
    schemaId,
    ...status
  });
};

/**
 * Example usage in a component:
 * 
 * ```javascript
 * import { useMigrationHelper, logMigrationStatus } from '../context/MigrationHelper';
 * 
 * const MyComponent = () => {
 *   const migrationHelper = useMigrationHelper();
 *   const schemaId = migrationHelper.getCurrentSchemaId();
 *   
 *   // Log migration status for debugging
 *   logMigrationStatus('MyComponent', schemaId, migrationHelper);
 *   
 *   // Get schema data (automatically uses best available method)
 *   const schemaData = migrationHelper.getSchemaData(schemaId);
 *   
 *   // Check if we can use new unified approach
 *   if (migrationHelper.shouldUseUnified(schemaId)) {
 *     // Use new unified methods
 *     const completeSchema = migrationHelper.getCompleteSchema(schemaId);
 *     // ... new logic
 *   } else {
 *     // Fall back to old approach
 *     const { OCAPackage } = migrationHelper;
 *     // ... old logic
 *   }
 * };
 * ```
 */
