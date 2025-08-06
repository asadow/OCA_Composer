/**
 * Layout generators for different visualization modes
 */
import dagre from "dagre";
import {
  createDependencyMap,
  getDependencyInfo,
  processAttributes,
  extractSchemaDataFromContext
} from "./dataUtils";

/**
 * Calculate node dimensions based on expected maximum content for consistent sizing
 * @param {Object} node - Node object with data
 * @param {string} viewMode - 'tree' or 'detailed' to determine sizing strategy
 * @returns {Object} Object with width and height properties
 */
const calculateNodeDimensions = (node, viewMode = "detailed") => {
  if (viewMode === "tree") {
    // Fixed size for tree view - let Dagre handle all spacing
    return { width: 180, height: 60 };
  }

  // Fixed sizing for detailed view based on expected maximum content
  const nodeType = node.data?.nodeType;

  if (nodeType === "root") {
    // Root nodes: assume max 8 fields (as per our limit)
    const headerHeight = 50;
    const fieldHeight = 45;
    const maxFields = 8;
    const padding = 20;

    return {
      width: 300, // Wider for root nodes
      height: headerHeight + maxFields * fieldHeight + padding
    };
  }

  // Non-root nodes: expect 3 references/placeholders + "...X more fields" indicator
  const headerHeight = 50;
  const fieldHeight = 45;
  const expectedVisibleFields = 3; // 3 refs/placeholders
  const extraRowForTruncation = 1; // There might be a "...more fields" row
  const padding = 20;

  return {
    width: 250, // Fixed width for consistent layout
    height:
      headerHeight +
      (expectedVisibleFields + extraRowForTruncation) * fieldHeight +
      padding
  };
};

/**
 * Apply Dagre layout to nodes and edges
 * @param {Array} nodes - Array of nodes
 * @param {Array} edges - Array of edges
 * @param {string} direction - Layout direction ('TB', 'LR', 'BT', 'RL')
 * @param {string} viewMode - 'tree' or 'detailed' for sizing strategy
 * @returns {Object} Object with layouted nodes and edges
 */
const getLayoutedElements = (nodes, edges, direction = "TB", viewMode = "detailed") => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Configure graph with spacing - less spacing needed for tree view with uniform sizes
  const spacing =
    viewMode === "tree"
      ? { nodesep: 50, ranksep: 80, marginx: 20, marginy: 20 }
      : { nodesep: 80, ranksep: 150, marginx: 30, marginy: 30 };

  dagreGraph.setGraph({
    rankdir: direction,
    ...spacing
  });

  // Add nodes to dagre graph with calculated dimensions
  nodes.forEach((node) => {
    const dimensions = calculateNodeDimensions(node, viewMode);
    dagreGraph.setNode(node.id, {
      width: dimensions.width,
      height: dimensions.height
    });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply positions back to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWithPosition.width / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2
      }
    };
  });

  return { nodes: layoutedNodes, edges };
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

  // Build nodes for Dagre layout
  const nodes = [];
  const edges = [];

  // Process nodes recursively to build flat structure for Dagre
  const processNodeForDagre = (nodeData, processedIds = new Set()) => {
    if (!nodeData || processedIds.has(nodeData.id)) return;
    processedIds.add(nodeData.id);

    const nodeLabel = nodeData.name;

    // Add node to nodes array
    nodes.push({
      id: nodeData.id,
      data: {
        label: nodeLabel,
        title: nodeLabel,
        fields: []
      },
      type:
        nodeData.type === "placeholder"
          ? "placeholderNode"
          : nodeData.type === "root"
            ? "input"
            : "default",
      className: nodeData.type
    });

    // Process children and create edges
    if (nodeData.children) {
      nodeData.children.forEach((child) => {
        // Add edge from parent to child
        edges.push({
          id: `${nodeData.id}-${child.id}`,
          source: nodeData.id,
          target: child.id,
          type: "default",
          animated: child.type === "placeholder",
          style: {
            stroke: "#999",
            strokeWidth: 1
          }
        });

        // Recursively process child
        processNodeForDagre(child, processedIds);
      });
    }
  };

  // Start processing from root
  processNodeForDagre(rootData);

  // Apply Dagre layout (Top-Bottom for tree view)
  const layoutedElements = getLayoutedElements(nodes, edges, "TB", "tree");

  return { nodes: layoutedElements.nodes, edges: layoutedElements.edges };
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

    // No more field processing here - handled in UI component
    allNodes.set(nodeId, {
      id: nodeId,
      type: "detailedLR",
      data: {
        title,
        fields, // Raw fields - truncation handled in UI
        nodeType
      },
      level
    });

    // Process references in this node's fields
    fields.forEach((field) => {
      if (field.isReference && field.type.startsWith("refs:")) {
        const referencedId = field.type.replace("refs:", "");
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
        const placeholderId = `placeholder-${nodeId}-${field.originalName}`;

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

  // Convert allNodes Map to array for Dagre
  const nodes = [];
  allNodes.forEach((node) => {
    nodes.push(node);
  });

  // Apply Dagre layout (Left-Right for detailed view)
  const layoutedElements = getLayoutedElements(nodes, allEdges, "LR", "detailed");

  return { nodes: layoutedElements.nodes, edges: layoutedElements.edges };
};
