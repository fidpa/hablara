"use client";

/**
 * ShortcutsModal - Displays available keyboard shortcuts
 *
 * Shows a modal with all keyboard shortcuts available in Hablará.
 * Opened via Help menu → Tastaturkürzel (⌘?)
 *
 * @see docs/reference/guidelines/REACT_TSX.md Section 11 (Accessibility)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Keyboard } from "lucide-react";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  hotkey: string;
}

interface ShortcutItem {
  id: string;
  keys: string;
  keysMac: string;
  description: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { id: "settings", keysMac: "⌘ ,", keys: "Strg ,", description: "Einstellungen öffnen" },
  { id: "shortcuts", keysMac: "⌘ ?", keys: "Strg ?", description: "Tastaturkürzel anzeigen" },
  { id: "escape", keysMac: "Esc", keys: "Esc", description: "Panel/Dialog schließen" },
  { id: "clipboard", keysMac: "⌘ ⇧ T", keys: "Strg Shift T", description: "Text aus Zwischenablage importieren" },
];

/**
 * Formats a hotkey string for display
 * macOS: "CommandOrControl+Shift+D" → "⌘ ⇧ D"
 * Windows/Linux: "CommandOrControl+Shift+D" → "Strg Shift D"
 */
function formatHotkey(hotkey: string, isMac: boolean): string {
  if (isMac) {
    return hotkey
      .replace("CommandOrControl", "⌘")
      .replace("Control", "⌃")
      .replace("Shift", "⇧")
      .replace("Alt", "⌥")
      .replace("Option", "⌥")
      .replace(/\+/g, " ");
  }
  return hotkey
    .replace("CommandOrControl", "Strg")
    .replace("Control", "Strg")
    .replace("Alt", "Alt")
    .replace(/\+/g, " ");
}

export function ShortcutsModal({ isOpen, onClose, hotkey }: ShortcutsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  // Detect platform client-side to avoid hydration mismatch (SSR renders with isMac=false)
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.platform));
  }, []);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Focus trap for accessibility (WCAG 2.1 AA)
  useEffect(() => {
    if (!isOpen) return;

    const modalElement = modalRef.current;
    if (!modalElement) return;

    const focusableElements = modalElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const focusableArray = Array.from(focusableElements) as HTMLElement[];
    const firstElement = focusableArray[0];
    const lastElement = focusableArray[focusableArray.length - 1];

    // Set initial focus
    firstElement?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    window.addEventListener("keydown", handleTab);
    return () => window.removeEventListener("keydown", handleTab);
  }, [isOpen]);

  // Close on backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  // Build shortcuts list with dynamic hotkey
  const allShortcuts: ShortcutItem[] = [
    {
      id: "record",
      keysMac: formatHotkey(hotkey, true),
      keys: formatHotkey(hotkey, false),
      description: "Aufnahme starten/stoppen",
    },
    ...SHORTCUTS,
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-md mx-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h2 id="shortcuts-title" className="text-lg font-semibold text-slate-900 dark:text-white">
              Tastaturkürzel
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:ring-offset-slate-900 rounded"
            aria-label="Dialog schließen"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          {allShortcuts.map((shortcut) => (
            <div
              key={shortcut.id}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {shortcut.description}
              </span>
              <kbd className="px-2 py-1 text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded">
                {isMac ? shortcut.keysMac : shortcut.keys}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Aufnahme-Hotkey kann in Einstellungen geändert werden
          </p>
        </div>
      </div>
    </div>
  );
}
