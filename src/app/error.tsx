"use client";

/**
 * Error Boundary - Next.js Error UI
 *
 * Wird bei Fehlern in page.tsx gerendert. Zeigt User-friendly Error-Message + Reset-Button.
 * Logged Error via logger.error. Next.js Error Boundary Pattern.
 */

import { useEffect } from "react";
import { logger } from "@/lib/logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('App', 'App error', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-slate-800/50 rounded-xl p-8 max-w-md text-center">
        <h2 className="text-xl font-bold text-red-400 mb-4">
          Ein Fehler ist aufgetreten
        </h2>
        <p className="text-slate-300 mb-6">
          {error.message || "Unbekannter Fehler"}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white transition-colors"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}
