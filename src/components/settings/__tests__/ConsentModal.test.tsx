/**
 * ConsentModal - GDPR Consent Modal Test Suite
 *
 * Tests for GDPR Art. 6(1)(a), Art. 7(3), Art. 13 compliance.
 * Critical for legal compliance - 80%+ coverage required.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { ConsentModal } from "../ConsentModal";
import type { CloudProviderConsent } from "@/lib/types";

describe("ConsentModal - GDPR Compliance Tests", () => {
  const mockOnConsent = vi.fn();
  const mockOnDecline = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Modal Rendering", () => {
    it("should not render when isOpen is false", () => {
      const { container } = render(
        <ConsentModal
          provider="openai"
          isOpen={false}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it("should render when isOpen is true", () => {
      render(
        <ConsentModal
          provider="openai"
          isOpen={true}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      // Check for the heading specifically
      expect(screen.getByRole("heading", { name: /Datenschutzhinweis/i })).toBeDefined();
    });

    it("should display OpenAI provider name correctly", () => {
      render(
        <ConsentModal
          provider="openai"
          isOpen={true}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      // Check for OpenAI in the heading specifically
      expect(screen.getByRole("heading", { name: /OpenAI/i })).toBeDefined();
    });

    it("should display Anthropic provider name correctly", () => {
      render(
        <ConsentModal
          provider="anthropic"
          isOpen={true}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      // Check for Anthropic in the heading specifically
      expect(screen.getByRole("heading", { name: /Anthropic/i })).toBeDefined();
    });
  });

  describe("GDPR Art. 13 - Information Provision", () => {
    it("should display cloud processing notice", () => {
      const { container } = render(
        <ConsentModal
          provider="openai"
          isOpen={true}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      // Check for the strong element with Cloud-Verarbeitung
      const strongElement = container.querySelector("strong");
      expect(strongElement).toBeDefined();
      expect(strongElement?.textContent).toContain("Cloud-Verarbeitung");

      // Check content contains "externe Server"
      expect(container.textContent).toContain("externe Server");
    });

    it("should display data flow information", () => {
      render(
        <ConsentModal
          provider="openai"
          isOpen={true}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      expect(screen.getByText(/Datenfluss/i)).toBeDefined();
      expect(screen.getByText(/lokal durch Whisper transkribiert/i)).toBeDefined();
    });

    it("should display what data is NOT sent", () => {
      render(
        <ConsentModal
          provider="openai"
          isOpen={true}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      expect(screen.getByText(/Nicht übertragen/i)).toBeDefined();
      expect(screen.getByText(/Audio-Dateien/i)).toBeDefined();
    });

    it("should provide link to OpenAI privacy policy", () => {
      render(
        <ConsentModal
          provider="openai"
          isOpen={true}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      const privacyLink = screen.getByRole("link", { name: /OpenAI Datenschutzrichtlinie/i });
      expect(privacyLink).toBeDefined();
      expect(privacyLink.getAttribute("href")).toContain("openai.com/policies/privacy-policy");
      expect(privacyLink.getAttribute("target")).toBe("_blank");
      expect(privacyLink.getAttribute("rel")).toContain("noopener");
    });

    it("should provide link to Anthropic privacy policy", () => {
      render(
        <ConsentModal
          provider="anthropic"
          isOpen={true}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      const privacyLink = screen.getByRole("link", { name: /Anthropic Datenschutzrichtlinie/i });
      expect(privacyLink).toBeDefined();
      expect(privacyLink.getAttribute("href")).toContain("anthropic.com/legal/privacy");
    });

    it("should provide link to terms of use", () => {
      render(
        <ConsentModal
          provider="openai"
          isOpen={true}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      const termsLink = screen.getByRole("link", { name: /OpenAI Nutzungsbedingungen/i });
      expect(termsLink).toBeDefined();
      expect(termsLink.getAttribute("href")).toContain("openai.com/policies/terms-of-use");
    });

    it("should mention local Ollama alternative", () => {
      const { container } = render(
        <ConsentModal
          provider="openai"
          isOpen={true}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      // Check that the modal mentions Ollama as local alternative
      // Using textContent search instead of CSS selector (more robust in JSDOM)
      expect(container.textContent).toContain("Ollama");
      expect(container.textContent).toContain("vollständig lokal");
      expect(container.textContent).toContain("Alternative");
    });
  });

  describe("GDPR Art. 6(1)(a) - Consent Mechanism", () => {
    it("should have unchecked consent checkbox initially", () => {
      render(
        <ConsentModal
          provider="openai"
          isOpen={true}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeDefined();
      expect((checkbox as HTMLInputElement).checked).toBe(false);
    });

    it("should disable consent button when checkbox is unchecked", () => {
      render(
        <ConsentModal
          provider="openai"
          isOpen={true}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      const consentButton = screen.getByRole("button", { name: /Zustimmen/i });
      expect(consentButton).toBeDefined();
      expect((consentButton as HTMLButtonElement).disabled).toBe(true);
    });

    it("should enable consent button when checkbox is checked", () => {
      render(
        <ConsentModal
          provider="openai"
          isOpen={true}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);

      const consentButton = screen.getByRole("button", { name: /Zustimmen/i });
      expect((consentButton as HTMLButtonElement).disabled).toBe(false);
    });

    it("should call onConsent with correct data when consenting", async () => {
      render(
        <ConsentModal
          provider="openai"
          isOpen={true}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      // Check the checkbox
      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);

      // Click consent button
      const consentButton = screen.getByRole("button", { name: /Zustimmen/i });
      fireEvent.click(consentButton);

      await waitFor(() => {
        expect(mockOnConsent).toHaveBeenCalledTimes(1);
        const consent = mockOnConsent.mock.calls[0]?.[0] as CloudProviderConsent;
        expect(consent.provider).toBe("openai");
        expect(consent.agreed).toBe(true);
        expect(consent.timestamp).toBeDefined();
        expect(consent.version).toBe("1.0");
      });
    });

    it("should call onConsent with correct provider for Anthropic", async () => {
      render(
        <ConsentModal
          provider="anthropic"
          isOpen={true}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);

      const consentButton = screen.getByRole("button", { name: /Zustimmen/i });
      fireEvent.click(consentButton);

      await waitFor(() => {
        const consent = mockOnConsent.mock.calls[0]?.[0] as CloudProviderConsent;
        expect(consent.provider).toBe("anthropic");
      });
    });

    it("should NOT call onConsent when button clicked without checkbox", () => {
      render(
        <ConsentModal
          provider="openai"
          isOpen={true}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      // Try to click consent button without checking checkbox
      const consentButton = screen.getByRole("button", { name: /Zustimmen/i });
      fireEvent.click(consentButton);

      expect(mockOnConsent).not.toHaveBeenCalled();
    });
  });

  describe("GDPR Art. 7(3) - Withdrawal of Consent", () => {
    it("should call onDecline when decline button clicked", () => {
      render(
        <ConsentModal
          provider="openai"
          isOpen={true}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      const declineButton = screen.getByRole("button", { name: /Ablehnen/i });
      fireEvent.click(declineButton);

      expect(mockOnDecline).toHaveBeenCalledTimes(1);
    });

    it("should call onDecline when close button clicked", () => {
      render(
        <ConsentModal
          provider="openai"
          isOpen={true}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      const closeButton = screen.getByRole("button", { name: /Dialog schließen/i });
      fireEvent.click(closeButton);

      expect(mockOnDecline).toHaveBeenCalledTimes(1);
    });

    it("should mention ability to withdraw consent by switching to Ollama", () => {
      render(
        <ConsentModal
          provider="openai"
          isOpen={true}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      expect(screen.getByText(/jederzeit durch Wechsel zu Ollama widerrufen/i)).toBeDefined();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible close button", () => {
      render(
        <ConsentModal
          provider="openai"
          isOpen={true}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      const closeButton = screen.getByRole("button", { name: /Dialog schließen/i });
      expect(closeButton).toBeDefined();
    });

    it("should have focusable checkbox", () => {
      render(
        <ConsentModal
          provider="openai"
          isOpen={true}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeDefined();
    });

    it("should have all links open in new tab with noopener", () => {
      render(
        <ConsentModal
          provider="openai"
          isOpen={true}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      const links = screen.getAllByRole("link");
      links.forEach((link) => {
        expect(link.getAttribute("target")).toBe("_blank");
        expect(link.getAttribute("rel")).toContain("noopener");
      });
    });
  });

  describe("UI State", () => {
    it("should toggle checkbox state on click", () => {
      render(
        <ConsentModal
          provider="openai"
          isOpen={true}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      const checkbox = screen.getByRole("checkbox") as HTMLInputElement;

      expect(checkbox.checked).toBe(false);
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(false);
    });

    it("should have different button styles based on checkbox state", () => {
      render(
        <ConsentModal
          provider="openai"
          isOpen={true}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      const consentButton = screen.getByRole("button", { name: /Zustimmen/i });

      // Initially disabled - should have specific class
      expect(consentButton.className).toContain("cursor-not-allowed");

      // Check the checkbox
      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);

      // Should now be enabled with different style
      expect(consentButton.className).not.toContain("cursor-not-allowed");
    });
  });

  describe("Consent Data Structure", () => {
    it("should include ISO timestamp in consent object", async () => {
      const beforeTime = new Date().toISOString();

      render(
        <ConsentModal
          provider="openai"
          isOpen={true}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);

      const consentButton = screen.getByRole("button", { name: /Zustimmen/i });
      fireEvent.click(consentButton);

      await waitFor(() => {
        const consent = mockOnConsent.mock.calls[0]?.[0] as CloudProviderConsent;
        const afterTime = new Date().toISOString();

        // Timestamp should be between before and after
        expect(consent.timestamp >= beforeTime).toBe(true);
        expect(consent.timestamp <= afterTime).toBe(true);
      });
    });

    it("should include version number for future consent updates", async () => {
      render(
        <ConsentModal
          provider="openai"
          isOpen={true}
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />
      );

      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);

      const consentButton = screen.getByRole("button", { name: /Zustimmen/i });
      fireEvent.click(consentButton);

      await waitFor(() => {
        const consent = mockOnConsent.mock.calls[0]?.[0] as CloudProviderConsent;
        expect(consent.version).toBe("1.0");
      });
    });
  });
});
