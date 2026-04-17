"use client";

import { useEffect } from "react";

/**
 * When the flowchart is embedded in Coda without explicit URL params, try to
 * auto-detect the hosting Coda doc + page from `document.referrer` and
 * redirect to the proper `?docId=...&pageId=...` URL.
 *
 * Coda page URLs look like:
 *   https://coda.io/d/<slug>_d<DOC_ID>/<slug>_<PAGE_SHORT>#...
 *
 * The docId sits right after `_d` at the end of the doc-slug segment.
 * The pageId short id sits after the last `_` of the page-slug segment (Coda
 * convention: starts with `su` or similar 2-letter prefix).
 */
export function CodaReferrerRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Only redirect if we don't already have params.
    const params = new URLSearchParams(window.location.search);
    if (params.has("docId") || params.has("tableId") || params.has("pageId")) {
      return;
    }
    const ref = document.referrer || "";
    if (!ref.includes("coda.io/d/")) return;

    try {
      const u = new URL(ref);
      const parts = u.pathname.split("/").filter(Boolean); // ["d", "<docSlug>", "<pageSlug>?"]
      if (parts[0] !== "d" || !parts[1]) return;
      const docMatch = parts[1].match(/_d([A-Za-z0-9_-]+)$/);
      if (!docMatch) return;
      const docId = docMatch[1];
      let pageId: string | undefined;
      if (parts[2]) {
        const pageMatch = parts[2].match(/_([A-Za-z0-9_-]+)$/);
        if (pageMatch) pageId = pageMatch[1];
      }
      const qs = new URLSearchParams();
      qs.set("docId", docId);
      if (pageId) qs.set("pageId", pageId);
      window.location.replace(`/?${qs.toString()}`);
    } catch {
      // Malformed referrer — leave the empty state visible.
    }
  }, []);
  return null;
}
