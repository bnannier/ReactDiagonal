import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "ReactDiagonal — IUX Dependency Map",
  description: "Live dependency flowmap for IUX projects",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <ThemeProvider>
          <TooltipProvider delayDuration={400}>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
