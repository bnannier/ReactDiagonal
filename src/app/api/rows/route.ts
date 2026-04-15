import { NextResponse } from "next/server";
import { fetchProjectsServer } from "@/lib/api";

export async function GET() {
  try {
    const projects = await fetchProjectsServer();
    return NextResponse.json(
      { projects },
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
