/**
 * Main Schema Visualization Component
 * Displays hierarchical OCA schemas using React Flow
 */
import React, { useState, useCallback, useContext, useEffect, useRef } from "react";
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Controls,
  MiniMap,
  Background
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Box, Button, Typography } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18next from "i18next";

import { Context } from "../App";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import { CustomPalette } from "../constants/customPalette";
import { PlaceholderNode, ReferenceNode, RootNode, DatabaseNode } from "./CustomNodes";
import { generateTreeLayout, generateDetailedLayout } from "./layoutGenerators";
import { hasHierarchicalStructure, extractSchemaDataFromPackage } from "./dataUtils";
import "./SchemaVisualization.css";

// Custom node types for React Flow
const nodeTypes = {
  placeholderNode: PlaceholderNode,
  referenceNode: ReferenceNode,
  rootNode: RootNode,
  detailedLR: DatabaseNode
};

// Update the language mapping to work with i18next language codes
const i18nextToOCALanguageMap = {
  en: "eng",
  fr: "fra",
  es: "spa",
  de: "deu",
  it: "ita"
};

/**
 * Get OCA language code from i18next language code
 * @param {string} i18nextLang - i18next language code (e.g., "en", "fr")
 * @returns {string} OCA language code (e.g., "eng", "fra")
 */
const getOCALanguageCode = (i18nextLang) => {
  const baseCode = i18nextLang.split("-")[0]; // Handle "en-US" -> "en"
  return i18nextToOCALanguageMap[baseCode] || "eng";
};

/**
 * Schema Visualization Component
 */
const SchemaVisualization = () => {
  const { t } = useTranslation();
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
  const [layoutTrigger, setLayoutTrigger] = useState(0); // Trigger for layout regeneration

  // ReactFlow instance ref
  const reactFlowInstanceRef = useRef(null);

  // React Flow event handlers
  const onNodesChange = useCallback(
    (changes) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    []
  );

  const onConnect = useCallback(
    (params) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    []
  );

  // Generate layout based on current view mode and language
  const generateLayout = useCallback(() => {
    console.log("generateLayout called with viewMode:", viewMode);
    const currentSchema = loadedSchema || OCAPackage;

    if (!currentSchema) {
      // No schema available for layout generation
      console.log("No schema available");
      return;
    }

    // Create a mock context object with the schema data
    const languageCode = getOCALanguageCode(i18next.language);
    const mockContext = extractSchemaDataFromPackage(currentSchema, languageCode);

    if (!mockContext) {
      // Failed to create mock context
      console.log("Failed to create mock context");
      return;
    }

    let result;

    try {
      if (viewMode === "tree") {
        // Generating tree layout
        console.log("Generating tree layout");
        result = generateTreeLayout(mockContext, languageCode, t("Root"));
      } else {
        // Generating detailed layout
        console.log("Generating detailed layout");
        result = generateDetailedLayout(mockContext, languageCode, t("Root"));
      }

      if (result && result.nodes && result.edges) {
        console.log(
          "Layout generated successfully, nodes:",
          result.nodes.length,
          "edges:",
          result.edges.length
        );
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
      } else {
        // Invalid layout result
        console.log("Invalid layout result");
      }
    } catch (error) {
      // Error generating layout
      console.log("Error generating layout:", error);
    }
  }, [loadedSchema, OCAPackage, viewMode, viewSwitchLoading, layoutTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for i18next language changes and regenerate layout
  useEffect(() => {
    const handleLanguageChange = () => {
      // Trigger layout regeneration by updating layoutTrigger
      setLayoutTrigger((prev) => prev + 1);
    };

    i18next.on("languageChanged", handleLanguageChange);
    return () => i18next.off("languageChanged", handleLanguageChange);
  }, []); // Empty dependency array - no circular dependencies

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
      // Check if schema has hierarchical structure
      const hasHierarchy = hasHierarchicalStructure(currentSchema);
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
    console.log("View mode change clicked, current mode:", viewMode);
    // Start loading state
    setViewSwitchLoading(true);

    const nextMode = viewMode === "tree" ? "detailed" : "tree";
    console.log("Switching to mode:", nextMode);
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
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={(instance) => {
                reactFlowInstanceRef.current = instance;
              }}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.1 }}
              style={{ width: "100%", height: "100%" }}
            >
              <Controls />
              <MiniMap nodeStrokeColor="#666" nodeColor="#fff" nodeBorderRadius={4} />
              <Background variant="dots" gap={12} size={1} />
            </ReactFlow>
          )}

          {/* No Hierarchy Message */}
          {!hasHierarchy && (
            <Box
              sx={{
                position: "absolute",
                bottom: 20,
                left: 20,
                background: "rgba(255, 255, 255, 0.9)",
                padding: 2,
                borderRadius: 1,
                boxShadow: 2,
                maxWidth: 300
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {t(
                  "This schema does not contain hierarchical references. The visualization shows the basic structure."
                )}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
      <Footer currentPage="SchemaVisualization" />
    </>
  );
};

export default SchemaVisualization;
