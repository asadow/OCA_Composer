/**
 * Embedded Schema Visualization Component
 * Simplified version for use within the ViewSchema page
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ReactFlow,
  applyNodeChanges,
  Controls,
  MiniMap,
  Background
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import { PlaceholderNode, DetailedNode, TreeNode } from "./CustomNodes";
import { generateTreeLayout, generateDetailedLayout } from "./layoutGenerators";
import { extractSchemaDataFromPackage } from "./dataUtils";
import { toThreeLetterCode } from "../constants/isoCodes";
import { CustomPalette } from "../constants/customPalette";
import Spinner from "../components/Spinner";

const nodeTypes = {
  placeholderNode: PlaceholderNode,
  detailedLR: DetailedNode,
  treeNode: TreeNode
};

const SchemaVisualizationEmbed = ({
  attributeRowData,
  schemaDescription,
  languages,
  OCAPackage,
  viewMode = "tree",
  height = "500px",
  showDebug = false,
  currentSchemaId,
  setCurrentSchemaId
}) => {
  const { t, i18n } = useTranslation();
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [internalViewMode, setInternalViewMode] = useState(viewMode || "tree");
  const [viewSwitchLoading, setViewSwitchLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const reactFlowInstanceRef = useRef(null);

  // Handle node clicks for schema navigation
  const handleNodeClick = useCallback((nodeId) => {
    if (setCurrentSchemaId) {
      setCurrentSchemaId(nodeId);
    }
  }, [setCurrentSchemaId]);

  // React Flow event handlers
  const onNodesChange = (changes) =>
    setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot));

  // Sync internal mode to external prop and animate transitions
  useEffect(() => {
    setViewSwitchLoading(true);
    setInternalViewMode(viewMode || "tree");
    const id = setTimeout(() => {
      setViewSwitchLoading(false);
      if (reactFlowInstanceRef.current) {
        reactFlowInstanceRef.current.fitView({ padding: 0.1, duration: 300 });
      }
    }, 250);
    return () => clearTimeout(id);
  }, [viewMode]);

  // Use OCAPackage prop if provided, else build from context
  const getOCAPackage = useCallback(() => {
    if (OCAPackage) {
      return OCAPackage;
    }
    // fallback to minimal builder for editor context
    if (!attributeRowData || attributeRowData.length === 0) {
      return null;
    }
    // ...existing code for minimal builder...
    const attributes = {};
    attributeRowData.forEach((attr) => {
      if (attr.Attributes || attr.Attribute) {
        const attrName = attr.Attributes || attr.Attribute;
        const attrType = attr.Type || "Text";
        if (Array.isArray(attrType)) {
          attributes[attrName] = `Array[${attrType[0]}]`;
        } else {
          attributes[attrName] = attrType;
        }
      }
    });
    const dependencies = [];
    attributeRowData.forEach((attr) => {
      const attrType = attr.Type;
      if (attrType === "Child Schema" || attrType === "Array[Child Schema]") {
        const attrName = attr.Attributes || attr.Attribute;
        dependencies.push({
          d: attrName,
          capture_base: {
            attributes: {
              identifier: "Text",
              value: "Text"
            }
          },
          overlays: {
            meta: [
              {
                language: "eng",
                name: attrName
              }
            ]
          }
        });
      }
    });
    const schemaName =
      schemaDescription?.English?.name ||
      schemaDescription?.english?.name ||
      (languages && languages[0] && schemaDescription?.[languages[0]]?.name) ||
      "Schema";
    return {
      bundle: {
        capture_base: {
          attributes,
          name: schemaName
        },
        overlays: {
          meta: [
            {
              language: "eng",
              name: schemaName
            }
          ]
        }
      },
      dependencies
    };
  }, [OCAPackage, attributeRowData, schemaDescription, languages]);

  // Generate layout based on current view mode and language
  const generateLayout = useCallback(() => {
    const ocaPackage = getOCAPackage();
    if (!ocaPackage) {
      return;
    }
    const languageCode = toThreeLetterCode(i18n.language.split("-")[0]) || "eng";
    const processedSchemaData = extractSchemaDataFromPackage(ocaPackage, languageCode);
    if (!processedSchemaData) {
      return;
    }
    let result;
    try {
      let schemaName = t("Parent Schema");
      if (
        processedSchemaData.overlays?.meta &&
        Array.isArray(processedSchemaData.overlays.meta)
      ) {
        const metaOverlay = processedSchemaData.overlays.meta.find(
          (overlay) => overlay.language === languageCode
        );
        if (metaOverlay?.name) {
          schemaName = metaOverlay.name;
        }
      }
             if (internalViewMode === "tree") {
         result = generateTreeLayout(processedSchemaData, languageCode, schemaName, currentSchemaId);
       } else {
         result = generateDetailedLayout(processedSchemaData, languageCode, schemaName, currentSchemaId);
       }
       
       // Add click handlers to nodes
       if (result?.nodes) {
         result.nodes = result.nodes.map((node) => ({
           ...node,
           data: {
             ...node.data,
             onNodeClick: handleNodeClick,
             currentSchemaId: currentSchemaId,
             nodeId: node.id
           }
         }));
       }
      if (result?.nodes && result?.edges) {
        setNodes(result.nodes);
        setEdges(result.edges);
        setHasData(true);
        if (!viewSwitchLoading) {
          setTimeout(() => {
            if (reactFlowInstanceRef.current) {
              reactFlowInstanceRef.current.fitView({ padding: 0.1, duration: 300 });
            }
          }, 150);
        }
      }
    } catch (error) {
      setNodes([]);
      setEdges([]);
      setHasData(false);
    }
  }, [getOCAPackage, internalViewMode, viewSwitchLoading, i18n.language, t]);

  // Generate layout on component mount and when dependencies change
  useEffect(() => {
    const ocaPackage = getOCAPackage();
    if (ocaPackage && ocaPackage.dependencies && ocaPackage.dependencies.length > 0) {
      generateLayout();
      
      // Set initial currentSchemaId to the root schema if not already set
      // Only set if we're not already on a specific schema
      if (!currentSchemaId && setCurrentSchemaId && ocaPackage.bundle?.d) {
        // Don't automatically set currentSchemaId as it might cause unwanted navigation
        // setCurrentSchemaId(ocaPackage.bundle.d);
      }
    } else {
      // Fallback test nodes if no multilevel schema data
      const testNodes = [
        {
          id: "root",
          type: "detailedLR",
          position: { x: 0, y: 0 },
          data: {
            title: "Parent Schema",
            fields: [
              { name: "attribute1", type: "Text" },
              { name: "child_ref", type: "Child Schema" }
            ],
            nodeType: "root"
          }
        },
        {
          id: "child",
          type: "detailedLR",
          position: { x: 300, y: 100 },
          data: {
            title: "Child Schema",
            fields: [
              { name: "child_attr1", type: "Text" },
              { name: "child_attr2", type: "Numeric" }
            ],
            nodeType: "reference"
          }
        }
      ];
      const testEdges = [
        {
          id: "root-child",
          source: "root",
          target: "child",
          sourceHandle: "child_ref",
          type: "default"
        }
      ];
      setNodes(testNodes);
      setEdges(testEdges);
      setHasData(true);
      setTimeout(() => {
        if (reactFlowInstanceRef.current) {
          reactFlowInstanceRef.current.fitView({ padding: 0.1, duration: 300 });
        }
      }, 150);
    }
  }, [getOCAPackage, generateLayout]);

  return (
    <Box
      sx={{
        width: "100%",
        height,
        border: `1px solid ${CustomPalette.GREY_300}`,
        borderRadius: 2,
        overflow: "hidden",
        backgroundColor: "#f8f9fa",
        minWidth: "100%"
      }}
    >
      <Box sx={{ width: "100%", height: "100%" }}>
        {viewSwitchLoading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
              backgroundColor: CustomPalette.GREY_200
            }}
          >
            <Spinner />
          </Box>
        ) : !hasData ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
              backgroundColor: CustomPalette.GREY_100,
              color: CustomPalette.GREY_600
            }}
          >
            <Typography variant="body1" sx={{ mb: 1 }}>
              {t("Schema visualization data is being processed...")}
            </Typography>
            <Typography variant="body2">
              {t("This may take a moment for complex schemas.")}
            </Typography>
          </Box>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onInit={(instance) => {
              reactFlowInstanceRef.current = instance;
            }}
            edgesFocusable={false}
            nodeTypes={nodeTypes}
            nodesConnectable={false}
            fitView
            fitViewOptions={{ padding: 0.1 }}
            style={{ width: "100%", height: "100%" }}
          >
            <Controls />
            <MiniMap
              nodeStrokeColor="#666"
              nodeColor="#fff"
              nodeBorderRadius={4}
              style={{ height: 80, width: 120 }}
            />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>
        )}
      </Box>

      {showDebug && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            background: "#f5f5f5",
            border: "1px solid #ccc",
            borderRadius: 2
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            OCAPackage Debug Info (Raw)
          </Typography>
          <pre style={{ fontSize: "0.8em", maxHeight: 300, overflow: "auto" }}>
            {JSON.stringify(OCAPackage, null, 2)}
          </pre>
          <Typography variant="subtitle2" sx={{ mt: 2 }}>
            Dependencies
          </Typography>
          <pre style={{ fontSize: "0.8em", maxHeight: 300, overflow: "auto" }}>
            {JSON.stringify(OCAPackage?.dependencies, null, 2)}
          </pre>
        </Box>
      )}
    </Box>
  );
};

export default SchemaVisualizationEmbed;
