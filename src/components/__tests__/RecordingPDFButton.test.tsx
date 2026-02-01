/**
 * RecordingPDFButton Component Tests
 *
 * Test coverage for PDF export button with Finder integration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecordingPDFButton } from '@/components/RecordingPDFButton';
import type { RecordingMetadata } from '@/lib/types';

// Mock functions - defined inside vi.mock to avoid hoisting issues
const mockToast = vi.fn();
const mockExportRecordingAsPDF = vi.fn();
const mockRevealItemInDir = vi.fn();
const mockExists = vi.fn();
const mockLoggerInfo = vi.fn();
const mockLoggerWarn = vi.fn();
const mockLoggerError = vi.fn();

// Create a mutable mock for useTauri
let mockIsTauri = false;

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/hooks/useTauri', () => ({
  useTauri: () => ({ isTauri: mockIsTauri }),
}));

vi.mock('@/lib/export-recording', () => ({
  exportRecordingAsPDF: (...args: unknown[]) => mockExportRecordingAsPDF(...args),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}));

// Mock Tauri plugins (dynamic import)
vi.mock('@tauri-apps/plugin-opener', () => ({
  revealItemInDir: (...args: unknown[]) => mockRevealItemInDir(...args),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  exists: (...args: unknown[]) => mockExists(...args),
}));

const mockRecording: RecordingMetadata = {
  id: 'rec-1',
  createdAt: '2026-01-30T10:00:00Z',
  durationMs: 5000,
  fileSize: 1024,
  sampleRate: 16000,
  appVersion: '1.0.0',
  transcription: {
    text: 'Test transcript',
    segments: [],
    language: 'de',
  },
  audioValidation: {
    passed: true,
    rmsEnergy: 0.5,
  },
  provider: 'ollama',
  model: 'qwen2.5:7b',
};

const mockRecordingNoTranscript: RecordingMetadata = {
  ...mockRecording,
  transcription: undefined,
};

describe('RecordingPDFButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsTauri = false; // Reset to web environment
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render PDF export button', () => {
      render(<RecordingPDFButton recording={mockRecording} />);

      const button = screen.getByRole('button', { name: /als pdf exportieren/i });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    it('should disable button when no transcript available', () => {
      render(<RecordingPDFButton recording={mockRecordingNoTranscript} />);

      const button = screen.getByRole('button', { name: /pdf-export nicht verfügbar/i });
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'Kein Transkript vorhanden');
    });
  });

  describe('Export Success', () => {
    it('should show success toast WITHOUT action button (web environment)', async () => {
      mockExportRecordingAsPDF.mockResolvedValue({
        success: true,
        filePath: '/path/to/export.pdf',
        cancelled: false,
      });

      render(<RecordingPDFButton recording={mockRecording} />);

      const button = screen.getByRole('button', { name: /als pdf exportieren/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockExportRecordingAsPDF).toHaveBeenCalledWith('rec-1');
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Export erfolgreich',
            action: undefined, // No action in web environment
            duration: 5000,
          })
        );
      });
    });

    it('should show success toast WITH Finder button (Tauri environment)', async () => {
      // Set Tauri environment
      mockIsTauri = true;

      mockExportRecordingAsPDF.mockResolvedValue({
        success: true,
        filePath: '/path/to/export.pdf',
        cancelled: false,
      });

      render(<RecordingPDFButton recording={mockRecording} />);

      const button = screen.getByRole('button', { name: /als pdf exportieren/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Export erfolgreich',
            action: expect.anything(), // Action present in Tauri
            duration: 5000,
          })
        );
      });
    });

    it('should show filename in success toast description', async () => {
      mockExportRecordingAsPDF.mockResolvedValue({
        success: true,
        filePath: '/path/to/my-export.pdf',
        cancelled: false,
      });

      render(<RecordingPDFButton recording={mockRecording} />);

      const button = screen.getByRole('button', { name: /als pdf exportieren/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            description: 'Gespeichert: my-export.pdf',
          })
        );
      });
    });

    it('should set toast duration to 5000ms', async () => {
      mockExportRecordingAsPDF.mockResolvedValue({
        success: true,
        filePath: '/path/to/export.pdf',
        cancelled: false,
      });

      render(<RecordingPDFButton recording={mockRecording} />);

      const button = screen.getByRole('button', { name: /als pdf exportieren/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            duration: 5000,
          })
        );
      });
    });
  });

  describe('Finder Integration', () => {
    it('should call revealItemInDir when Finder action clicked', async () => {
      // Set Tauri environment
      mockIsTauri = true;

      mockExportRecordingAsPDF.mockResolvedValue({
        success: true,
        filePath: '/path/to/export.pdf',
        cancelled: false,
      });

      // File exists check
      mockExists.mockResolvedValue(true);

      render(<RecordingPDFButton recording={mockRecording} />);

      const button = screen.getByRole('button', { name: /als pdf exportieren/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled();
      });

      // Extract and click action button
      const toastCall = mockToast.mock.calls[0][0];
      const action = toastCall.action;

      expect(action).toBeDefined();

      // Simulate action click
      if (action && action.props && action.props.onClick) {
        await action.props.onClick();
      }

      await waitFor(() => {
        expect(mockExists).toHaveBeenCalledWith('/path/to/export.pdf');
        expect(mockRevealItemInDir).toHaveBeenCalledWith('/path/to/export.pdf');
      });
    });

    it('should show warning toast when Finder reveal fails', async () => {
      // Shows warning toast instead of silent error
      mockIsTauri = true;

      mockExportRecordingAsPDF.mockResolvedValue({
        success: true,
        filePath: '/path/to/export.pdf',
        cancelled: false,
      });

      // File exists but reveal fails
      mockExists.mockResolvedValue(true);
      mockRevealItemInDir.mockRejectedValue(new Error('Finder error'));

      render(<RecordingPDFButton recording={mockRecording} />);

      const button = screen.getByRole('button', { name: /als pdf exportieren/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled();
      });

      // Extract and click action button
      const toastCall = mockToast.mock.calls[0][0];
      const action = toastCall.action;

      if (action && action.props && action.props.onClick) {
        await action.props.onClick();
      }

      await waitFor(() => {
        // Logger.error called in finder-utils, not component
        expect(mockLoggerError).toHaveBeenCalledWith(
          'FinderUtils',
          'Reveal failed',
          expect.any(Error)
        );
      });

      // Warning toast shown for user feedback
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledTimes(2); // Success toast + Warning toast
        const warningToast = mockToast.mock.calls[1][0];
        expect(warningToast.title).toBe('Datei nicht verfügbar');
        expect(warningToast.description).toBe('Finder konnte nicht geöffnet werden.');
      });
    });

    it('should show warning toast when file not found', async () => {
      // Phase 48: NEW - Test file_not_found error path
      mockIsTauri = true;

      mockExportRecordingAsPDF.mockResolvedValue({
        success: true,
        filePath: '/path/to/export.pdf',
        cancelled: false,
      });

      // File does not exist
      mockExists.mockResolvedValue(false);

      render(<RecordingPDFButton recording={mockRecording} />);

      const button = screen.getByRole('button', { name: /als pdf exportieren/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled();
      });

      // Extract and click action button
      const toastCall = mockToast.mock.calls[0][0];
      const action = toastCall.action;

      if (action && action.props && action.props.onClick) {
        await action.props.onClick();
      }

      await waitFor(() => {
        expect(mockExists).toHaveBeenCalledWith('/path/to/export.pdf');
        // revealItemInDir NOT called (file doesn't exist)
        expect(mockRevealItemInDir).not.toHaveBeenCalled();
      });

      // Warning toast shown
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledTimes(2); // Success toast + Warning toast
        const warningToast = mockToast.mock.calls[1][0];
        expect(warningToast.title).toBe('Datei nicht verfügbar');
        expect(warningToast.description).toBe('Datei nicht gefunden. Möglicherweise verschoben oder gelöscht.');
      });
    });
  });

  describe('Cancel Handling', () => {
    it('should NOT show toast when user cancels save dialog', async () => {
      mockExportRecordingAsPDF.mockResolvedValue({
        success: false,
        cancelled: true,
      });

      render(<RecordingPDFButton recording={mockRecording} />);

      const button = screen.getByRole('button', { name: /als pdf exportieren/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockExportRecordingAsPDF).toHaveBeenCalledWith('rec-1');
      });

      // No toast shown
      expect(mockToast).not.toHaveBeenCalled();

      // Info log only
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'RecordingPDFButton',
        'User cancelled PDF export'
      );
    });
  });
});
