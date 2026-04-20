/**
 * Per-project Coda configuration.
 * Swap this file (or extend it with env-driven overrides) to reuse the app
 * against a different Coda table.
 *
 * Column names must match the exact column headers in your Coda table.
 */
export const codaConfig = {
  /** The column whose value becomes the node label / unique identifier. */
  nameColumn: "Feature",

  /** One of the status values below drives the node colour and animation. */
  statusColumn: "Status",

  /** Optional metadata columns — omit or set to "" to hide them. */
  ownerColumn: "Owner",
  targetDateColumn: "Target Date",
  pillarColumn: "Pillar",
  notesColumn: "Description",
  ticketColumn: "Ticket",

  /**
   * Relationship columns.
   * "Blocked By"  — projects that are blocking this row (drives edges + "Blocks X" count).
   * "Depends On"  — softer prerequisite relationship (informational, shown as count on card).
   * Both accept a Coda lookup/relation column that returns an array of row names.
   */
  blockedByColumn: "Blocked By",
  dependsOnColumn: "Depends On",
} as const;
