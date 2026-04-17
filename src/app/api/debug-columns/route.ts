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

  // 1) List all columns
  const colsResp = await fetch(
    `${CODA_API}/docs/${docId}/tables/${tableId}/columns`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!colsResp.ok) return NextResponse.json({ error: `columns ${colsResp.status}` }, { status: 502 });
  const colsData = await colsResp.json();

  // 2) Find the status column and fetch its detail
  const statusCol = (colsData.items || []).find(
    (c: { name: string }) => c.name === codaConfig.statusColumn
  );
  let statusDetail = null;
  if (statusCol?.id) {
    const detailResp = await fetch(
      `${CODA_API}/docs/${docId}/tables/${tableId}/columns/${statusCol.id}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    if (detailResp.ok) statusDetail = await detailResp.json();
  }

  return NextResponse.json({
    columnsList: colsData.items?.map((c: { id: string; name: string; format?: unknown }) => ({
      id: c.id,
      name: c.name,
      format: c.format,
    })),
    statusDetail,
  });
}
