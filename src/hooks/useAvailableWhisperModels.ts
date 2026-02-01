"use client";

/**
 * useAvailableWhisperModels - Dynamic MLX-Whisper Model Discovery
 *
 * Scans ~/mlx-whisper/models/ at runtime for installed models (7-model allowlist).
 * Provides loading state, auto-refresh, and path traversal prevention.
 * Default model: german-turbo.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTauri } from "./useTauri";
import { logger } from "@/lib/logger";
import type { MlxModelInfo, MlxWhisperPaths } from "@/lib/types";

const DEFAULT_MODEL: MlxModelInfo = {
  id: "german-turbo",
  displayName: "German Turbo",
  directory: "whisper-large-v3-turbo-german-f16",
  sizeEstimate: "~1.6GB",
  description: "Optimiert für Deutsch",
};

interface UseAvailableWhisperModelsReturn {
  models: MlxModelInfo[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAvailableWhisperModels(
  mlxPaths?: MlxWhisperPaths,
  enabled: boolean = true
): UseAvailableWhisperModelsReturn {
  const { isTauri, invoke } = useTauri();
  const [models, setModels] = useState<MlxModelInfo[]>([DEFAULT_MODEL]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  // Stable reference for mlxPaths to prevent re-render loops
  const mlxPathsKey = useMemo(
    () => (mlxPaths ? JSON.stringify(mlxPaths) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mlxPaths?.pythonPath, mlxPaths?.modelsDir]
  );

  const discoverModels = useCallback(async () => {
    if (loadingRef.current || !isTauri) return;

    loadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const discovered = await invoke<MlxModelInfo[]>("list_mlx_whisper_models", {
        mlxPaths: mlxPaths || null,
      });

      if (discovered && discovered.length > 0) {
        setModels(discovered);
        logger.info("useAvailableWhisperModels", "Discovered models", { count: discovered.length });
      } else {
        setModels([DEFAULT_MODEL]);
      }
    } catch (err) {
      logger.error("useAvailableWhisperModels", "Discovery failed", err);
      setError(err instanceof Error ? err.message : "Discovery failed");
      setModels([DEFAULT_MODEL]);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTauri, invoke, mlxPathsKey]);

  useEffect(() => {
    if (enabled) discoverModels();
  }, [enabled, discoverModels]);

  return { models, isLoading, error, refresh: discoverModels };
}
