import { NextRequest, NextResponse } from "next/server";
import {
  fetchProjectsServer,
  fetchStatusColors,
  fetchPillarColors,
  fetchProjectsForPage,
  fetchPageColors,
} from "@/lib/api";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const docId = searchParams.get("docId") ?? undefined;
  const tableId = searchParams.get("tableId") ?? undefined;
  const pageId = searchParams.get("pageId") ?? undefined;

  if (!docId || (!tableId && !pageId)) {
    return NextResponse.json(
      { error: "Missing docId + tableId/pageId — pass one of tableId or pageId" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const [projects, statusColors, pillarColors] =
      tableId
        ? await Promise.all([
            fetchProjectsServer(docId, tableId),
            fetchStatusColors(docId, tableId),
            fetchPillarColors(docId, tableId),
          ])
        : await (async () => {
            const [p, c] = await Promise.all([
              fetchProjectsForPage(docId, pageId!),
              fetchPageColors(docId, pageId!),
            ]);
            return [p, c.statusColors, c.pillarColors] as const;
          })();
    // No caching — derived-status sync writes fire-and-forget PUTs to Coda
    // and a cached response can capture pre-PUT values.
    return NextResponse.json(
      { projects, statusColors, pillarColors },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
