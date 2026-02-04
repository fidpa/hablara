/**
 * Utility Functions
 *
 * cn() - Tailwind class merging (clsx + twMerge)
 * colorWithOpacity() - Hex to rgba conversion für dynamic opacity
 * formatProcessingDuration() - Processing time formatter (ms/s)
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Converts a hex color to rgba with specified opacity.
 * Used for dynamic opacity on emotion/fallacy colors.
 *
 * @param hex - Hex color string (e.g., "#ef4444")
 * @param opacity - Opacity value between 0 and 1
 * @returns rgba color string
 *
 * @example
 * colorWithOpacity("#ef4444", 0.3) // "rgba(239, 68, 68, 0.3)"
 */
export function colorWithOpacity(hex: string, opacity: number): string {
  // Handle CSS variable - extract hex from map
  if (hex.startsWith("var(")) {
    const varName = hex.slice(4, -1); // Remove "var(" and ")"
    const hexValue = CSS_VAR_TO_HEX[varName];
    if (hexValue) {
      hex = hexValue;
    } else {
      // Fallback: return CSS color-mix if hex not found
      return `color-mix(in srgb, ${hex} ${Math.round(opacity * 100)}%, transparent)`;
    }
  }

  // Parse hex color
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result || !result[1] || !result[2] || !result[3]) {
    return hex; // Return original if parsing fails
  }

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Mapping of CSS variable names to hex values.
 * Used by colorWithOpacity for dynamic opacity application.
 * Source of truth: globals.css :root
 */
const CSS_VAR_TO_HEX: Record<string, string> = {
  // Emotion colors
  "--color-emotion-neutral": "#6b7280",
  "--color-emotion-calm": "#22c55e",
  "--color-emotion-stress": "#ef4444",
  "--color-emotion-excitement": "#f59e0b",
  "--color-emotion-uncertainty": "#8b5cf6",
  "--color-emotion-frustration": "#dc2626",
  "--color-emotion-joy": "#10b981",
  "--color-emotion-doubt": "#a855f7",
  "--color-emotion-conviction": "#3b82f6",
  "--color-emotion-aggression": "#b91c1c",
  // Fallacy colors - Tier 1
  "--color-fallacy-ad-hominem": "#ef4444",
  "--color-fallacy-straw-man": "#f97316",
  "--color-fallacy-false-dichotomy": "#eab308",
  "--color-fallacy-appeal-authority": "#84cc16",
  "--color-fallacy-circular": "#06b6d4",
  "--color-fallacy-slippery-slope": "#8b5cf6",
  // Fallacy colors - Tier 2
  "--color-fallacy-red-herring": "#dc2626",
  "--color-fallacy-tu-quoque": "#ea580c",
  "--color-fallacy-hasty-generalization": "#d97706",
  "--color-fallacy-post-hoc": "#ca8a04",
  "--color-fallacy-bandwagon": "#65a30d",
  "--color-fallacy-appeal-emotion": "#16a34a",
  "--color-fallacy-appeal-ignorance": "#059669",
  "--color-fallacy-loaded-question": "#0d9488",
  "--color-fallacy-no-true-scotsman": "#0891b2",
  "--color-fallacy-false-cause": "#0284c7",
  // Topic colors
  "--color-topic-work-career": "#3b82f6",
  "--color-topic-health-wellbeing": "#22c55e",
  "--color-topic-relationships-social": "#ec4899",
  "--color-topic-finances": "#f59e0b",
  "--color-topic-personal-development": "#8b5cf6",
  "--color-topic-creativity-hobbies": "#06b6d4",
  "--color-topic-other": "#6b7280",
  // Tone dimension colors
  "--color-tone-formality": "#3b82f6",
  "--color-tone-professionalism": "#8b5cf6",
  "--color-tone-directness": "#f59e0b",
  "--color-tone-energy": "#ef4444",
  "--color-tone-seriousness": "#22c55e",
  // Audio level colors
  "--color-level-normal": "#22c55e",
  "--color-level-warning": "#eab308",
  "--color-level-danger": "#ef4444",
};

export function formatTimestamp(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Check if code is running in Tauri context (Desktop app vs Browser)
 * @returns true if running in Tauri desktop app, false if running in browser
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

/**
 * Check if running on macOS (for platform-specific features like MLX)
 * Uses navigator.userAgentData (modern) with navigator.platform fallback (deprecated but reliable in Tauri)
 * @returns true if running on macOS, false otherwise
 */
export function isMacOS(): boolean {
  if (typeof window === "undefined") return false;

  // Modern API (Chrome 90+, Edge 90+) - preferred
  // Note: Safari doesn't support userAgentData, but that's fine since Safari is macOS-only
  // TypeScript doesn't include userAgentData in lib.dom.d.ts yet, so we use type assertion
  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  if (nav.userAgentData?.platform) {
    return nav.userAgentData.platform.toLowerCase() === "macos";
  }

  // Fallback: navigator.platform (deprecated but reliable in Tauri WebView)
  const platform = navigator.platform?.toLowerCase() || "";
  return platform.includes("mac");
}

/**
 * Check if running on Windows (for platform-specific setup scripts)
 * Uses navigator.userAgentData (modern) with navigator.platform fallback (deprecated but reliable in Tauri)
 * @returns true if running on Windows, false otherwise
 */
export function isWindows(): boolean {
  if (typeof window === "undefined") return false;

  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  if (nav.userAgentData?.platform) {
    return nav.userAgentData.platform.toLowerCase() === "windows";
  }

  // Fallback: navigator.platform (deprecated but reliable in Tauri WebView)
  const platform = navigator.platform?.toLowerCase() || "";
  return platform.includes("win");
}

/**
 * Check if running on Linux (for platform-specific features like Wayland detection)
 * Uses navigator.userAgentData (modern) with navigator.platform fallback (deprecated but reliable in Tauri)
 * @returns true if running on Linux, false otherwise
 */
export function isLinux(): boolean {
  if (typeof window === "undefined") return false;

  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  if (nav.userAgentData?.platform) {
    return nav.userAgentData.platform.toLowerCase() === "linux";
  }

  // Fallback: navigator.platform (deprecated but reliable in Tauri WebView)
  const platform = navigator.platform?.toLowerCase() || "";
  return platform.includes("linux");
}

/**
 * Formatiert Processing-Duration für Badge-Anzeige
 * @param ms Duration in Millisekunden
 * @returns Formatierter String (z.B. "4.2s" oder "850ms")
 */
export function formatProcessingDuration(ms: number): string {
  if (ms < 0) return "0ms"; // Defensive guard
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${Math.round(ms)}ms`;
}
