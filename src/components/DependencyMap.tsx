"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import { Button } from "@synergycodes/overflow-ui";
import { ProjectNode } from "./ProjectNode";
import { DependencyEdge } from "./DependencyEdge";
import { TierLabel } from "./TierLabel";
import { Legend } from "./Legend";
import { buildFlowGraph } from "@/lib/layout";
import { fetchProjectsClient } from "@/lib/api";
import type { Project } from "@/lib/types";

const nodeTypes: NodeTypes = {
  projectNode: ProjectNode,
  tierLabel: TierLabel,
};

const edgeTypes: EdgeTypes = {
  dependency: DependencyEdge,
};

interface Props {
  initialProjects: Project[];
}

export function DependencyMap({ initialProjects }: Props) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    setLastUpdated(new Date());
  }, []);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildFlowGraph(projects),
    [projects]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  // Update nodes/edges when projects change
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = buildFlowGraph(projects);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [projects, setNodes, setEdges]);

  // Client-side polling for live updates
  const refresh = useCallback(async () => {
    try {
      const fresh = await fetchProjectsClient();
      setProjects(fresh);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to refresh:", err);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 py-4 px-4 shrink-0">
        <h1 className="text-lg font-semibold text-slate-100">
          IUX Dependency Flowmap
        </h1>
        <p className="text-xs text-slate-500">
          Live data from Coda &bull; Auto-refreshes every 30s
          {lastUpdated && <> &bull; Last: {lastUpdated.toLocaleTimeString()}</>}
        </p>
        <Legend />
        <div>
          <Button size="small" variant="secondary" onClick={refresh}>
            &#x21bb; Refresh Now
          </Button>
        </div>
      </div>

      {/* Flow Canvas */}
      <div className="flex-1 min-h-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onConnect={() => {}}
          nodesConnectable={false}
          elevateEdgesOnSelect
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#1e293b"
          />
          <Controls
            showInteractive={false}
            position="bottom-right"
          />
          <MiniMap
            nodeStrokeWidth={3}
            pannable
            zoomable
            position="bottom-left"
            style={{ background: "#1e293b" }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
