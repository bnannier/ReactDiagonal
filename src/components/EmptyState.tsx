import { Card } from "@/components/ui/card";
import { CodaReferrerRedirect } from "./CodaReferrerRedirect";

interface Props {
  reason: string;
  detail?: string;
  docId?: string;
  tableId?: string;
}

/**
 * Shown when the app is loaded without the required ?docId=...&tableId=...
 * query params (or when Coda rejects the provided IDs). No default table
 * is ever loaded — the user must tell us which flowmap they want to see.
 */
export function EmptyState({ reason, detail, docId, tableId }: Props) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      {/* Auto-detect Coda host on bare embed URLs. */}
      <CodaReferrerRedirect />
      <Card className="max-w-xl w-full p-8 flex flex-col gap-4">
        <h1 className="text-lg font-semibold text-foreground">
          Pick a Coda table to visualise
        </h1>
        <p className="text-sm text-muted-foreground">{reason}.</p>
        {detail && (
          <pre className="text-xs font-mono bg-muted p-3 rounded-md text-foreground whitespace-pre-wrap break-all">
            {detail}
          </pre>
        )}
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            This app needs an explicit Coda document and table. Append both
            IDs to the URL:
          </p>
          <pre className="text-xs font-mono bg-muted px-3 py-2 rounded-md text-foreground overflow-x-auto">
            ?docId=YOUR_DOC_ID&tableId=YOUR_TABLE_ID
          </pre>
          <p>
            Find the <code className="text-foreground">docId</code> after{" "}
            <code className="text-foreground">_d</code> in your Coda doc URL,
            and the <code className="text-foreground">tableId</code> (format{" "}
            <code className="text-foreground">grid-XXXXXXXX</code>) via Coda&apos;s
            API explorer at{" "}
            <a
              href="https://coda.io/developers/apis/v1"
              className="text-primary underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              coda.io/developers/apis/v1
            </a>
            .
          </p>
        </div>
        {(docId || tableId) && (
          <div className="text-xs text-muted-foreground font-mono border-t border-border pt-3">
            <div>docId: {docId ?? <span className="italic">not set</span>}</div>
            <div>
              tableId: {tableId ?? <span className="italic">not set</span>}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
