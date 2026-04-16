"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { StatusColors } from "@/lib/api";

const StatusColorsContext = createContext<StatusColors>({});

export function StatusColorsProvider({
  value,
  children,
}: {
  value: StatusColors;
  children: ReactNode;
}) {
  return (
    <StatusColorsContext.Provider value={value}>
      {children}
    </StatusColorsContext.Provider>
  );
}

export function useStatusColors(): StatusColors {
  return useContext(StatusColorsContext);
}
