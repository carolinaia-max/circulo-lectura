import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
  variable: "--fuente-inter-tight",
});

export const metadata: Metadata = {
  title: "Círculo de Lectura",
  description: "Catálogo de libros del club de lectura",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={interTight.variable}>
      <body>{children}</body>
    </html>
  );
}
