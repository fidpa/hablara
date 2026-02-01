/**
 * RootLayout - Next.js App Router Layout Entry Point
 *
 * Globales Layout für alle Pages. Konfiguriert Inter Font, HTML lang="de",
 * Accessibility (skip-link), Toast-System. Siehe docs/reference/guidelines/REACT_TSX.md
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hablará",
  description: "Desktop voice recording with AI-powered transcription and psychological feedback",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <a href="#main-content" className="skip-link">
            Zum Hauptinhalt springen
          </a>
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
