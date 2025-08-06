/**
 * Custom node components for schema visualization
 */
import React from "react";
import { Handle, Position, NodeToolbar } from "@xyflow/react";
import "./SchemaVisualization.css";

// Constants
const FIELD_NAME_MAX_LENGTH = 35;

/**
 * Placeholder Node Component - represents potential extension points
 */
export const PlaceholderNode = ({ data, isConnectable }) => (
  <div className="placeholder-node">
    <Handle
      type="target"
      position={Position.Top}
      isConnectable={isConnectable}
      style={{ background: "#ddd" }}
    />
    <div className="placeholder-node-content">
      <div className="placeholder-icon">📝</div>
      <div className="placeholder-label">{data.label || "Placeholder"}</div>
    </div>
  </div>
);

/**
 * Reference Node Component - represents references to other schemas
 */
export const ReferenceNode = ({ data, isConnectable }) => (
  <div className="reference-node">
    <Handle
      type="target"
      position={Position.Top}
      isConnectable={isConnectable}
      style={{ background: "#4CAF50" }}
    />
    <div className="reference-node-content">
      <div className="reference-icon">🔗</div>
      <div className="reference-label">{data.label || "Reference"}</div>
      <div className="reference-type">Reference</div>
    </div>
    <Handle
      type="source"
      position={Position.Bottom}
      isConnectable={isConnectable}
      style={{ background: "#4CAF50" }}
    />
  </div>
);

/**
 * Root Node Component - represents the main schema
 */
export const RootNode = ({ data, isConnectable }) => (
  <div className="root-node">
    <div className="root-node-content">
      <div className="root-icon">🏠</div>
      <div className="root-label">{data.label || "Root Schema"}</div>
      <div className="root-type">Main Schema</div>
    </div>
    <Handle
      type="source"
      position={Position.Bottom}
      isConnectable={isConnectable}
      style={{ background: "#2196F3" }}
    />
  </div>
);

/**
 * Detailed Node Component - represents schema entities with fields in left-to-right layout
 */
export const DatabaseNode = ({ data, isConnectable }) => {
  const { title, fields = [], nodeType } = data;

  // Sort fields to prioritize references and placeholders first
  const sortedFields = [...fields].sort((a, b) => {
    // References come first
    if (a.isReference && !b.isReference) return -1;
    if (!a.isReference && b.isReference) return 1;

    // Placeholders come second
    if (a.isPlaceholder && !b.isPlaceholder) return -1;
    if (!a.isPlaceholder && b.isPlaceholder) return 1;

    // Keep original order for fields of same type
    return 0;
  });

  // Limit number of visible fields to keep nodes manageable
  const maxFields = nodeType === "root" ? 8 : 5;
  const visibleFields = sortedFields.slice(0, maxFields);
  const hiddenCount = sortedFields.length - maxFields;

  // Prepare tooltip content for truncated fields
  const truncatedFields = visibleFields.filter((field) => {
    const originalName = field.originalName || field.name || "";
    return originalName.length > FIELD_NAME_MAX_LENGTH;
  });

  return (
    <>
      <NodeToolbar
        isVisible={data.forceToolbarVisible || undefined}
        position={Position.Top}
        style={{
          background: "rgba(0, 0, 0, 0.9)",
          color: "white",
          padding: "8px 12px",
          borderRadius: "6px",
          fontSize: "12px",
          maxWidth: "400px",
          whiteSpace: "pre-line"
        }}
      >
        {truncatedFields.length > 0 && (
          <div style={{ marginBottom: "8px" }}>
            <strong>Full field names:</strong>
            {truncatedFields.map((field) => (
              <div key={field.originalName || field.name}>
                • {field.originalName || field.name} (
                {field.isReference
                  ? "Reference"
                  : field.isPlaceholder
                    ? "Placeholder"
                    : field.type}
                )
              </div>
            ))}
          </div>
        )}
        {hiddenCount > 0 && (
          <div>
            <strong>Hidden fields ({hiddenCount}):</strong>
            {sortedFields.slice(maxFields).map((field) => (
              <div key={field.originalName || field.name}>
                • {field.originalName || field.name} (
                {field.isReference
                  ? "Reference"
                  : field.isPlaceholder
                    ? "Placeholder"
                    : field.type}
                )
              </div>
            ))}
          </div>
        )}
        {truncatedFields.length === 0 && hiddenCount === 0 && (
          <div>All fields visible</div>
        )}
      </NodeToolbar>

      <div className={`detailed-node ${nodeType}`}>
        {/* Only show input handle for non-root nodes */}
        {nodeType !== "root" && (
          <Handle
            type="target"
            position={Position.Left}
            isConnectable={isConnectable}
            style={{ top: "20px" }}
          />
        )}

        <div className="detailed-header">{title}</div>

        <div className="detailed-fields">
          {visibleFields.map((field, index) => {
            const fieldName = field.name || "";
            const originalName = field.originalName || fieldName;
            const isLong = originalName.length > FIELD_NAME_MAX_LENGTH;

            return (
              <div
                key={field.originalName || field.name || `field-${index}`}
                className={`field ${field.isReference ? "Reference" : field.isPlaceholder ? "Placeholder" : field.type}`}
              >
                <span
                  className="field-name"
                  style={{
                    cursor: isLong ? "help" : "default",
                    textDecoration: isLong ? "underline dotted" : "none"
                  }}
                  title={isLong ? "Select node to see full name" : ""}
                >
                  {fieldName}
                </span>
                <span className="field-type">
                  {field.isReference
                    ? "Reference"
                    : field.isPlaceholder
                      ? "Placeholder"
                      : field.type}
                </span>
                {field.isReference && (
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`${field.originalName || field.name}`}
                    isConnectable={isConnectable}
                    style={{
                      right: "-7px",
                      top: "50%",
                      background: "#ccc",
                      border: "1px solid white",
                      width: "10px",
                      height: "10px"
                    }}
                  />
                )}
                {field.isPlaceholder && (
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`${field.originalName || field.name}`}
                    isConnectable={isConnectable}
                    style={{
                      right: "-7px",
                      top: "50%",
                      background: "#ccc",
                      border: "1px solid white",
                      width: "10px",
                      height: "10px"
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* Show hidden field count if there are any */}
          {hiddenCount > 0 && (
            <div
              className="field hidden-fields-indicator"
              style={{ fontStyle: "italic", color: "#666" }}
            >
              <span
                className="field-name"
                style={{
                  cursor: "help",
                  textDecoration: "underline dotted"
                }}
                title="Select node to see hidden fields"
              >
                ... {hiddenCount} more field{hiddenCount > 1 ? "s" : ""}
              </span>
              <span className="field-type" />
            </div>
          )}
        </div>
      </div>
    </>
  );
};
