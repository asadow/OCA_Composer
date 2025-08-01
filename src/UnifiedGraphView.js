import React, { useState, useEffect, useRef } from "react";
import ReactFlow, { Background, Controls, useNodesState, useEdgesState } from "reactflow";
import "reactflow/dist/style.css";

const UnifiedGraphView = () => {
  const reactFlowWrapper = useRef(null);
  const [viewMode, setViewMode] = useState("tree"); // "tree" or "database"
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    try {
      if (viewMode === "tree") {
        // Example: Tree view nodes and edges
        setNodes([
          { id: "1", data: { label: "Tree Node 1" }, position: { x: 0, y: 0 } },
          { id: "2", data: { label: "Tree Node 2" }, position: { x: 100, y: 100 } }
        ]);
        setEdges([{ id: "e1-2", source: "1", target: "2" }]);
      } else if (viewMode === "database") {
        // Example: Database view nodes and edges
        setNodes([
          { id: "1", data: { label: "Database Node 1" }, position: { x: 0, y: 0 } },
          { id: "2", data: { label: "Database Node 2" }, position: { x: 200, y: 200 } }
        ]);
        setEdges([{ id: "e1-2", source: "1", target: "2" }]);
      }
    } catch (error) {
      // Error handling without console statement
    }
  }, [viewMode, setNodes, setEdges]);

  useEffect(() => {
    try {
      if (reactFlowWrapper.current) {
        reactFlowWrapper.current.fitView();
      }
    } catch (error) {
      // Error handling without console statement
    }
  }, [nodes, edges]);

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <div style={{ marginBottom: "10px" }}>
        <button type="button" onClick={() => setViewMode("tree")}>
          Tree View
        </button>
        <button type="button" onClick={() => setViewMode("database")}>
          Database View
        </button>
      </div>
      <div style={{ width: "100%", height: "calc(100vh - 50px)" }} ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
};

export default UnifiedGraphView;
