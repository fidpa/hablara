/**
 * Tests for SecretServiceWarning.tsx (Phase 55: Linux Secret Service Robustness)
 *
 * P2-3: Unit tests for all SecretServiceStatus states
 *
 * Tests cover:
 * - Rendering for all 5 status types
 * - Correct warning messages
 * - Installation hints for 'unavailable'
 * - Daemon hints for 'timeout'
 * - Browser session warning for 'not-tauri'
 * - No render for 'available' and 'not-linux'
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SecretServiceWarning } from "@/components/settings/SecretServiceWarning";
import type { SecretServiceStatus } from "@/lib/secure-storage";

describe("SecretServiceWarning", () => {
  describe("rendering behavior", () => {
    it("should render nothing for 'available' status", () => {
      const { container } = render(<SecretServiceWarning status="available" />);
      expect(container).toBeEmptyDOMElement();
    });

    it("should render nothing for 'not-linux' status (macOS/Windows)", () => {
      const { container } = render(<SecretServiceWarning status="not-linux" />);
      expect(container).toBeEmptyDOMElement();
    });

    it("should render warning for 'unavailable' status", () => {
      render(<SecretServiceWarning status="unavailable" />);
      expect(screen.getByText(/Linux Keyring-Hinweis/i)).toBeInTheDocument();
    });

    it("should render warning for 'timeout' status", () => {
      render(<SecretServiceWarning status="timeout" />);
      expect(screen.getByText(/Linux Keyring-Hinweis/i)).toBeInTheDocument();
    });

    it("should render warning for 'not-tauri' status (browser)", () => {
      render(<SecretServiceWarning status="not-tauri" />);
      expect(screen.getByText(/Linux Keyring-Hinweis/i)).toBeInTheDocument();
    });
  });

  describe("'unavailable' status content", () => {
    it("should show gnome-keyring installation hint", () => {
      render(<SecretServiceWarning status="unavailable" />);
      expect(screen.getByText(/gnome-keyring/i)).toBeInTheDocument();
    });

    it("should mention KWallet as alternative", () => {
      render(<SecretServiceWarning status="unavailable" />);
      // KWallet appears in both status message and extended text
      const elements = screen.getAllByText(/KWallet/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it("should explain that API keys cannot be stored securely", () => {
      render(<SecretServiceWarning status="unavailable" />);
      expect(screen.getByText(/nicht sicher gespeichert/i)).toBeInTheDocument();
    });
  });

  describe("'timeout' status content", () => {
    it("should mention that daemon is not responding", () => {
      render(<SecretServiceWarning status="timeout" />);
      // Use getAllByText since the phrase appears in both status message and extended text
      const elements = screen.getAllByText(/antwortet nicht/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it("should show diagnostic command hint", () => {
      render(<SecretServiceWarning status="timeout" />);
      expect(screen.getByText(/ps aux \| grep keyring/i)).toBeInTheDocument();
    });
  });

  describe("'not-tauri' status content", () => {
    it("should explain that keys are session-only in browser", () => {
      render(<SecretServiceWarning status="not-tauri" />);
      expect(screen.getByText(/aktuelle Sitzung/i)).toBeInTheDocument();
    });

    it("should warn that keys will be lost", () => {
      render(<SecretServiceWarning status="not-tauri" />);
      expect(screen.getByText(/gehen verloren/i)).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have aria-hidden on decorative icon", () => {
      render(<SecretServiceWarning status="unavailable" />);
      const icon = document.querySelector('svg[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe("all status types handled", () => {
    it("should handle all defined SecretServiceStatus values without error", () => {
      const allStatuses: SecretServiceStatus[] = [
        "available",
        "unavailable",
        "timeout",
        "not-linux",
        "not-tauri",
      ];

      allStatuses.forEach((status) => {
        // Should not throw
        expect(() => render(<SecretServiceWarning status={status} />)).not.toThrow();
      });
    });
  });
});
