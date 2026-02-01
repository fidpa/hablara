/**
 * Finder Reveal Utilities
 *
 * Robust "Show in Finder" functionality with pre-check and user feedback.
 * Prevents errors by verifying file existence before shell reveal.
 */

import { logger } from "@/lib/logger";

/**
 * Error types für revealInFinder
 */
export type FinderRevealError = "file_not_found" | "reveal_failed";

/**
 * Result interface für revealInFinder
 */
export interface RevealResult {
  success: boolean;
  error?: FinderRevealError;
}

/**
 * Prüft ob eine Datei existiert (mit Error-Handling)
 *
 * @param filePath - Absoluter Dateipfad
 * @returns true wenn Datei existiert, false sonst
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    const { exists } = await import("@tauri-apps/plugin-fs");
    return await exists(filePath);
  } catch (error) {
    logger.warn("FinderUtils", "exists() check failed", { filePath, error });
    return false;
  }
}

/**
 * Zeigt eine Datei im Finder an (mit Pre-Check und Error-Handling)
 *
 * Robuste Implementierung:
 * - P0: Pre-Check ob Datei existiert
 * - P1: Error Handling mit strukturierten Fehlern
 * - Unterstützt Umlaute und Leerzeichen in Pfaden
 *
 * @param filePath - Absoluter Dateipfad
 * @returns RevealResult mit success/error
 *
 * @example
 * const result = await revealInFinder("/path/to/file.pdf");
 * if (!result.success && result.error) {
 *   showFinderErrorToast(toast, result.error);
 * }
 */
export async function revealInFinder(filePath: string): Promise<RevealResult> {
  // P0: Pre-check - Datei muss existieren
  if (!(await fileExists(filePath))) {
    logger.warn("FinderUtils", "File not found", { filePath });
    return { success: false, error: "file_not_found" };
  }

  // Reveal mit Error Handling
  try {
    const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
    await revealItemInDir(filePath);
    logger.info("FinderUtils", "Revealed in Finder", { filePath });
    return { success: true };
  } catch (error) {
    logger.error("FinderUtils", "Reveal failed", error);
    return { success: false, error: "reveal_failed" };
  }
}

/**
 * Gibt deutsche Fehlermeldung für FinderRevealError zurück
 *
 * @param error - Error Type
 * @returns User-freundliche deutsche Nachricht
 */
export function getFinderErrorMessage(error: FinderRevealError): string {
  switch (error) {
    case "file_not_found":
      return "Datei nicht gefunden. Möglicherweise verschoben oder gelöscht.";
    case "reveal_failed":
      return "Finder konnte nicht geöffnet werden.";
  }
}
