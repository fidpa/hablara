import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { SetupHintsModal } from "@/components/SetupHintsModal";
import { STORAGE_KEYS } from "@/lib/types";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
};
Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("SetupHintsModal", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it("should not render when isOpen is false", () => {
    render(<SetupHintsModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should render when isOpen is true", () => {
    render(<SetupHintsModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Willkommen bei Hablará!")).toBeInTheDocument();
  });

  it("should show setup steps", () => {
    render(<SetupHintsModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText(/Ollama installieren/i)).toBeInTheDocument();
    expect(screen.getByText(/KI-Modell herunterladen/i)).toBeInTheDocument();
    expect(screen.getByText(/Modell optimieren/i)).toBeInTheDocument();
    expect(screen.getByText(/Installation verifizieren/i)).toBeInTheDocument();
  });

  it("should show curl command", () => {
    render(<SetupHintsModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText(/curl -fsSL/i)).toBeInTheDocument();
  });

  it("should call onClose with true when 'Tour starten' is clicked", async () => {
    const onClose = vi.fn();
    render(<SetupHintsModal isOpen={true} onClose={onClose} />);

    const startTourButton = screen.getByText("Verstanden, Tour starten");
    fireEvent.click(startTourButton);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledWith(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEYS.SETUP_HINTS_SEEN, "true");
    });
  });

  it("should not have a 'Später einrichten' button", () => {
    render(<SetupHintsModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.queryByText("Später einrichten")).not.toBeInTheDocument();
  });

  it("should close on Escape key", async () => {
    const onClose = vi.fn();
    render(<SetupHintsModal isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledWith(false);
    });
  });

  it("should close on X button", async () => {
    const onClose = vi.fn();
    render(<SetupHintsModal isOpen={true} onClose={onClose} />);

    const closeButton = screen.getByLabelText("Dialog schließen");
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledWith(false);
    });
  });

  it("should copy command to clipboard when copy button is clicked", async () => {
    // Mock clipboard API
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: writeTextMock,
      },
      writable: true,
      configurable: true,
    });

    render(<SetupHintsModal isOpen={true} onClose={vi.fn()} />);

    const copyButton = screen.getByLabelText("Befehl kopieren");
    fireEvent.click(copyButton);

    // Verify clipboard API was called with correct command
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(
        "ollama pull qwen2.5:7b"
      );
    });

    // Verify button shows "copied" state (title attribute changes)
    await waitFor(() => {
      const button = screen.getByLabelText("Befehl kopieren");
      expect(button).toHaveAttribute("title", "Kopiert!");
    });
  });

  it("should handle clipboard copy failure gracefully", async () => {
    // Mock clipboard API to reject
    const writeTextMock = vi.fn().mockRejectedValue(new Error("Permission denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: writeTextMock,
      },
      writable: true,
      configurable: true,
    });

    render(<SetupHintsModal isOpen={true} onClose={vi.fn()} />);

    const copyButton = screen.getByLabelText("Befehl kopieren");
    fireEvent.click(copyButton);

    // Button should NOT show copied state
    await waitFor(() => {
      const button = screen.getByLabelText("Befehl kopieren");
      expect(button).toHaveAttribute("title", "In Zwischenablage kopieren");
    });
  });
});
