import { NextRequest, NextResponse } from "next/server";
import { fetchProjectsServer, fetchStatusColors } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const docId = searchParams.get("docId") ?? undefined;
  const tableId = searchParams.get("tableId") ?? undefined;

  try {
    const [projects, statusColors] = await Promise.all([
      fetchProjectsServer(docId, tableId),
      fetchStatusColors(docId, tableId),
    ]);
    return NextResponse.json(
      { projects, statusColors },
      {
        headers: {
          "Cache-Control": "s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
