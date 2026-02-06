import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { SetupHintsModal } from "@/components/SetupHintsModal";
import { STORAGE_KEYS } from "@/lib/types";

// Mock isWindows to control platform-specific behavior in tests
vi.mock("@/lib/utils", async () => {
  const actual = await vi.importActual("@/lib/utils");
  return {
    ...actual,
    isWindows: vi.fn(() => false),
  };
});

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
  beforeEach(async () => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Reset isWindows mock to default (macOS/Linux)
    const { isWindows } = await import("@/lib/utils");
    vi.mocked(isWindows).mockReturnValue(false);
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

  it("should show setup steps for Direct Distribution", () => {
    render(<SetupHintsModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText(/Ollama installieren/i)).toBeInTheDocument();
    expect(screen.getByText(/KI-Modell herunterladen/i)).toBeInTheDocument();
    expect(screen.getByText(/Modell optimieren/i)).toBeInTheDocument();
    expect(screen.getByText(/Installation verifizieren/i)).toBeInTheDocument();
  });

  it("should show curl setup command on macOS/Linux", () => {
    render(<SetupHintsModal isOpen={true} onClose={() => {}} />);
    const codeElement = document.querySelector("code");
    expect(codeElement).toBeTruthy();
    expect(codeElement?.textContent).toContain("curl -fsSL");
    expect(codeElement?.textContent).toContain("setup-ollama-mac.sh");
  });

  it("should show PowerShell setup command on Windows", async () => {
    const { isWindows } = await import("@/lib/utils");
    vi.mocked(isWindows).mockReturnValue(true);

    render(<SetupHintsModal isOpen={true} onClose={() => {}} />);
    const codeElement = document.querySelector("code");
    expect(codeElement).toBeTruthy();
    expect(codeElement?.textContent).toContain("Invoke-WebRequest");
    expect(codeElement?.textContent).toContain("setup-ollama-win.ps1");
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

  it("should copy setup command to clipboard when copy button is clicked", async () => {
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

    // Verify clipboard API was called with setup script command (macOS/Linux via mock)
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(
        "curl -fsSL https://raw.githubusercontent.com/fidpa/hablara/main/scripts/setup-ollama-mac.sh | bash"
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
