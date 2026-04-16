"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Edge,
} from "@xyflow/react";
import { ProjectNode } from "./ProjectNode";
import { DependencyEdge } from "./DependencyEdge";
import { TierLabel } from "./TierLabel";
import { PillarGroup } from "./PillarGroup";
import { Legend } from "./Legend";
import { HelpModal } from "./HelpModal";
import { ThemeToggle } from "./ThemeToggle";
import { ThemeParamSync } from "./ThemeParamSync";
import { buildFlowGraph } from "@/lib/layout";
import { fetchProjectsClient } from "@/lib/api";
import type { Project } from "@/lib/types";
import type { ProjectNodeData } from "@/lib/layout";

const nodeTypes: NodeTypes = {
  projectNode: ProjectNode,
  tierLabel: TierLabel,
  pillarGroup: PillarGroup,
};

const edgeTypes: EdgeTypes = {
  dependency: DependencyEdge,
};

interface Props {
  initialProjects: Project[];
  title?: string;
  docId?: string;
  tableId?: string;
}

function FlowUpdater({ nodes, edges }: { nodes: Node<ProjectNodeData>[]; edges: Edge[] }) {
  const { setNodes, setEdges } = useReactFlow();
  const isMounted = useRef(false);
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return; }
    setNodes(nodes);
    setEdges(edges);
  }, [nodes, edges, setNodes, setEdges]);
  return null;
}

export function DependencyMap({ initialProjects, title, docId, tableId }: Props) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    setLastUpdated(new Date());
  }, []);

  const { nodes: computedNodes, edges: computedEdges } = useMemo(
    () => buildFlowGraph(projects),
    [projects]
  );

  // Client-side polling for live updates
  const refresh = useCallback(async () => {
    try {
      const fresh = await fetchProjectsClient(docId, tableId);
      setProjects(fresh);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to refresh:", err);
    }
  }, [docId, tableId]);

  useEffect(() => {
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-full">
        <HelpModal />
        <ThemeParamSync />
        <ThemeToggle />
        {/* Refresh button — fixed top-right, left of the ? button */}
        <button
          onClick={refresh}
          className="fixed top-3 right-16 z-50 w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm flex items-center justify-center transition-colors"
          aria-label="Refresh"
        >
          &#x21bb;
        </button>
        {/* Header */}
        <div className="flex flex-col items-center gap-2 py-4 px-4 shrink-0">
          <Legend />
          {lastUpdated && (
            <p className="text-xs text-slate-500">
              {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Flow Canvas */}
        <div className="flex-1 min-h-0">
          <ReactFlow
            defaultNodes={computedNodes}
            defaultEdges={computedEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            nodesConnectable={false}
            elevateEdgesOnSelect
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.3}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <FlowUpdater nodes={computedNodes} edges={computedEdges} />
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
    </ReactFlowProvider>
  );
}
