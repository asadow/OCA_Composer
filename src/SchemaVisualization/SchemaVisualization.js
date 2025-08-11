/**
 * Main Schema Visualization Component
 * Displays hierarchical OCA schemas us    // Create a mock context object with the schema data
    const languageCode = toThreeLetterCode(i18n.language.split("-")[0]) || "eng";
    const mockContext = extractSchemaDataFromPackage(currentSchema, languageCode);React Flow
 */
import React, { useState, useCallback, useContext, useEffect, useRef } from "react";
import {
  ReactFlow,
  applyNodeChanges,
  Controls,
  MiniMap,
  Background
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Box, Button, Typography } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Context } from "../App";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import { CustomPalette } from "../constants/customPalette";
import { PlaceholderNode, DetailedNode } from "./CustomNodes";
import { generateTreeLayout, generateDetailedLayout } from "./layoutGenerators";
import { extractSchemaDataFromPackage } from "./dataUtils";
import { toThreeLetterCode } from "../constants/isoCodes";
import "./SchemaVisualization.css";

// Custom node types for React Flow
const nodeTypes = {
  placeholderNode: PlaceholderNode,
  detailedLR: DetailedNode
};

/**
 * Schema Visualization Component
 */
const SchemaVisualization = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const context = useContext(Context);
  const { OCAPackage, setCurrentPage } = context;

  // State for visualization
  const [viewMode, setViewMode] = useState("tree");
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewSwitchLoading, setViewSwitchLoading] = useState(false);
  const [hasHierarchy, setHasHierarchy] = useState(false);
  const [loadedSchema, setLoadedSchema] = useState(null);

  // ReactFlow instance ref
  const reactFlowInstanceRef = useRef(null);

  // React Flow event handlers
  const onNodesChange = useCallback(
    (changes) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    []
  );

  // Generate layout based on current view mode and language
  const generateLayout = useCallback(() => {
    const currentSchema = loadedSchema || OCAPackage;

    if (!currentSchema) {
      // No schema available for layout generation
      return;
    }

    // Create a processed schema data object for visualization
    const languageCode = toThreeLetterCode(i18n.language.split("-")[0]) || "eng";
    const processedSchemaData = extractSchemaDataFromPackage(currentSchema, languageCode);

    if (!processedSchemaData) {
      // Failed to extract schema data
      return;
    }

    let result;

    try {
      // Get schema name from metadata for the current language or use default
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

      if (viewMode === "tree") {
        result = generateTreeLayout(processedSchemaData, languageCode, schemaName);
      } else {
        result = generateDetailedLayout(processedSchemaData, languageCode, schemaName);
      }

      if (result?.nodes && result?.edges) {
        setNodes(result.nodes);
        setEdges(result.edges);

        // Only trigger fit view if not switching views (handleViewModeChange will handle it)
        if (!viewSwitchLoading) {
          setTimeout(() => {
            if (reactFlowInstanceRef.current) {
              reactFlowInstanceRef.current.fitView({ padding: 0.1, duration: 300 });
            }
          }, 150);
        }
      }
    } catch (error) {
      // Handle layout generation errors by setting empty state
      setNodes([]);
      setEdges([]);
    }
  }, [loadedSchema, OCAPackage, viewMode, viewSwitchLoading, i18n.language]); // eslint-disable-line react-hooks/exhaustive-deps

  // Effect to handle file reading from navigation state
  useEffect(() => {
    const navigationState = location.state;

    if (navigationState?.rawFile && !loadedSchema) {
      const file = navigationState.rawFile;
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target.result);
          setLoadedSchema(jsonData);
        } catch (error) {
          // Error parsing JSON file
          // Fallback to regular navigation
          navigate("/");
        }
      };

      reader.onerror = () => {
        // Error reading file
        navigate("/");
      };

      reader.readAsText(file);
    } else if (navigationState?.OCAPackage) {
      // Direct OCA package from navigation state
      setLoadedSchema(navigationState.OCAPackage);
    }
  }, [location.state, loadedSchema, navigate]);

  // Initialize visualization on component mount
  useEffect(() => {
    setCurrentPage("SchemaVisualization");

    // Use loaded schema from file or context OCAPackage
    const currentSchema = loadedSchema || OCAPackage;

    // Don't redirect if we're still loading from navigation state
    const navigationState = location.state;
    const hasFileToLoad = navigationState?.rawFile && !loadedSchema;

    if (!currentSchema && !hasFileToLoad) {
      // No schema available and no file to load, redirect to landing
      navigate("/");
      return;
    }

    // If we have a schema, process it
    if (currentSchema) {
      const hasHierarchy =
        currentSchema.dependencies && currentSchema.dependencies.length > 0;
      setHasHierarchy(hasHierarchy);

      if (!hasHierarchy) {
        // No hierarchical structure, could redirect to regular view
        // For now, we'll still show the schema but with a message
      }

      // Generate initial layout
      generateLayout();
      setIsLoading(false);
    }
  }, [
    OCAPackage,
    loadedSchema,
    navigate,
    setCurrentPage,
    generateLayout,
    location.state
  ]);

  // Handle view mode changes
  const handleViewModeChange = useCallback(() => {
    // Start loading state
    setViewSwitchLoading(true);

    const nextMode = viewMode === "tree" ? "detailed" : "tree";
    setViewMode(nextMode);

    // Hide loading and trigger fit view after layout updates
    setTimeout(() => {
      setViewSwitchLoading(false);
      if (reactFlowInstanceRef.current) {
        reactFlowInstanceRef.current.fitView({ padding: 0.1, duration: 300 });
      }
    }, 250); // Shorter delay since we're only replacing the graph area
  }, [viewMode]);

  // Regenerate layout when view mode or language changes
  useEffect(() => {
    if (!isLoading) {
      generateLayout();
    }
  }, [generateLayout, isLoading]);

  // Navigation handlers
  const handleBackToLanding = () => {
    navigate("/");
  };

  const handleBackToEditor = () => {
    navigate("/start");
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          gap: 2
        }}
      >
        <Typography>{t("Loading schema visualization...")}</Typography>
      </Box>
    );
  }

  return (
    <>
      <Header currentPage="SchemaVisualization" />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 120px)"
        }}
      >
        {/* Title Bar */}
        <Box
          sx={{
            backgroundColor: CustomPalette.PRIMARY,
            color: "white",
            padding: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2
          }}
        >
          <Box>
            <Typography variant="h5" component="h1">
              {t("Schema Visualization")}
            </Typography>
            <Typography variant="body2">
              {hasHierarchy
                ? t("Hierarchical structure detected")
                : t("Single-level schema")}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleBackToEditor}
              sx={{
                color: "white",
                borderColor: "white",
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.1)",
                  borderColor: "white"
                }
              }}
            >
              {t("Back to Editor")}
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleBackToLanding}
              sx={{
                color: "white",
                borderColor: "white",
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.1)",
                  borderColor: "white"
                }
              }}
            >
              {t("Back to Home")}
            </Button>
          </Box>
        </Box>

        {/* Visualization Container */}
        <Box sx={{ flex: 1, position: "relative" }}>
          {/* Controls */}
          <Box className="view-control-panel">
            <Typography className="view-mode-label">
              {t("Current")}: {viewMode === "tree" ? t("Tree") : t("Detailed")}
            </Typography>
            <Button
              onClick={handleViewModeChange}
              className="view-toggle-button"
              size="small"
              sx={{
                backgroundColor: CustomPalette.PRIMARY,
                color: "white",
                border: "none",
                padding: "12px 20px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                boxShadow: `0 2px 8px ${CustomPalette.PRIMARY}40`,
                minHeight: "44px",
                whiteSpace: "nowrap",
                "&:hover": {
                  backgroundColor: CustomPalette.SECONDARY,
                  boxShadow: `0 4px 12px ${CustomPalette.SECONDARY}66`,
                  transform: "translateY(-1px)"
                },
                "&:active": {
                  transform: "translateY(0)",
                  boxShadow: `0 2px 6px ${CustomPalette.SECONDARY}4D`
                }
              }}
            >
              {viewMode === "tree"
                ? t("Switch to Detailed View")
                : t("Switch to Tree View")}
            </Button>
          </Box>

          {/* React Flow or Loading */}
          {viewSwitchLoading ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
                backgroundColor: "#f5f5f5"
              }}
            />
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
              <MiniMap nodeStrokeColor="#666" nodeColor="#fff" nodeBorderRadius={4} />
              <Background variant="dots" gap={12} size={1} />
            </ReactFlow>
          )}
        </Box>
      </Box>
      <Footer currentPage="SchemaVisualization" />
    </>
  );
};

export default SchemaVisualization;
