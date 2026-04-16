"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PillarColors } from "@/lib/api";

const PillarColorsContext = createContext<PillarColors>({});

export function PillarColorsProvider({
  value,
  children,
}: {
  value: PillarColors;
  children: ReactNode;
}) {
  return (
    <PillarColorsContext.Provider value={value}>
      {children}
    </PillarColorsContext.Provider>
  );
}

export function usePillarColors(): PillarColors {
  return useContext(PillarColorsContext);
}
