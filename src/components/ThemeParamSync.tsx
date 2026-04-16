"use client";
import { useTheme } from "next-themes";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

export function ThemeParamSync() {
  const { setTheme } = useTheme();
  const params = useSearchParams();
  // Only apply the URL param ONCE on mount — otherwise a toggle click
  // would be immediately overridden by this effect re-running.
  const applied = useRef(false);
  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    const t = params.get("theme");
    if (t === "dark" || t === "light") setTheme(t);
  }, [params, setTheme]);
  return null;
}
