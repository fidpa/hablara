/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PermissionOnboarding } from "../PermissionOnboarding";

// Mock usePermissions hook
const mockRequestMicrophone = vi.fn();
const mockRecheckPermissions = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: vi.fn(() => ({
    microphoneStatus: "not_determined",
    isChecking: false,
    requestMicrophone: mockRequestMicrophone,
    recheckPermissions: mockRecheckPermissions,
  })),
}));

// Mock Tauri shell plugin
const mockOpen = vi.fn();
vi.mock("@tauri-apps/plugin-shell", () => ({
  open: mockOpen,
}));

describe("PermissionOnboarding", () => {
  const mockOnComplete = vi.fn();
  const mockOnSkip = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__TAURI__ = undefined;
  });

  describe("Rendering", () => {
    it("should not render when isOpen is false", () => {
      render(
        <PermissionOnboarding
          isOpen={false}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should render when isOpen is true", () => {
      render(
        <PermissionOnboarding
          isOpen={true}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Hablará benötigt Berechtigungen")).toBeInTheDocument();
    });

    it("should render microphone card", () => {
      render(
        <PermissionOnboarding
          isOpen={true}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      expect(screen.getByText("Mikrofon")).toBeInTheDocument();
      expect(screen.getByText("Erforderlich für Sprachaufnahmen")).toBeInTheDocument();
    });

    it("should render input monitoring card", () => {
      render(
        <PermissionOnboarding
          isOpen={true}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      expect(screen.getByText("Tastenkürzel")).toBeInTheDocument();
      expect(screen.getByText("Optional - Wird vom Hotkey-Agent angefragt")).toBeInTheDocument();
    });
  });

  describe("Microphone Status Display", () => {
    it("should show checking status", async () => {
      const { usePermissions } = await import("@/hooks/usePermissions");
      vi.mocked(usePermissions).mockReturnValue({
        microphoneStatus: "checking",
        isChecking: true,
        requestMicrophone: mockRequestMicrophone,
        recheckPermissions: mockRecheckPermissions,
      });

      render(
        <PermissionOnboarding
          isOpen={true}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      expect(screen.getByText("Prüfe...")).toBeInTheDocument();
    });

    it("should show authorized status", async () => {
      const { usePermissions } = await import("@/hooks/usePermissions");
      vi.mocked(usePermissions).mockReturnValue({
        microphoneStatus: "authorized",
        isChecking: false,
        requestMicrophone: mockRequestMicrophone,
        recheckPermissions: mockRecheckPermissions,
      });

      render(
        <PermissionOnboarding
          isOpen={true}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      expect(screen.getByText("Autorisiert")).toBeInTheDocument();
    });

    it("should show denied status", async () => {
      const { usePermissions } = await import("@/hooks/usePermissions");
      vi.mocked(usePermissions).mockReturnValue({
        microphoneStatus: "denied",
        isChecking: false,
        requestMicrophone: mockRequestMicrophone,
        recheckPermissions: mockRecheckPermissions,
      });

      render(
        <PermissionOnboarding
          isOpen={true}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      expect(screen.getByText("Nicht autorisiert")).toBeInTheDocument();
      expect(screen.getByText("Systemeinstellungen öffnen")).toBeInTheDocument();
    });

    it("should show not determined status", async () => {
      const { usePermissions } = await import("@/hooks/usePermissions");
      vi.mocked(usePermissions).mockReturnValue({
        microphoneStatus: "not_determined",
        isChecking: false,
        requestMicrophone: mockRequestMicrophone,
        recheckPermissions: mockRecheckPermissions,
      });

      render(
        <PermissionOnboarding
          isOpen={true}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      expect(screen.getByText("Berechtigung erforderlich")).toBeInTheDocument();
      expect(screen.getByText("Berechtigung erteilen")).toBeInTheDocument();
    });
  });

  describe("Button States", () => {
    it("should enable continue button when microphone is authorized", async () => {
      const { usePermissions } = await import("@/hooks/usePermissions");
      vi.mocked(usePermissions).mockReturnValue({
        microphoneStatus: "authorized",
        isChecking: false,
        requestMicrophone: mockRequestMicrophone,
        recheckPermissions: mockRecheckPermissions,
      });

      render(
        <PermissionOnboarding
          isOpen={true}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      const continueButton = screen.getByText("Weiter zur App");
      expect(continueButton).not.toBeDisabled();
    });

    it("should disable continue button when microphone is not authorized", async () => {
      const { usePermissions } = await import("@/hooks/usePermissions");
      vi.mocked(usePermissions).mockReturnValue({
        microphoneStatus: "not_determined",
        isChecking: false,
        requestMicrophone: mockRequestMicrophone,
        recheckPermissions: mockRecheckPermissions,
      });

      render(
        <PermissionOnboarding
          isOpen={true}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      const continueButton = screen.getByText("Weiter zur App");
      expect(continueButton).toBeDisabled();
    });
  });

  describe("User Interactions", () => {
    it("should call onComplete when continue button is clicked", async () => {
      const user = userEvent.setup();
      const { usePermissions } = await import("@/hooks/usePermissions");
      vi.mocked(usePermissions).mockReturnValue({
        microphoneStatus: "authorized",
        isChecking: false,
        requestMicrophone: mockRequestMicrophone,
        recheckPermissions: mockRecheckPermissions,
      });

      render(
        <PermissionOnboarding
          isOpen={true}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      const continueButton = screen.getByText("Weiter zur App");
      await user.click(continueButton);

      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });

    it("should call onSkip when close button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <PermissionOnboarding
          isOpen={true}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      const closeButton = screen.getByLabelText("Dialog schließen");
      await user.click(closeButton);

      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });

    it("should call onSkip when skip link is clicked", async () => {
      const user = userEvent.setup();

      render(
        <PermissionOnboarding
          isOpen={true}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      const skipLink = screen.getByText("Später einrichten");
      await user.click(skipLink);

      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });

    it("should request microphone permission when button is clicked", async () => {
      const user = userEvent.setup();
      mockRequestMicrophone.mockResolvedValue(true);

      const { usePermissions } = await import("@/hooks/usePermissions");
      vi.mocked(usePermissions).mockReturnValue({
        microphoneStatus: "not_determined",
        isChecking: false,
        requestMicrophone: mockRequestMicrophone,
        recheckPermissions: mockRecheckPermissions,
      });

      render(
        <PermissionOnboarding
          isOpen={true}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      const requestButton = screen.getByText("Berechtigung erteilen");
      await user.click(requestButton);

      await waitFor(() => {
        expect(mockRequestMicrophone).toHaveBeenCalledTimes(1);
      });
    });

    it("should open System Settings when denied and settings button clicked", async () => {
      const user = userEvent.setup();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__TAURI__ = {}; // Set Tauri environment

      const { usePermissions } = await import("@/hooks/usePermissions");
      vi.mocked(usePermissions).mockReturnValue({
        microphoneStatus: "denied",
        isChecking: false,
        requestMicrophone: mockRequestMicrophone,
        recheckPermissions: mockRecheckPermissions,
      });

      render(
        <PermissionOnboarding
          isOpen={true}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      const settingsButton = screen.getByText("Systemeinstellungen öffnen");
      await user.click(settingsButton);

      await waitFor(() => {
        expect(mockOpen).toHaveBeenCalledWith(
          "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone"
        );
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      render(
        <PermissionOnboarding
          isOpen={true}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby", "permission-title");
      expect(dialog).toHaveAttribute("aria-describedby", "permission-description");
    });

    it("should handle Escape key to close", async () => {
      const user = userEvent.setup();

      render(
        <PermissionOnboarding
          isOpen={true}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      await user.keyboard("{Escape}");

      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });
  });
});
