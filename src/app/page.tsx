import { fetchProjectsServer } from "@/lib/api";
import { DependencyMap } from "@/components/DependencyMap";

// Force dynamic rendering — data comes from the Coda API at request time
export const dynamic = "force-dynamic";

export default async function Home() {
  let projects: Awaited<ReturnType<typeof fetchProjectsServer>>;
  try {
    projects = await fetchProjectsServer();
  } catch {
    // During build or if token is missing, start with empty state
    projects = [];
  }

  return (
    <main className="flex flex-col h-screen">
      <DependencyMap initialProjects={projects} />
    </main>
  );
}
