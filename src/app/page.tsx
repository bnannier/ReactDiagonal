import {
  fetchProjectsServer,
  fetchStatusColors,
  fetchPillarColors,
  fetchTableName,
} from "@/lib/api";
import { DependencyMap } from "@/components/DependencyMap";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ docId?: string; tableId?: string }>;
}

export default async function Home({ searchParams }: Props) {
  const { docId, tableId } = await searchParams;

  const [projects, tableName, statusColors, pillarColors] =
    await Promise.allSettled([
      fetchProjectsServer(docId, tableId),
      fetchTableName(docId, tableId),
      fetchStatusColors(docId, tableId),
      fetchPillarColors(docId, tableId),
    ]);

  return (
    <main className="flex flex-col h-screen">
      <DependencyMap
        initialProjects={projects.status === "fulfilled" ? projects.value : []}
        initialStatusColors={
          statusColors.status === "fulfilled" ? statusColors.value : {}
        }
        initialPillarColors={
          pillarColors.status === "fulfilled" ? pillarColors.value : {}
        }
        title={tableName.status === "fulfilled" ? tableName.value : undefined}
        docId={docId}
        tableId={tableId}
      />
    </main>
  );
}
