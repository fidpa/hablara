"use client";

/**
 * SecretServiceWarning - Linux Secret Service availability warning
 *
 * Displays a warning banner when Secret Service (GNOME Keyring/KWallet)
 * is not available on Linux. Only shown for cloud providers that need
 * API key storage.
 *
 * Phase 55: Linux Secret Service Robustness
 */

import { AlertTriangle } from "lucide-react";
import {
  getSecretServiceStatusMessage,
  type SecretServiceStatus,
} from "@/lib/secure-storage";

interface SecretServiceWarningProps {
  status: SecretServiceStatus;
}

/**
 * Warning banner for Linux Secret Service unavailability
 * @returns Warning banner or null if not applicable
 */
export function SecretServiceWarning({ status }: SecretServiceWarningProps): JSX.Element | null {
  // Don't show for working states
  if (status === "available" || status === "not-linux") {
    return null;
  }

  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-500/50">
      <AlertTriangle
        className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <div className="text-xs text-yellow-700 dark:text-yellow-200">
        <strong>Linux Keyring-Hinweis:</strong>{" "}
        {getSecretServiceStatusMessage(status)}
        {status === "unavailable" && (
          <p className="mt-1 text-yellow-600/80 dark:text-yellow-300/70">
            Ihre API-Keys können nicht sicher gespeichert werden. Bitte
            installieren Sie einen Secret-Service-kompatiblen Dienst wie{" "}
            <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">
              gnome-keyring
            </code>{" "}
            oder KWallet.
          </p>
        )}
        {status === "timeout" && (
          <p className="mt-1 text-yellow-600/80 dark:text-yellow-300/70">
            Der Keyring-Dienst antwortet nicht. Bitte prüfen Sie, ob der Daemon
            läuft (z.B. mit{" "}
            <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">
              ps aux | grep keyring
            </code>
            ).
          </p>
        )}
        {status === "not-tauri" && (
          <p className="mt-1 text-yellow-600/80 dark:text-yellow-300/70">
            Keys werden nur für die aktuelle Sitzung im Browser gespeichert und
            gehen verloren.
          </p>
        )}
      </div>
    </div>
  );
}
