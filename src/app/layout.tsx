import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" data-theme="dark">
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {children}
      </body>
    </html>
  );
}
