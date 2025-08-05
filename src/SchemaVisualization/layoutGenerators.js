/**
 * Layout generators for different visualization modes
 */
import { hierarchy, tree } from "d3-hierarchy";
import {
  createDependencyMap,
  getDependencyInfo,
  processAttributes,
  extractSchemaDataFromContext
} from "./dataUtils";

/**
 * Center a layout around the origin by calculating its bounds and applying offset
 * @param {Array} nodes - Array of nodes with position properties
 * @returns {Array} - Centered nodes
 */
const centerLayout = (nodes) => {
  if (nodes.length === 0) return nodes;

  // Calculate the bounds of the layout
  const bounds = nodes.reduce(
    (acc, node) => ({
      minX: Math.min(acc.minX, node.position.x),
      maxX: Math.max(acc.maxX, node.position.x),
      minY: Math.min(acc.minY, node.position.y),
      maxY: Math.max(acc.maxY, node.position.y)
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  );

  // Calculate the center of the layout
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  // Apply offset to center around origin (0, 0)
  return nodes.map((node) => ({
    ...node,
    position: {
      x: node.position.x - centerX,
      y: node.position.y - centerY
    }
  }));
};

/**
 * Generate hierarchical tree layout nodes and edges
 * @param {Object} context - React context containing schema data OR processed schema data
 * @param {string} language - Language code for labels (e.g., "eng", "fra")
 * @param {string} rootLabel - Translated label for the root node
 * @returns {Object} Object containing nodes and edges arrays
 */
export const generateTreeLayout = (context, language = "eng", rootLabel = "Root") => {
  // Check if we have processed schema data or need to extract from context
  let schemaData;
  if (context.OCAPackage && context.bundle && context.dependencies) {
    // Already processed schema data
    schemaData = context;
  } else {
    // Extract from context
    schemaData = extractSchemaDataFromContext(context);
  }

  if (!schemaData) {
    return { nodes: [], edges: [] };
  }

  const { attributes, dependencies, overlays } = schemaData;
  const dependencyMap = createDependencyMap(dependencies);
  const processedNodes = new Set();

  // Get label overlay for attribute labels using the specified language
  const labelOverlay =
    overlays?.label?.find((l) => l.language === language) || overlays?.label?.[0] || {};

  // Recursive function to build hierarchical structure
  const buildHierarchy = ({
    nodeId,
    attributes: nodeAttributes,
    labelOverlay: nodeLabelOverlay,
    metaOverlay = null,
    nodeType
  }) => {
    if (processedNodes.has(nodeId)) {
      return null; // Already processed, avoid cycles
    }
    processedNodes.add(nodeId);

    const labels = nodeLabelOverlay?.attribute_labels || {};
    const nodeName = metaOverlay?.name ? metaOverlay.name : rootLabel;

    const nodeData = {
      id: nodeId,
      name: nodeName,
      type: nodeType,
      children: []
    };

    // Process all attributes to find references and placeholders
    Object.entries(nodeAttributes).forEach(([key, value]) => {
      const isRefs = typeof value === "string" && value.startsWith("refs:");
      const isRefn = typeof value === "string" && value.startsWith("refn:");

      if (isRefs) {
        const refId = value.replace("refs:", "");
        const refDep = dependencyMap[refId];

        if (refDep && refDep.capture_base) {
          const refLabelOverlay =
            refDep.overlays?.label?.find((l) => l.language === language) ||
            refDep.overlays?.label?.[0];
          const refMetaOverlay =
            refDep.overlays?.meta?.find((m) => m.language === language) ||
            refDep.overlays?.meta?.[0];

          if (!processedNodes.has(refId)) {
            const childNode = buildHierarchy({
              nodeId: refId,
              attributes: refDep.capture_base.attributes,
              labelOverlay: refLabelOverlay,
              metaOverlay: refMetaOverlay,
              nodeType: "reference"
            });
            if (childNode) {
              nodeData.children.push(childNode);
            }
          } else {
            const nodeName = refMetaOverlay?.name || refId;
            nodeData.children.push({
              id: `${nodeId}-ref-${refId}`,
              name: nodeName,
              type: "reference",
              children: [],
              isSharedReference: true,
              originalId: refId
            });
          }
        }
      } else if (isRefn) {
        nodeData.children.push({
          id: `placeholder-${nodeId}-${key}`,
          name: `${labels[key] || key}\n(placeholder)`,
          type: "placeholder",
          children: []
        });
      }
    });

    return nodeData;
  };

  // Build the complete hierarchy starting from root
  const rootData = buildHierarchy({
    nodeId: "root",
    attributes,
    labelOverlay,
    metaOverlay: null,
    nodeType: "root"
  });

  if (!rootData) {
    return { nodes: [], edges: [] };
  }

  // Create D3 hierarchy with consistent spacing
  const root = hierarchy(rootData);
  const layout = tree();
  const treeLayout = layout
    .nodeSize([200, 120]) // More compact node sizing
    .separation((a, b) => (a.parent === b.parent ? 1.0 : 1.5)); // Tighter separation

  const treeData = treeLayout(root);

  // Convert to ReactFlow nodes and edges
  const nodes = [];
  const edges = [];

  treeData.each((d) => {
    const nodeLabel = d.data.name;

    nodes.push({
      id: d.data.id,
      position: {
        x: d.x,
        y: d.y
      },
      data: {
        label: nodeLabel
      },
      type:
        d.data.type === "placeholder"
          ? "placeholderNode"
          : d.data.type === "root"
            ? "input"
            : "default",
      className: d.data.type
    });

    // Create edge to parent (if not root)
    if (d.parent) {
      edges.push({
        id: `${d.parent.data.id}-${d.data.id}`,
        source: d.parent.data.id,
        target: d.data.id,
        type: "default",
        animated: d.data.type === "placeholder",
        style: {
          stroke: "#999",
          strokeWidth: 1
        }
      });
    }
  });

  // Center the layout around origin
  const centeredNodes = centerLayout(nodes);

  return { nodes: centeredNodes, edges };
};

/**
 * Generate detailed-style left-to-right layout nodes and edges
 * @param {Object} context - React context containing schema data
 * @param {string} language - Language code for labels (e.g., "eng", "fra")
 * @param {string} rootLabel - Translated label for the root node
 * @returns {Object} Object containing nodes and edges arrays
 */
export const generateDetailedLayout = (context, language = "eng", rootLabel = "Root") => {
  // Check if we have processed schema data or need to extract from context
  let schemaData;
  if (context.OCAPackage && context.bundle && context.dependencies) {
    // Already processed schema data
    schemaData = context;
  } else {
    // Extract from context
    schemaData = extractSchemaDataFromContext(context);
  }

  if (!schemaData) {
    return { nodes: [], edges: [] };
  }

  const { attributes, dependencies } = schemaData;
  const dependencyMap = createDependencyMap(dependencies);

  const allNodes = new Map();
  const allEdges = [];

  // Helper function to recursively process nodes and their dependencies
  const processNode = (nodeId, nodeType, title, fields, level = 0) => {
    if (allNodes.has(nodeId)) return;

    allNodes.set(nodeId, {
      id: nodeId,
      type: "detailedLR",
      data: {
        title,
        fields,
        nodeType
      },
      level
    });

    // Process references in this node's fields
    fields.forEach((field) => {
      if (field.isReference && field.originalValue.startsWith("refs:")) {
        const referencedId = field.originalValue.replace("refs:", "");
        const referencedInfo = getDependencyInfo(referencedId, dependencyMap, language);

        processNode(
          referencedId,
          "reference",
          referencedInfo.name,
          referencedInfo.fields,
          level + 1
        );

        allEdges.push({
          id: `${nodeId}-${referencedId}`,
          source: nodeId,
          sourceHandle: field.name,
          target: referencedId
        });
      } else if (field.isPlaceholder) {
        const placeholderId = `placeholder-${nodeId}-${field.originalKey}`;

        processNode(placeholderId, "placeholder", field.name, [], level + 1);

        allEdges.push({
          id: `${nodeId}-${placeholderId}`,
          source: nodeId,
          sourceHandle: field.name,
          target: placeholderId
        });
      }
    });
  };

  // Start with root node
  const rootFields = processAttributes(attributes, schemaData.labels);
  processNode("root", "root", rootLabel, rootFields, 0);

  // Convert to ReactFlow format and position nodes using left-to-right layout
  const nodes = [];
  const nodesByLevel = new Map();

  // Group nodes by level
  allNodes.forEach((node) => {
    if (!nodesByLevel.has(node.level)) {
      nodesByLevel.set(node.level, []);
    }
    nodesByLevel.get(node.level).push(node);
  });

  // Position nodes (left-to-right layout)
  const xOffset = 0;
  nodesByLevel.forEach((levelNodes, level) => {
    const ySpacing = 300;
    const startY = (-(levelNodes.length - 1) * ySpacing) / 2;

    levelNodes.forEach((node, index) => {
      nodes.push({
        ...node,
        position: {
          x: xOffset + level * 500,
          y: startY + index * ySpacing
        }
      });
    });
  });

  // Center the layout around origin using the same function as tree layout
  const centeredNodes = centerLayout(nodes);

  return { nodes: centeredNodes, edges: allEdges };
};
