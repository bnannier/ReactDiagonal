# ReactDiagonal — Project Memory

Persistent rules and context for this project. Read these before making changes.

## Layout / Node Sizing — DO NOT CHANGE

**Rule**: Do NOT set an explicit `height` on `projectNode` entries in `src/lib/layout.ts`.

React Flow must measure each card dynamically via ResizeObserver so the bottom `Handle` sits at the ACTUAL rendered card bottom. Cards have variable content (the "Blocks X • Depends on X" footer only renders on cards with dependencies), so heights vary from ~102px (no footer) to ~126px (with footer). Any fixed height forces edges to either overlap the card edge (too small) or float below with a visible gap (too large).

**What `NODE_H = 130` is for**: layout math only — dagre input, Y-spacing between rows (`NODE_H + SUB_ROW_GAP`), rank height calculations, tier label height, and pillar group bounding-box `maxY`. It is NOT passed to React Flow for project nodes.

**What `width: NODE_W` on nodes is for**: every card is exactly 250px wide so width is safe to declare explicitly. Only the `height` field is the problem.

If edges ever stop rendering after a refactor, the cause is NOT "nodes need explicit dimensions". The cause is the controlled-flow pattern fighting React Flow's internal store. The fix is already in place: `defaultNodes`/`defaultEdges` + `FlowUpdater` component inside `<ReactFlowProvider>` (see `DependencyMap.tsx`).

## Edge Rendering — Architecture

- `DependencyMap.tsx` wraps the tree in `<ReactFlowProvider>` and uses `defaultNodes`/`defaultEdges` (uncontrolled mode).
- `FlowUpdater` is an inner component that uses `useReactFlow().setNodes/setEdges` to push updates when `projects` data refreshes. It skips the first mount (via `isMounted` ref) to avoid clobbering the initial measurement.
- Edge components (`DependencyEdge`) destructure `markerEnd` from `EdgeProps` and pass it to `BaseEdge`.

## Edge Semantics

- `blockedBy` → red solid line with `ArrowClosed` marker
- `dependsOn` → amber dashed line with `Arrow` marker
- Duplicate suppression: if the same pair has both `blockedBy` and `dependsOn`, only the `blockedBy` edge is drawn.

## Coda Name Parsing

Coda returns feature names with backtick wrapping AND trailing whitespace (e.g. `` ```Top News ``` ``). Both `stripBackticks` (for the `Feature` column) and `extractItemName` (for `Blocked By` / `Depends On` lookup items) must call `.trim()` to avoid mismatch when resolving edge source/target node IDs.

## Theme

- Uses `next-themes` with `attribute="class"`, `defaultTheme="system"`, `enableSystem={true}`.
- Optional `?theme=dark|light` URL param (read by `ThemeParamSync`) overrides the system preference — useful when embedded in Coda.
- Tailwind `darkMode: 'class'`. When adding new UI, use `dark:` variants alongside light-mode defaults.

## Process Rules

- Always run multiple parallel agents for non-trivial changes — the user has mandated this.
- Always verify visual changes using Chrome MCP tools (navigate + `computer` screenshot/zoom, NOT code-based checks alone). Take pictures of the actual rendered result before calling work done.
- Never commit changes unless explicitly asked.

## UI Library

Use **shadcn/ui** for all UI primitives (Tooltip, Button, Card, Dialog/Sheet, Tabs, etc.). Do not use `@synergycodes/overflow-ui` for new work — it is being phased out.
