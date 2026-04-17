import { NextRequest, NextResponse } from "next/server";
import { codaConfig } from "@/lib/coda-config";

const DEFAULT_DOC_ID = process.env.CODA_DOC_ID ?? "TRox5YL_Dr";
const DEFAULT_TABLE_ID = process.env.CODA_TABLE_ID ?? "grid-QaOZZltrZI";
const CODA_API = "https://coda.io/apis/v1";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const docId = searchParams.get("docId") ?? DEFAULT_DOC_ID;
  const tableId = searchParams.get("tableId") ?? DEFAULT_TABLE_ID;

  const token = process.env.CODA_API_TOKEN;
  if (!token) return NextResponse.json({ error: "CODA_API_TOKEN not set" }, { status: 500 });

  const resp = await fetch(
    `${CODA_API}/docs/${docId}/tables/${tableId}/rows?useColumnNames=true&valueFormat=rich`,
    { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 0 } }
  );
  if (!resp.ok) return NextResponse.json({ error: `Coda API ${resp.status}` }, { status: 502 });

  const data = await resp.json();

  // Return just the name + blockedBy + dependsOn raw values for every row
  const rows = (data.items || []).map((row: { id: string; values: Record<string, unknown> }) => ({
    id: row.id,
    name_raw: row.values[codaConfig.nameColumn],
    blockedBy_raw: row.values[codaConfig.blockedByColumn],
    dependsOn_raw: row.values[codaConfig.dependsOnColumn],
  }));

  return NextResponse.json({ rows });
}
