import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecordingsLibrary } from '../RecordingsLibrary';
import { useToast } from '@/hooks/use-toast';
import { useRecordings } from '@/hooks/useRecordings';

// Valid Base64 WAV data (minimal WAV header + silence) - used across all tests
const validBase64Audio = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

// Hoisted mocks to avoid "Cannot access before initialization" errors
const { mockToast, mockUseToast, mockIsTauri, mockRefresh, mockGetRecordingAudio,
        mockDownloadRecording, mockDeleteRecording, mockClearAllRecordings, mockUseRecordings } = vi.hoisted(() => ({
  mockToast: vi.fn(),
  mockUseToast: vi.fn(),
  mockIsTauri: vi.fn(),
  mockRefresh: vi.fn(),
  mockGetRecordingAudio: vi.fn(),
  mockDownloadRecording: vi.fn(),
  mockDeleteRecording: vi.fn(),
  mockClearAllRecordings: vi.fn(),
  mockUseRecordings: vi.fn(),
}));

// Set default implementations
mockUseToast.mockImplementation(() => ({ toast: mockToast }));
mockIsTauri.mockImplementation(() => ({ isTauri: false }));
mockUseRecordings.mockImplementation(() => ({
  recordings: [],
  isLoading: false,
  error: null,
  stats: null,
  refresh: mockRefresh,
  getRecordingAudio: mockGetRecordingAudio,
  downloadRecording: mockDownloadRecording,
  deleteRecording: mockDeleteRecording,
  clearAllRecordings: mockClearAllRecordings,
}));

// Mock dependencies
vi.mock('@/hooks/use-toast', () => ({
  useToast: mockUseToast,
}));

vi.mock('@/hooks/useTauri', () => ({
  useTauri: mockIsTauri,
}));

vi.mock('@/hooks/useRecordings', () => ({
  useRecordings: mockUseRecordings,
  formatDuration: (ms: number) => `${Math.floor(ms / 1000)}s`,
  formatFileSize: (bytes: number) => `${bytes}B`,
  formatDate: (date: string) => date,
}));

describe('RecordingsLibrary', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render recordings library header', () => {
    render(<RecordingsLibrary onClose={mockOnClose} />);

    expect(screen.getByRole('heading', { name: /aufnahmen/i })).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(<RecordingsLibrary onClose={mockOnClose} />);

    const closeButton = screen.getByRole('button', { name: /bibliothek schließen/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should show empty state when no recordings', () => {
    render(<RecordingsLibrary onClose={mockOnClose} />);

    expect(screen.getByText(/keine aufnahmen vorhanden/i)).toBeInTheDocument();
  });

  describe('Download Finder Integration', () => {
    it('should show toast WITHOUT "Im Finder anzeigen" when not in Tauri', async () => {
      const mockToast = vi.fn();
      const mockDownloadRecording = vi.fn().mockResolvedValue({
        success: true,
        filePath: '/path/to/recording.wav'
      });

      mockUseToast.mockReturnValue({ toast: mockToast });
      mockUseRecordings.mockReturnValue({
        recordings: [
          {
            id: 'rec-1',
            createdAt: '2026-01-29T10:00:00Z',
            durationMs: 5000,
            fileSize: 1024,
            sampleRate: 16000,
            appVersion: '1.0.0',
            transcription: { text: 'Test', segments: [], language: 'de' },
            audioValidation: { passed: true, rmsEnergy: 0.5 },
            provider: 'ollama',
            model: 'qwen2.5:7b',
          },
        ],
        isLoading: false,
        error: null,
        stats: null,
        refresh: vi.fn(),
        getRecordingAudio: vi.fn(),
        downloadRecording: mockDownloadRecording,
        deleteRecording: vi.fn(),
        clearAllRecordings: vi.fn(),
      });

      render(<RecordingsLibrary onClose={mockOnClose} />);

      // Click download button (aria-label="Audio herunterladen")
      const downloadButton = screen.getByRole('button', { name: /audio herunterladen/i });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(mockDownloadRecording).toHaveBeenCalledWith('rec-1', '2026-01-29T10:00:00Z');
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Download erfolgreich',
            action: undefined, // No action in browser
          })
        );
      });
    });

    it('should show toast WITH "Im Finder anzeigen" when in Tauri with filePath', async () => {
      const mockToast = vi.fn();
      const mockDownloadRecording = vi.fn().mockResolvedValue({
        success: true,
        filePath: '/path/to/recording.wav'
      });

      vi.mocked(useToast).mockReturnValue({ toast: mockToast });
      mockIsTauri.mockReturnValue({ isTauri: true, isReady: true });
      vi.mocked(useRecordings).mockReturnValue({
        recordings: [
          {
            id: 'rec-1',
            createdAt: '2026-01-29T10:00:00Z',
            durationMs: 5000,
            fileSize: 1024,
            sampleRate: 16000,
            appVersion: '1.0.0',
            transcription: { text: 'Test', segments: [], language: 'de' },
            audioValidation: { passed: true, rmsEnergy: 0.5 },
            provider: 'ollama',
            model: 'qwen2.5:7b',
          },
        ],
        isLoading: false,
        error: null,
        stats: null,
        refresh: vi.fn(),
        getRecordingAudio: vi.fn(),
        downloadRecording: mockDownloadRecording,
        deleteRecording: vi.fn(),
        clearAllRecordings: vi.fn(),
      });

      render(<RecordingsLibrary onClose={mockOnClose} />);

      // Click download button (aria-label="Audio herunterladen")
      const downloadButton = screen.getByRole('button', { name: /audio herunterladen/i });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(mockDownloadRecording).toHaveBeenCalledWith('rec-1', '2026-01-29T10:00:00Z');
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Download erfolgreich',
            action: expect.any(Object), // ToastAction present in Tauri
            duration: 5000, // 5s auto-dismiss
          })
        );
      });
    });

    it('should NOT show toast when user cancels download', async () => {
      const mockToast = vi.fn();
      const mockDownloadRecording = vi.fn().mockResolvedValue({
        success: false,
        cancelled: true,
      });

      mockUseToast.mockReturnValue({ toast: mockToast });
      mockUseRecordings.mockReturnValue({
        recordings: [
          {
            id: 'rec-1',
            createdAt: '2026-01-29T10:00:00Z',
            durationMs: 5000,
            fileSize: 1024,
            sampleRate: 16000,
            appVersion: '1.0.0',
            transcription: { text: 'Test', segments: [], language: 'de' },
            audioValidation: { passed: true, rmsEnergy: 0.5 },
            provider: 'ollama',
            model: 'qwen2.5:7b',
          },
        ],
        isLoading: false,
        error: null,
        stats: null,
        refresh: vi.fn(),
        getRecordingAudio: vi.fn(),
        downloadRecording: mockDownloadRecording,
        deleteRecording: vi.fn(),
        clearAllRecordings: vi.fn(),
      });

      render(<RecordingsLibrary onClose={mockOnClose} />);

      // Click download button (aria-label="Audio herunterladen")
      const downloadButton = screen.getByRole('button', { name: /audio herunterladen/i });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(mockDownloadRecording).toHaveBeenCalledWith('rec-1', '2026-01-29T10:00:00Z');
        expect(mockToast).not.toHaveBeenCalled(); // Silent on cancel
      });
    });

    it('should show error toast when download fails', async () => {
      const mockToast = vi.fn();
      const mockDownloadRecording = vi.fn().mockResolvedValue({
        success: false,
        error: 'Download failed'
      });

      mockUseToast.mockReturnValue({ toast: mockToast });
      mockUseRecordings.mockReturnValue({
        recordings: [
          {
            id: 'rec-1',
            createdAt: '2026-01-29T10:00:00Z',
            durationMs: 5000,
            fileSize: 1024,
            sampleRate: 16000,
            appVersion: '1.0.0',
            transcription: { text: 'Test', segments: [], language: 'de' },
            audioValidation: { passed: true, rmsEnergy: 0.5 },
            provider: 'ollama',
            model: 'qwen2.5:7b',
          },
        ],
        isLoading: false,
        error: null,
        stats: null,
        refresh: vi.fn(),
        getRecordingAudio: vi.fn(),
        downloadRecording: mockDownloadRecording,
        deleteRecording: vi.fn(),
        clearAllRecordings: vi.fn(),
      });

      render(<RecordingsLibrary onClose={mockOnClose} />);

      // Click download button (aria-label="Audio herunterladen")
      const downloadButton = screen.getByRole('button', { name: /audio herunterladen/i });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(mockDownloadRecording).toHaveBeenCalledWith('rec-1', '2026-01-29T10:00:00Z');
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Download fehlgeschlagen',
            variant: 'destructive',
          })
        );
      });
    });
  });

  describe('Inline Audio Player', () => {
    it('should render audio player inline in the playing card', async () => {
      const mockRecordings = [
        {
          id: 'rec-1',
          createdAt: '2026-01-29T10:00:00Z',
          durationMs: 5000,
          fileSize: 1024,
          sampleRate: 16000,
          appVersion: '1.0.0',
          transcription: { text: 'Test 1', segments: [], language: 'de' },
          audioValidation: { passed: true, rmsEnergy: 0.5 },
          provider: 'ollama',
          model: 'qwen2.5:7b',
        },
        {
          id: 'rec-2',
          createdAt: '2026-01-29T11:00:00Z',
          durationMs: 3000,
          fileSize: 512,
          sampleRate: 16000,
          appVersion: '1.0.0',
          transcription: { text: 'Test 2', segments: [], language: 'de' },
          audioValidation: { passed: true, rmsEnergy: 0.4 },
          provider: 'ollama',
          model: 'qwen2.5:7b',
        },
      ];

      mockUseRecordings.mockReturnValue({
        recordings: mockRecordings,
        isLoading: false,
        error: null,
        stats: null,
        refresh: mockRefresh,
        getRecordingAudio: mockGetRecordingAudio.mockResolvedValue(validBase64Audio),
        downloadRecording: mockDownloadRecording,
        deleteRecording: mockDeleteRecording,
        clearAllRecordings: mockClearAllRecordings,
      });

      const { container } = render(<RecordingsLibrary onClose={mockOnClose} />);

      // Click play button on first recording
      const playButtons = screen.getAllByLabelText(/aufnahme abspielen/i);
      fireEvent.click(playButtons[0]);

      await waitFor(() => {
        // Player should appear in first card
        const cards = container.querySelectorAll('[class*="overflow-hidden"]');
        const firstCard = cards[0] as HTMLElement;
        const player = firstCard.querySelector('[role="region"][aria-label="Audio Player"]');
        expect(player).toBeInTheDocument();

        // Player should NOT be in second card
        const secondCard = cards[1] as HTMLElement;
        const secondPlayer = secondCard.querySelector('[role="region"][aria-label="Audio Player"]');
        expect(secondPlayer).not.toBeInTheDocument();
      });
    });

    it('should move player to new card when switching recordings', async () => {
      const mockRecordings = [
        {
          id: 'rec-1',
          createdAt: '2026-01-29T10:00:00Z',
          durationMs: 5000,
          fileSize: 1024,
          sampleRate: 16000,
          appVersion: '1.0.0',
          transcription: { text: 'Test 1', segments: [], language: 'de' },
          audioValidation: { passed: true, rmsEnergy: 0.5 },
          provider: 'ollama',
          model: 'qwen2.5:7b',
        },
        {
          id: 'rec-2',
          createdAt: '2026-01-29T11:00:00Z',
          durationMs: 3000,
          fileSize: 512,
          sampleRate: 16000,
          appVersion: '1.0.0',
          transcription: { text: 'Test 2', segments: [], language: 'de' },
          audioValidation: { passed: true, rmsEnergy: 0.4 },
          provider: 'ollama',
          model: 'qwen2.5:7b',
        },
      ];

      mockUseRecordings.mockReturnValue({
        recordings: mockRecordings,
        isLoading: false,
        error: null,
        stats: null,
        refresh: mockRefresh,
        getRecordingAudio: mockGetRecordingAudio.mockResolvedValue(validBase64Audio),
        downloadRecording: mockDownloadRecording,
        deleteRecording: mockDeleteRecording,
        clearAllRecordings: mockClearAllRecordings,
      });

      const { container } = render(<RecordingsLibrary onClose={mockOnClose} />);

      // Play first recording
      const playButtons = screen.getAllByLabelText(/aufnahme abspielen/i);
      fireEvent.click(playButtons[0]);

      await waitFor(() => {
        const cards = container.querySelectorAll('[class*="overflow-hidden"]');
        const firstCard = cards[0] as HTMLElement;
        expect(firstCard.querySelector('[role="region"]')).toBeInTheDocument();
      });

      // Switch to second recording
      fireEvent.click(playButtons[1]);

      await waitFor(() => {
        const cards = container.querySelectorAll('[class*="overflow-hidden"]');
        const firstCard = cards[0] as HTMLElement;
        const secondCard = cards[1] as HTMLElement;

        // Player should be gone from first card
        expect(firstCard.querySelector('[role="region"]')).not.toBeInTheDocument();

        // Player should be in second card
        expect(secondCard.querySelector('[role="region"]')).toBeInTheDocument();
      });
    });

    it('should NOT render audio player at top level', async () => {
      const mockRecordings = [
        {
          id: 'rec-1',
          createdAt: '2026-01-29T10:00:00Z',
          durationMs: 5000,
          fileSize: 1024,
          sampleRate: 16000,
          appVersion: '1.0.0',
          transcription: { text: 'Test', segments: [], language: 'de' },
          audioValidation: { passed: true, rmsEnergy: 0.5 },
          provider: 'ollama',
          model: 'qwen2.5:7b',
        },
      ];

      mockUseRecordings.mockReturnValue({
        recordings: mockRecordings,
        isLoading: false,
        error: null,
        stats: null,
        refresh: mockRefresh,
        getRecordingAudio: mockGetRecordingAudio.mockResolvedValue(validBase64Audio),
        downloadRecording: mockDownloadRecording,
        deleteRecording: mockDeleteRecording,
        clearAllRecordings: mockClearAllRecordings,
      });

      const { container } = render(<RecordingsLibrary onClose={mockOnClose} />);

      // Click play button
      const playButton = screen.getByLabelText(/aufnahme abspielen/i);
      fireEvent.click(playButton);

      await waitFor(() => {
        // Check that no player exists at top level (with border-b class)
        const topLevelPlayers = container.querySelectorAll('.border-b > [role="region"]');
        expect(topLevelPlayers).toHaveLength(0);

        // Verify player exists somewhere (inline in card)
        const anyPlayer = container.querySelector('[role="region"][aria-label="Audio Player"]');
        expect(anyPlayer).toBeInTheDocument();
      });
    });

    it('should toggle player when clicking play button twice', async () => {
      const mockRecordings = [
        {
          id: 'rec-1',
          createdAt: '2026-01-29T10:00:00Z',
          durationMs: 5000,
          fileSize: 1024,
          sampleRate: 16000,
          appVersion: '1.0.0',
          transcription: { text: 'Test', segments: [], language: 'de' },
          audioValidation: { passed: true, rmsEnergy: 0.5 },
          provider: 'ollama',
          model: 'qwen2.5:7b',
        },
      ];

      mockUseRecordings.mockReturnValue({
        recordings: mockRecordings,
        isLoading: false,
        error: null,
        stats: null,
        refresh: mockRefresh,
        getRecordingAudio: mockGetRecordingAudio.mockResolvedValue(validBase64Audio),
        downloadRecording: mockDownloadRecording,
        deleteRecording: mockDeleteRecording,
        clearAllRecordings: mockClearAllRecordings,
      });

      const { container } = render(<RecordingsLibrary onClose={mockOnClose} />);

      const playButton = screen.getByLabelText(/aufnahme abspielen/i);

      // First click: show player
      fireEvent.click(playButton);

      await waitFor(() => {
        const player = container.querySelector('[role="region"][aria-label="Audio Player"]');
        expect(player).toBeInTheDocument();
      });

      // Second click: hide player (toggle)
      fireEvent.click(playButton);

      await waitFor(() => {
        const player = container.querySelector('[role="region"][aria-label="Audio Player"]');
        expect(player).not.toBeInTheDocument();
      });
    });

    it('should update play button aria-label when playing', async () => {
      const mockRecordings = [
        {
          id: 'rec-1',
          createdAt: '2026-01-29T10:00:00Z',
          durationMs: 5000,
          fileSize: 1024,
          sampleRate: 16000,
          appVersion: '1.0.0',
          transcription: { text: 'Test', segments: [], language: 'de' },
          audioValidation: { passed: true, rmsEnergy: 0.5 },
          provider: 'ollama',
          model: 'qwen2.5:7b',
        },
      ];

      mockUseRecordings.mockReturnValue({
        recordings: mockRecordings,
        isLoading: false,
        error: null,
        stats: null,
        refresh: mockRefresh,
        getRecordingAudio: mockGetRecordingAudio.mockResolvedValue(validBase64Audio),
        downloadRecording: mockDownloadRecording,
        deleteRecording: mockDeleteRecording,
        clearAllRecordings: mockClearAllRecordings,
      });

      render(<RecordingsLibrary onClose={mockOnClose} />);

      // Initial state: "Aufnahme abspielen"
      const playButton = screen.getByLabelText(/aufnahme abspielen/i);
      expect(playButton).toHaveAttribute('aria-label', 'Aufnahme abspielen');

      // After clicking: "Wiedergabe stoppen"
      fireEvent.click(playButton);

      await waitFor(() => {
        const stopButton = screen.getByLabelText(/wiedergabe stoppen/i);
        expect(stopButton).toBeInTheDocument();
      });
    });
  });
});
