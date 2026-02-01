/**
 * Providers - Global Client-Side Provider Wrapper
 *
 * Wraps app with ThemeProvider for light/dark/system theme support.
 * Used in RootLayout (layout.tsx). Siehe ADR-049-light-mode-toggle.md
 */

"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps): JSX.Element {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
