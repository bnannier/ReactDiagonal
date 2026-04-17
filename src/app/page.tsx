import {
  fetchProjectsServer,
  fetchStatusColors,
  fetchPillarColors,
  fetchTableName,
  resolveTableIdForPage,
} from "@/lib/api";
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

  // Resolve the table: either explicit tableId, or discover by pageId.
  let tableId = tableIdArg;
  if (!tableId && pageId) {
    try {
      const found = await resolveTableIdForPage(docId, pageId);
      if (found) tableId = found;
    } catch {
      // swallow; EmptyState will surface below
    }
  }

  if (!tableId) {
    return (
      <main className="flex flex-col h-screen">
        <EmptyState
          reason={
            pageId
              ? "No table found on that Coda page"
              : "Missing tableId (or pageId to auto-discover)"
          }
          docId={docId}
          tableId={tableIdArg}
        />
      </main>
    );
  }

  const [projects, tableName, statusColors, pillarColors] =
    await Promise.allSettled([
      fetchProjectsServer(docId, tableId),
      fetchTableName(docId, tableId),
      fetchStatusColors(docId, tableId),
      fetchPillarColors(docId, tableId),
    ]);

  if (projects.status === "rejected") {
    return (
      <main className="flex flex-col h-screen">
        <EmptyState
          reason="Could not load data from Coda"
          detail={String(projects.reason?.message || projects.reason)}
          docId={docId}
          tableId={tableId}
        />
      </main>
    );
  }

  return (
    <main className="flex flex-col h-screen">
      <DependencyMap
        initialProjects={projects.value}
        initialStatusColors={
          statusColors.status === "fulfilled" ? statusColors.value : {}
        }
        initialPillarColors={
          pillarColors.status === "fulfilled" ? pillarColors.value : {}
        }
        title={tableName.status === "fulfilled" ? tableName.value : undefined}
        docId={docId}
        tableId={tableId}
        pageId={pageId}
      />
    </main>
  );
}
