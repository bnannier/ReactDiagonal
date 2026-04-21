import {
  fetchProjectsServer,
  fetchStatusColors,
  fetchPillarColors,
  fetchTableName,
  fetchProjectsForPage,
  fetchPageColors,
  fetchPageTitle,
} from "@/lib/api";
import type { StatusColors, PillarColors } from "@/lib/api";
import { DependencyMap } from "@/components/DependencyMap";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    docId?: string;
    tableId?: string;
    pageId?: string;
  }>;
}

export default async function Home({ searchParams }: Props) {
  const { docId, tableId: tableIdArg, pageId } = await searchParams;

  if (!docId) {
    return (
      <main className="flex flex-col h-screen">
        <EmptyState reason="Missing docId" />
      </main>
    );
  }

  if (!tableIdArg && !pageId) {
    return (
      <main className="flex flex-col h-screen">
        <EmptyState
          reason="Missing tableId (or pageId to auto-discover)"
          docId={docId}
        />
      </main>
    );
  }

  // Two modes:
  //  1. Explicit `tableId`   → single-table render (legacy path).
  //  2. `pageId` (no tableId)→ multi-table page mode: every table on that
  //     Coda page is merged into one graph so Feature→Team and Team→Team
  //     edges render together.
  const usePageMode = !tableIdArg && !!pageId;

  try {
    let projects;
    let tableName: string;
    let statusColors: StatusColors = {};
    let pillarColors: PillarColors = {};
    if (usePageMode) {
      const [p, t, c] = await Promise.all([
        fetchProjectsForPage(docId, pageId!),
        fetchPageTitle(docId, pageId!),
        fetchPageColors(docId, pageId!),
      ]);
      projects = p;
      tableName = t;
      statusColors = c.statusColors;
      pillarColors = c.pillarColors;
    } else {
      const [p, t, s, pi] = await Promise.all([
        fetchProjectsServer(docId, tableIdArg!),
        fetchTableName(docId, tableIdArg!),
        fetchStatusColors(docId, tableIdArg!),
        fetchPillarColors(docId, tableIdArg!),
      ]);
      projects = p;
      tableName = t;
      statusColors = s;
      pillarColors = pi;
    }

    return (
      <main className="flex flex-col h-screen">
        <DependencyMap
          initialProjects={projects}
          initialStatusColors={statusColors}
          initialPillarColors={pillarColors}
          title={tableName || undefined}
          docId={docId}
          tableId={tableIdArg}
          pageId={pageId}
        />
      </main>
    );
  } catch (err) {
    return (
      <main className="flex flex-col h-screen">
        <EmptyState
          reason="Could not load data from Coda"
          detail={err instanceof Error ? err.message : String(err)}
          docId={docId}
          tableId={tableIdArg}
        />
      </main>
    );
  }
}
