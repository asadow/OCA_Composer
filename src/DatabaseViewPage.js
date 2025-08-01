import React, { useEffect, useRef } from "react";
import ReactFlow, { useNodesState, useEdgesState, Background, Controls } from "reactflow";
import "reactflow/dist/style.css";

const DatabaseViewPage = () => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    // Example: Load nodes and edges for the database view
    const initialNodes = [
      { id: "1", data: { label: "Database Node 1" }, position: { x: 0, y: 0 } },
      { id: "2", data: { label: "Database Node 2" }, position: { x: 200, y: 200 } }
    ];
    const initialEdges = [{ id: "e1-2", source: "1", target: "2" }];

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (reactFlowWrapper.current) {
      reactFlowWrapper.current.fitView();
    }
  }, [nodes, edges]);

  return (
    <div style={{ width: "100%", height: "100vh" }} ref={reactFlowWrapper}>
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
  );
};

export default DatabaseViewPage;
