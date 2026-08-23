import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prospección · Baladre Cerámica",
  description: "Bandeja de leads cualificados de Baladre Cerámica",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
