import { NextRequest, NextResponse } from "next/server";
import {
  fetchProjectsServer,
  fetchStatusColors,
  fetchPillarColors,
} from "@/lib/api";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const docId = searchParams.get("docId") ?? undefined;
  const tableId = searchParams.get("tableId") ?? undefined;

  try {
    const [projects, statusColors, pillarColors] = await Promise.all([
      fetchProjectsServer(docId, tableId),
      fetchStatusColors(docId, tableId),
      fetchPillarColors(docId, tableId),
    ]);
    // No caching — the derived-status sync fires fire-and-forget PUTs to Coda,
    // and a cached response can capture pre-PUT values. Clients must always
    // see the freshest Coda data so rawStatus tracks reality.
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
