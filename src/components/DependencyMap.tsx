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
import { StatusColorsProvider } from "./StatusColorsContext";
import { PillarColorsProvider } from "./PillarColorsContext";
import { Button } from "@/components/ui/button";
import { buildFlowGraph } from "@/lib/layout";
import { fetchProjectsClient } from "@/lib/api";
import type { Project } from "@/lib/types";
import type { StatusColors, PillarColors } from "@/lib/api";
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
  initialStatusColors?: StatusColors;
  initialPillarColors?: PillarColors;
  title?: string;
  docId?: string;
  tableId?: string;
  pageId?: string;
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

export function DependencyMap({
  initialProjects,
  initialStatusColors = {},
  initialPillarColors = {},
  title,
  docId,
  tableId,
  pageId,
}: Props) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [statusColors, setStatusColors] =
    useState<StatusColors>(initialStatusColors);
  const [pillarColors, setPillarColors] =
    useState<PillarColors>(initialPillarColors);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);

  const copyShareLink = useCallback(async (href: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(href);
      } else {
        // Fallback for sandboxed iframes without Clipboard API permission.
        const ta = document.createElement("textarea");
        ta.value = href;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  }, []);

  useEffect(() => {
    setLastUpdated(new Date());
  }, []);

  const { nodes: computedNodes, edges: computedEdges } = useMemo(
    () => buildFlowGraph(projects, statusColors),
    [projects, statusColors]
  );

  // Client-side polling for live updates
  const refresh = useCallback(async () => {
    try {
      const fresh = await fetchProjectsClient(docId, tableId, pageId);
      setProjects(fresh.projects);
      setStatusColors(fresh.statusColors);
      setPillarColors(fresh.pillarColors);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to refresh:", err);
    }
  }, [docId, tableId, pageId]);

  useEffect(() => {
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <ReactFlowProvider>
      <StatusColorsProvider value={statusColors}>
      <PillarColorsProvider value={pillarColors}>
      <div className="flex flex-col h-full">
        <HelpModal />
        <ThemeParamSync />
        <ThemeToggle />
        {/* Top-left cluster: external link icon + table title. */}
        <div className="fixed top-3 left-4 z-50 flex items-center gap-3">
          <a
            href={(() => {
              const qs = new URLSearchParams();
              if (docId) qs.set("docId", docId);
              if (pageId) qs.set("pageId", pageId);
              else if (tableId) qs.set("tableId", tableId);
              const suffix = qs.size ? `?${qs.toString()}` : "";
              return `https://react-diagonal.vercel.app/${suffix}`;
            })()}
            // Coda's embed iframe sandbox blocks target="_blank" and
            // window.open silently. Instead of fighting the sandbox, copy
            // the share URL to the clipboard so the user can paste it into
            // a real browser tab. Cmd/Ctrl+click still opens a new tab
            // natively if the user wants that path.
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              // Let modifier-clicks (Cmd/Ctrl/Shift/middle) through so power
              // users can still force a new tab via the browser gesture.
              if (
                e.metaKey ||
                e.ctrlKey ||
                e.shiftKey ||
                e.altKey ||
                e.button !== 0
              ) {
                return;
              }
              e.preventDefault();
              void copyShareLink(e.currentTarget.href);
            }}
            className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            aria-label="Copy share link"
            title="Copy share link"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M15 3h6v6" />
              <path d="M10 14 21 3" />
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            </svg>
          </a>
          {title && (
            <h1 className="text-sm font-semibold text-foreground truncate max-w-[420px]">
              {title}
            </h1>
          )}
          {copied && (
            <span
              role="status"
              aria-live="polite"
              className="text-xs font-medium px-2 py-1 rounded-md bg-primary text-primary-foreground shadow-sm animate-in fade-in slide-in-from-left-1"
            >
              Link copied to clipboard
            </span>
          )}
        </div>
        {/* Refresh button — fixed top-right, left of the ? button */}
        <Button
          variant="outline"
          size="icon"
          onClick={refresh}
          className="fixed top-3 right-16 z-50 w-7 h-7 rounded-full"
          aria-label="Refresh"
        >
          &#x21bb;
        </Button>
        {/* Header */}
        <div className="flex flex-col items-center gap-2 py-4 px-4 shrink-0">
          <Legend />
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">
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
      </PillarColorsProvider>
      </StatusColorsProvider>
    </ReactFlowProvider>
  );
}
