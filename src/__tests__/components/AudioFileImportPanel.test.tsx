import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AudioFileImportPanel } from "@/components/AudioFileImportPanel";

describe("AudioFileImportPanel", () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  describe("Initial Render", () => {
    it("should render drop zone with correct text", () => {
      render(
        <AudioFileImportPanel
          onSubmit={mockOnSubmit}
          disabled={false}
          isTauri={false}
        />
      );

      expect(screen.getByText("Audio-Datei hierher ziehen")).toBeInTheDocument();
      expect(screen.getByText(/WAV, MP3, M4A, OGG/)).toBeInTheDocument();
    });

    it("should show file selection button", () => {
      render(
        <AudioFileImportPanel
          onSubmit={mockOnSubmit}
          disabled={false}
          isTauri={false}
        />
      );

      expect(screen.getByRole("button", { name: /Datei.*wählen/i })).toBeInTheDocument();
    });

    it("should show disabled analyze button initially", () => {
      render(
        <AudioFileImportPanel
          onSubmit={mockOnSubmit}
          disabled={false}
          isTauri={false}
        />
      );

      const analyzeButton = screen.getByRole("button", { name: /Analysieren/i });
      expect(analyzeButton).toBeInTheDocument();
      expect(analyzeButton).toBeDisabled();
    });
  });

  describe("Drag and Drop", () => {
    it("should highlight drop zone on drag over", () => {
      render(
        <AudioFileImportPanel
          onSubmit={mockOnSubmit}
          disabled={false}
          isTauri={false}
        />
      );

      const dropZone = screen.getByTestId("audio-drop-zone");

      fireEvent.dragOver(dropZone);

      // Drop zone should have visual feedback class
      expect(dropZone).toHaveClass("border-primary");
    });

    it("should remove highlight on drag leave", () => {
      render(
        <AudioFileImportPanel
          onSubmit={mockOnSubmit}
          disabled={false}
          isTauri={false}
        />
      );

      const dropZone = screen.getByTestId("audio-drop-zone");

      fireEvent.dragOver(dropZone);
      fireEvent.dragLeave(dropZone);

      expect(dropZone).not.toHaveClass("border-primary");
    });

    it("should accept valid audio file via drop", async () => {
      render(
        <AudioFileImportPanel
          onSubmit={mockOnSubmit}
          disabled={false}
          isTauri={false}
        />
      );

      const dropZone = screen.getByTestId("audio-drop-zone");
      const file = new File(["audio content"], "test.mp3", { type: "audio/mpeg" });

      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
        },
      });

      await waitFor(() => {
        expect(screen.getByText("test.mp3")).toBeInTheDocument();
      });

      const analyzeButton = screen.getByRole("button", { name: /Analysieren/i });
      expect(analyzeButton).not.toBeDisabled();
    });

    it("should reject invalid file via drop", async () => {
      render(
        <AudioFileImportPanel
          onSubmit={mockOnSubmit}
          disabled={false}
          isTauri={false}
        />
      );

      const dropZone = screen.getByTestId("audio-drop-zone");
      const file = new File(["text content"], "test.txt", { type: "text/plain" });

      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
        },
      });

      await waitFor(() => {
        // Should show error message
        expect(screen.queryByText("test.txt")).not.toBeInTheDocument();
      });
    });

    it("should reject file larger than 50 MB", async () => {
      render(
        <AudioFileImportPanel
          onSubmit={mockOnSubmit}
          disabled={false}
          isTauri={false}
        />
      );

      const dropZone = screen.getByTestId("audio-drop-zone");
      const largeBuffer = new ArrayBuffer(51 * 1024 * 1024);
      const file = new File([largeBuffer], "large.mp3", { type: "audio/mpeg" });

      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
        },
      });

      await waitFor(() => {
        expect(screen.queryByText("large.mp3")).not.toBeInTheDocument();
      });
    });
  });

  describe("File Dialog", () => {
    it("should open file dialog on button click", () => {
      render(
        <AudioFileImportPanel
          onSubmit={mockOnSubmit}
          disabled={false}
          isTauri={false}
        />
      );

      const button = screen.getByRole("button", { name: /Datei.*wählen/i });
      const fileInput = screen.getByTestId("audio-file-input");

      const clickSpy = vi.spyOn(fileInput, "click");

      fireEvent.click(button);

      expect(clickSpy).toHaveBeenCalled();
    });

    it("should accept valid audio file via file dialog", async () => {
      render(
        <AudioFileImportPanel
          onSubmit={mockOnSubmit}
          disabled={false}
          isTauri={false}
        />
      );

      const fileInput = screen.getByTestId("audio-file-input");
      const file = new File(["audio content"], "test.wav", { type: "audio/wav" });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText("test.wav")).toBeInTheDocument();
      });
    });
  });

  describe("File Info Display", () => {
    it("should display file name and size after selection", async () => {
      render(
        <AudioFileImportPanel
          onSubmit={mockOnSubmit}
          disabled={false}
          isTauri={false}
        />
      );

      const fileInput = screen.getByTestId("audio-file-input");
      const file = new File(["a".repeat(1024 * 1024)], "test.mp3", {
        type: "audio/mpeg",
      });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText("test.mp3")).toBeInTheDocument();
        expect(screen.getByText(/1\.00 MB/)).toBeInTheDocument();
      });
    });

    it("should show warning for large files (>80% of limit)", async () => {
      render(
        <AudioFileImportPanel
          onSubmit={mockOnSubmit}
          disabled={false}
          isTauri={false}
        />
      );

      const fileInput = screen.getByTestId("audio-file-input");
      const largeBuffer = new ArrayBuffer(41 * 1024 * 1024); // 41 MB (>80% of 50MB default)
      const file = new File([largeBuffer], "large.mp3", { type: "audio/mpeg" });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/Große Datei/)).toBeInTheDocument();
        expect(screen.getByText(/Verarbeitung kann länger dauern/)).toBeInTheDocument();
      });
    });

    it("should not show warning for small files (<80% of limit)", async () => {
      render(
        <AudioFileImportPanel
          onSubmit={mockOnSubmit}
          disabled={false}
          isTauri={false}
        />
      );

      const fileInput = screen.getByTestId("audio-file-input");
      const smallBuffer = new ArrayBuffer(10 * 1024 * 1024); // 10 MB
      const file = new File([smallBuffer], "small.mp3", { type: "audio/mpeg" });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText("small.mp3")).toBeInTheDocument();
      });

      expect(screen.queryByText("Große Datei")).not.toBeInTheDocument();
    });

    it("should show clear button after file selection", async () => {
      render(
        <AudioFileImportPanel
          onSubmit={mockOnSubmit}
          disabled={false}
          isTauri={false}
        />
      );

      const fileInput = screen.getByTestId("audio-file-input");
      const file = new File(["audio"], "test.mp3", { type: "audio/mpeg" });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const clearButton = screen.getByLabelText("Clear file");
        expect(clearButton).toBeInTheDocument();
      });
    });

    it("should clear file on clear button click", async () => {
      render(
        <AudioFileImportPanel
          onSubmit={mockOnSubmit}
          disabled={false}
          isTauri={false}
        />
      );

      const fileInput = screen.getByTestId("audio-file-input");
      const file = new File(["audio"], "test.mp3", { type: "audio/mpeg" });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText("test.mp3")).toBeInTheDocument();
      });

      const clearButton = screen.getByLabelText("Clear file");
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.queryByText("test.mp3")).not.toBeInTheDocument();
      });
    });
  });

  describe("Analyze Button", () => {
    it("should call onSubmit with file when analyze button clicked", async () => {
      render(
        <AudioFileImportPanel
          onSubmit={mockOnSubmit}
          disabled={false}
          isTauri={false}
        />
      );

      const fileInput = screen.getByTestId("audio-file-input");
      const file = new File(["audio"], "test.mp3", { type: "audio/mpeg" });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText("test.mp3")).toBeInTheDocument();
      });

      const analyzeButton = screen.getByRole("button", { name: /Analysieren/i });
      fireEvent.click(analyzeButton);

      expect(mockOnSubmit).toHaveBeenCalledWith(file);
    });

    it("should disable analyze button when disabled prop is true", () => {
      render(
        <AudioFileImportPanel
          onSubmit={mockOnSubmit}
          disabled={true}
          isTauri={false}
        />
      );

      const analyzeButton = screen.getByRole("button", { name: /Analysieren/i });
      expect(analyzeButton).toBeDisabled();
    });
  });

  describe("Disabled State", () => {
    it("should disable all interactions when disabled", () => {
      render(
        <AudioFileImportPanel
          onSubmit={mockOnSubmit}
          disabled={true}
          isTauri={false}
        />
      );

      const dropZone = screen.getByTestId("audio-drop-zone");
      const selectButton = screen.getByRole("button", { name: /Datei.*wählen/i });
      const analyzeButton = screen.getByRole("button", { name: /Analysieren/i });

      expect(dropZone).toHaveClass("opacity-50");
      expect(selectButton).toBeDisabled();
      expect(analyzeButton).toBeDisabled();
    });
  });
});
