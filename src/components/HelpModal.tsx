"use client";

import { useState } from "react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2 uppercase tracking-wider">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded px-1.5 py-0.5 text-xs font-mono">
      {children}
    </code>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
      {children}
    </pre>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 mb-3">
      <span className="shrink-0 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs flex items-center justify-center font-semibold mt-0.5">
        {n}
      </span>
      <div className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">{children}</div>
    </div>
  );
}

function TableRow({ col, type, desc }: { col: string; type: string; desc: string }) {
  return (
    <tr className="border-t border-slate-200 dark:border-slate-700">
      <td className="py-2 pr-3 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-nowrap">{col}</td>
      <td className="py-2 pr-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">{type}</td>
      <td className="py-2 text-xs text-slate-600 dark:text-slate-400">{desc}</td>
    </tr>
  );
}

type TabId = "overview" | "coda" | "configuration";

export function HelpModal() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "coda", label: "Coda Setup" },
    { id: "configuration", label: "Configuration" },
  ];

  const tabButtonClass = (id: TabId) =>
    id === activeTab
      ? "px-4 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 border-b-2 border-indigo-400"
      : "px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border-b-2 border-transparent";

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-3 right-4 z-50 w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center transition-colors"
        aria-label="Help"
      >
        ?
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex justify-end"
          onClick={() => setOpen(false)}
        >
          {/* Panel */}
          <div
            className="relative w-full max-w-lg h-full bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between z-10">
              <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">Documentation</h1>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="sticky top-14 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex px-6 z-10">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={tabButtonClass(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="px-6 py-5">

              {activeTab === "overview" && (
                <>
                  <Section title="What this app does">
                    <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                      This app reads a Coda table and renders it as an interactive dependency
                      flowmap. Rows become cards, and the <Code>Blocked By</Code> lookup column
                      drives directed edges between them.
                      Cards are auto-arranged into tiers based on their dependency depth.
                    </p>
                  </Section>

                  <Section title="Using the app">
                    <p className="text-slate-600 dark:text-slate-400 text-xs mb-3">
                      Pass the doc and table IDs as URL parameters:
                    </p>
                    <CodeBlock>{`https://your-app.vercel.app/?docId=YOUR_DOC_ID&tableId=YOUR_TABLE_ID`}</CodeBlock>
                    <p className="text-slate-600 dark:text-slate-400 text-xs mt-3 mb-2">
                      If you omit the parameters, the app falls back to the environment variable
                      defaults (<Code>CODA_DOC_ID</Code> / <Code>CODA_TABLE_ID</Code>).
                    </p>
                  </Section>
                </>
              )}

              {activeTab === "coda" && (
                <>
                  <Section title="Coda table structure">
                <p className="text-slate-600 dark:text-slate-400 text-xs mb-3">
                  Your table must have these columns (exact names matter — or edit{" "}
                  <Code>src/lib/coda-config.ts</Code> to rename them):
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 pb-2 pr-3">Column</th>
                        <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 pb-2 pr-3">Type</th>
                        <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 pb-2">Purpose</th>
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
                <p className="text-slate-500 dark:text-slate-500 text-xs mt-3">
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
                  <span className="text-slate-800 dark:text-slate-200">coda.io/developers/apis/v1</span>, call{" "}
                  <Code>GET /docs</Code> to find your doc, then{" "}
                  <Code>GET /docs/{"{docId}"}/tables</Code> to list its tables.
                </Step>
              </Section>

                  <Section title="Get your API token">
                    <Step n={1}>Go to <span className="text-slate-800 dark:text-slate-200">coda.io/account</span>.</Step>
                    <Step n={2}>Scroll to <strong className="text-slate-800 dark:text-slate-200">API Settings</strong> and click <strong className="text-slate-800 dark:text-slate-200">Generate API token</strong>.</Step>
                    <Step n={3}>Copy the token — you only see it once.</Step>
                  </Section>
                </>
              )}

              {activeTab === "configuration" && (
                <>
                  <Section title="Environment variables">
                    <p className="text-slate-600 dark:text-slate-400 text-xs mb-2">
                      Set these in your Vercel project under <strong className="text-slate-800 dark:text-slate-200">Settings → Environment Variables</strong>:
                    </p>
                    <CodeBlock>{`CODA_API_TOKEN=your_api_token   # required
CODA_DOC_ID=your_doc_id         # optional default
CODA_TABLE_ID=your_table_id     # optional default`}</CodeBlock>
                  </Section>

                  <Section title="Customising column names">
                    <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                      If your table uses different column names, edit{" "}
                      <Code>src/lib/coda-config.ts</Code> — every column is mapped there. No other
                      file needs to change.
                    </p>
                  </Section>
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}
