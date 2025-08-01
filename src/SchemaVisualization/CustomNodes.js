/**
 * Custom node components for schema visualization
 */
import React from "react";
import { Handle, Position } from "@xyflow/react";
import "./SchemaVisualization.css";

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
 * Database Node Component - represents schema entities with fields
 */
export const DatabaseNode = ({ data, isConnectable }) => {
  const { title, fields, nodeType } = data;

  return (
    <div className={`database-node ${nodeType}`}>
      {/* Only show input handle for non-root nodes */}
      {nodeType !== "root" && (
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={isConnectable}
          style={{ top: "20px" }}
        />
      )}

      <div className="database-header">
        <strong>{title}</strong>
        <span className="node-type-badge">{nodeType}</span>
      </div>

      <div className="database-fields">
        {fields.map((field) => (
          <div key={field.originalKey || field.name} className={`field ${field.type}`}>
            <span className="field-name">{field.name}</span>
            <span className="field-type">{field.type}</span>
            {field.isReference && (
              <Handle
                type="source"
                position={Position.Right}
                id={`${field.name}`}
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
                id={`${field.name}`}
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
        ))}
      </div>
    </div>
  );
};
