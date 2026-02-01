"use client";

/**
 * Global Error Boundary - Next.js Global Fallback
 *
 * Root-Level Error UI für Fehler außerhalb von page.tsx (z.B. layout.tsx).
 * Zeigt Critical Error Message + Reset-Button. Minimal HTML ohne styled components.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="de">
      <body className="bg-slate-900 text-white">
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="bg-slate-800/50 rounded-xl p-8 max-w-md text-center">
            <h2 className="text-xl font-bold text-red-400 mb-4">
              Kritischer Fehler
            </h2>
            <p className="text-slate-300 mb-6">
              {error.message || "Die Anwendung konnte nicht geladen werden."}
            </p>
            <button
              onClick={reset}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white transition-colors"
            >
              Anwendung neu laden
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
