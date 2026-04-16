"use client";

import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-foreground mb-2 uppercase tracking-wider">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-muted text-foreground rounded px-1.5 py-0.5 text-xs font-mono">
      {children}
    </code>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-muted text-foreground rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
      {children}
    </pre>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 mb-3">
      <span className="shrink-0 w-5 h-5 rounded-full bg-muted text-foreground text-xs flex items-center justify-center font-semibold mt-0.5">
        {n}
      </span>
      <div className="text-muted-foreground text-xs leading-relaxed">{children}</div>
    </div>
  );
}

function TableRow({ col, type, desc }: { col: string; type: string; desc: string }) {
  return (
    <tr className="border-t border-border">
      <td className="py-2 pr-3 font-mono text-xs text-foreground whitespace-nowrap">{col}</td>
      <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">{type}</td>
      <td className="py-2 text-xs text-muted-foreground">{desc}</td>
    </tr>
  );
}

export function HelpModal() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Help"
          className="fixed top-3 right-4 z-50 w-7 h-7 rounded-full"
        >
          ?
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:max-w-lg border-l border-border overflow-y-auto p-0"
      >
        <SheetHeader className="sticky top-0 bg-background border-b border-border px-6 py-4 z-10">
          <SheetTitle className="text-base font-semibold text-foreground">
            Documentation
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="overview" className="px-0">
          <TabsList
            className="sticky top-14 bg-background border-b border-border flex px-6 rounded-none w-full justify-start h-auto z-10 gap-1 p-0"
          >
            <TabsTrigger
              value="overview"
              className="px-4 py-2 text-xs font-medium data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="coda"
              className="px-4 py-2 text-xs font-medium data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Coda Setup
            </TabsTrigger>
            <TabsTrigger
              value="configuration"
              className="px-4 py-2 text-xs font-medium data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Configuration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="px-6 py-5">
            <Section title="What this app does">
              <p className="text-muted-foreground text-xs leading-relaxed">
                This app reads a Coda table and renders it as an interactive dependency
                flowmap. Rows become cards, and the <Code>Blocked By</Code> lookup column
                drives directed edges between them.
                Cards are auto-arranged into tiers based on their dependency depth.
              </p>
            </Section>

            <Section title="Tiers (Upstream / Midstream / Downstream)">
              <p className="text-muted-foreground text-xs leading-relaxed mb-3">
                Features are auto-grouped into horizontal tiers based on the longest
                dependency chain. The tier names are labels, not categories in your Coda
                table — they&apos;re derived from the <Code>Blocked By</Code> relationships.
              </p>
              <ul className="text-muted-foreground text-xs leading-relaxed space-y-1.5 list-disc pl-5">
                <li>
                  <strong className="text-foreground">UPSTREAM</strong> — features with no blockers (nothing blocks them). They&apos;re the starting point.
                </li>
                <li>
                  <strong className="text-foreground">MIDSTREAM</strong> — features blocked by upstream features.
                </li>
                <li>
                  <strong className="text-foreground">DOWNSTREAM</strong> — features blocked by midstream features.
                </li>
              </ul>
              <p className="text-muted-foreground text-xs mt-3">
                Deeper chains get additional labels like <Code>TIER 4</Code>, <Code>TIER 5</Code>, and so on.
              </p>
            </Section>

            <Section title="Statuses">
              <p className="text-muted-foreground text-xs leading-relaxed mb-3">
                Each card shows its status as a colored badge. Statuses give you a quick
                visual scan of project health — a wall of amber means healthy progress,
                clusters of red signal bottlenecks, gray upstream is normal (planned
                work), gray downstream means something&apos;s waiting on blockers.
              </p>
              <ul className="text-muted-foreground text-xs leading-relaxed space-y-2 list-none pl-0">
                <li className="flex items-start gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 mt-1 shrink-0" />
                  <span>
                    <strong className="text-foreground">In Progress</strong> — work is actively happening. Use for features currently being built.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 mt-1 shrink-0" />
                  <span>
                    <strong className="text-foreground">Blocked</strong> — the feature cannot proceed. Investigate what&apos;s blocking it.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-400 mt-1 shrink-0" />
                  <span>
                    <strong className="text-foreground">Not Started</strong> — planned but not begun. Use for backlog or upcoming work.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 mt-1 shrink-0" />
                  <span>
                    <strong className="text-foreground">Complete</strong> — feature is done. Use once the work is delivered.
                  </span>
                </li>
              </ul>
              <p className="text-muted-foreground text-xs mt-3">
                Tip: pair the status with the <Code>Blocked By</Code> column to make
                bottlenecks obvious — a red-badged card with a red inbound edge shouts
                for attention.
              </p>
            </Section>

            <Section title="Using the app">
              <p className="text-muted-foreground text-xs mb-3">
                Pass the doc and table IDs as URL parameters:
              </p>
              <CodeBlock>{`https://your-app.vercel.app/?docId=YOUR_DOC_ID&tableId=YOUR_TABLE_ID`}</CodeBlock>
              <p className="text-muted-foreground text-xs mt-3 mb-2">
                If you omit the parameters, the app falls back to the environment variable
                defaults (<Code>CODA_DOC_ID</Code> / <Code>CODA_TABLE_ID</Code>).
              </p>
            </Section>
          </TabsContent>

          <TabsContent value="coda" className="px-6 py-5">
            <Section title="Coda table structure">
              <p className="text-muted-foreground text-xs mb-3">
                Your table must have these columns (exact names matter — or edit{" "}
                <Code>src/lib/coda-config.ts</Code> to rename them):
              </p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-semibold text-muted-foreground pb-2 pr-3">Column</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground pb-2 pr-3">Type</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground pb-2">Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableRow col="Feature" type="Text" desc="Row name — used as the unique identifier and card label." />
                    <TableRow col="Status" type="Select" desc='One of: In Progress, Blocked, Not Started, Complete' />
                    <TableRow col="Owner" type="People" desc="Displayed on the card. Optional." />
                    <TableRow col="Target Date" type="Date" desc="Displayed on the card. Optional." />
                    <TableRow col="Description" type="Text" desc="Shown in the hover tooltip. Optional." />
                    <TableRow col="Blocked By" type="Lookup" desc="Select existing features that are blocking this row. Drives edges and the Blocks count on cards." />
                    <TableRow col="Depends On" type="Lookup" desc="Select existing features this row depends on. Informational — shown as a count on the card." />
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground text-xs mt-3">
                Tip: both lookup columns only let you select existing features — you cannot add
                new items inline. Create the feature row first, then reference it.
              </p>
            </Section>

            <Section title="Get your Doc ID and Table ID">
              <Step n={1}>
                Open your Coda doc and navigate to the table you want to visualise.
              </Step>
              <Step n={2}>
                Look at the browser URL — it follows this pattern:
                <CodeBlock>{`https://coda.io/d/My-Doc_d{DOC_ID}/My-Table_t{TABLE_ID}`}</CodeBlock>
                The part after <Code>_d</Code> is your <Code>docId</Code>. The part after{" "}
                <Code>_t</Code> is your <Code>tableId</Code>.
              </Step>
              <Step n={3}>
                Alternatively, open the Coda API explorer at{" "}
                <span className="text-foreground">coda.io/developers/apis/v1</span>, call{" "}
                <Code>GET /docs</Code> to find your doc, then{" "}
                <Code>GET /docs/{"{docId}"}/tables</Code> to list its tables.
              </Step>
            </Section>

            <Section title="Get your API token">
              <Step n={1}>Go to <span className="text-foreground">coda.io/account</span>.</Step>
              <Step n={2}>Scroll to <strong className="text-foreground">API Settings</strong> and click <strong className="text-foreground">Generate API token</strong>.</Step>
              <Step n={3}>Copy the token — you only see it once.</Step>
            </Section>
          </TabsContent>

          <TabsContent value="configuration" className="px-6 py-5">
            <Section title="Environment variables">
              <p className="text-muted-foreground text-xs mb-2">
                Set these in your Vercel project under <strong className="text-foreground">Settings → Environment Variables</strong>:
              </p>
              <CodeBlock>{`CODA_API_TOKEN=your_api_token   # required
CODA_DOC_ID=your_doc_id         # optional default
CODA_TABLE_ID=your_table_id     # optional default`}</CodeBlock>
            </Section>

            <Section title="Customising column names">
              <p className="text-muted-foreground text-xs leading-relaxed">
                If your table uses different column names, edit{" "}
                <Code>src/lib/coda-config.ts</Code> — every column is mapped there. No other
                file needs to change.
              </p>
            </Section>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
