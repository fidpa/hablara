/**
 * ThemeToggleSection - Settings Section for Light/Dark/System Theme Toggle
 *
 * 3-state cycle button (Light → Dark → System) mit Mounted-Check für SSR-Safety.
 * Verwendet next-themes für zero-flicker theme switching.
 * Siehe ADR-049-light-mode-toggle.md
 */

"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggleSection(): JSX.Element {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch - only render after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Erscheinungsbild</h3>
          <p className="text-sm text-muted-foreground">
            Wähle dein bevorzugtes Farbschema
          </p>
        </div>
        <div className="h-10 bg-muted/50 rounded animate-pulse" />
      </div>
    );
  }

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  const getThemeIcon = () => {
    if (theme === "light") return <Sun className="h-4 w-4" aria-hidden="true" />;
    if (theme === "dark") return <Moon className="h-4 w-4" aria-hidden="true" />;
    return <Monitor className="h-4 w-4" aria-hidden="true" />;
  };

  const getThemeLabel = () => {
    if (theme === "light") return "Hell";
    if (theme === "dark") return "Dunkel";
    return "System";
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Erscheinungsbild</h3>
        <p className="text-sm text-muted-foreground">
          Wähle dein bevorzugtes Farbschema
        </p>
      </div>

      <Button
        variant="outline"
        onClick={cycleTheme}
        className="w-full justify-start gap-2"
        aria-label={`Erscheinungsbild: ${getThemeLabel()}. Klicken zum Wechseln.`}
      >
        {getThemeIcon()}
        <span>{getThemeLabel()}</span>
      </Button>
    </div>
  );
}
