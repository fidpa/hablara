import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatExportButton } from '../ChatExportButton';
import type { ChatMessage } from '@/lib/types';

// Hoisted mocks
const { mockToast, mockUseToast, mockIsTauri } = vi.hoisted(() => ({
  mockToast: vi.fn(),
  mockUseToast: vi.fn(),
  mockIsTauri: vi.fn(),
}));

// Set default implementations
mockUseToast.mockImplementation(() => ({ toast: mockToast }));
mockIsTauri.mockImplementation(() => ({ isTauri: false }));

// Mock dependencies
vi.mock('@/hooks/use-toast', () => ({
  useToast: mockUseToast,
}));

vi.mock('@/hooks/useTauri', () => ({
  useTauri: mockIsTauri,
}));

vi.mock('@/lib/export-chat', () => ({
  exportChatHistory: vi.fn(),
  DEFAULT_EXPORT_OPTIONS: {},
}));

const mockMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    content: 'Test message',
    timestamp: new Date('2026-01-29T10:00:00Z'),
    source: 'audio',
  },
  {
    id: '2',
    role: 'assistant',
    content: 'Test response',
    timestamp: new Date('2026-01-29T10:00:05Z'),
    source: 'llm',
  },
];

describe('ChatExportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render export button', () => {
    render(<ChatExportButton messages={mockMessages} />);

    expect(screen.getByRole('button', { name: /exportieren/i })).toBeInTheDocument();
  });

  it('should be disabled when no messages', () => {
    render(<ChatExportButton messages={[]} />);

    const button = screen.getByRole('button', { name: /exportieren/i });
    expect(button).toBeDisabled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<ChatExportButton messages={mockMessages} disabled />);

    const button = screen.getByRole('button', { name: /exportieren/i });
    expect(button).toBeDisabled();
  });

  it('should show dropdown menu with 4 export formats on click', async () => {
    const user = userEvent.setup();
    render(<ChatExportButton messages={mockMessages} />);

    const button = screen.getByRole('button', { name: /exportieren/i });
    await user.click(button);

    // Wait for menu to appear
    expect(await screen.findByText(/Als Markdown/i)).toBeInTheDocument();
    expect(screen.getByText(/Als Text/i)).toBeInTheDocument();
    expect(screen.getByText(/Als PDF/i)).toBeInTheDocument();
    expect(screen.getByText(/Als Word/i)).toBeInTheDocument();
  });

  describe('Export functionality', () => {
    it('should call exportChatHistory when format is selected', async () => {
      const user = userEvent.setup();
      const { exportChatHistory } = await import('@/lib/export-chat');
      vi.mocked(exportChatHistory).mockResolvedValue({ success: true, filePath: '/path/to/file.md' });

      render(<ChatExportButton messages={mockMessages} />);

      const button = screen.getByRole('button', { name: /exportieren/i });
      await user.click(button);

      const markdownOption = await screen.findByText(/Als Markdown/i);
      await user.click(markdownOption);

      await waitFor(() => {
        expect(exportChatHistory).toHaveBeenCalledWith(
          mockMessages,
          'markdown',
          expect.any(Object)
        );
      });
    });
  });

  describe('Finder Integration (Tauri)', () => {
    it('should show toast WITHOUT "Im Finder anzeigen" when not in Tauri', async () => {
      const user = userEvent.setup();
      const { exportChatHistory } = await import('@/lib/export-chat');

      mockUseToast.mockReturnValue({ toast: mockToast });
      vi.mocked(exportChatHistory).mockResolvedValue({
        success: true,
        filePath: '/path/to/file.md'
      });

      render(<ChatExportButton messages={mockMessages} />);

      const button = screen.getByRole('button', { name: /exportieren/i });
      await user.click(button);

      const markdownOption = await screen.findByText(/Als Markdown/i);
      await user.click(markdownOption);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Export erfolgreich',
            action: undefined, // No action in browser
          })
        );
      });
    });

    it('should show toast WITH "Im Finder anzeigen" when in Tauri with filePath', async () => {
      const user = userEvent.setup();
      const { exportChatHistory } = await import('@/lib/export-chat');

      mockToast.mockClear();
      mockUseToast.mockReturnValue({ toast: mockToast });
      mockIsTauri.mockReturnValue({ isTauri: true, isReady: true });
      vi.mocked(exportChatHistory).mockResolvedValue({
        success: true,
        filePath: '/path/to/file.md'
      });

      render(<ChatExportButton messages={mockMessages} />);

      const button = screen.getByRole('button', { name: /exportieren/i });
      await user.click(button);

      const markdownOption = await screen.findByText(/Als Markdown/i);
      await user.click(markdownOption);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Export erfolgreich',
            action: expect.any(Object), // ToastAction present in Tauri
          })
        );
      });
    });

    it.skip('should NOT show toast action when export has no filePath', async () => {
      const user = userEvent.setup();
      const { exportChatHistory } = await import('@/lib/export-chat');

      mockToast.mockClear();
      mockUseToast.mockReturnValue({ toast: mockToast });
      mockIsTauri.mockReturnValue({ isTauri: true, isReady: true });
      vi.mocked(exportChatHistory).mockResolvedValue({
        success: true,
        // No filePath
      });

      render(<ChatExportButton messages={mockMessages} />);

      const button = screen.getByRole('button', { name: /exportieren/i });
      await user.click(button);

      const markdownOption = await screen.findByText(/Als Markdown/i);
      await user.click(markdownOption);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Export erfolgreich',
            action: undefined, // No action without filePath
          })
        );
      });
    });
  });

  describe('Error handling', () => {
    it('should show error toast when export fails', async () => {
      const user = userEvent.setup();
      const { exportChatHistory } = await import('@/lib/export-chat');

      mockToast.mockClear();
      mockUseToast.mockReturnValue({ toast: mockToast });
      vi.mocked(exportChatHistory).mockResolvedValue({
        success: false,
        error: 'Export failed'
      });

      render(<ChatExportButton messages={mockMessages} />);

      const button = screen.getByRole('button', { name: /exportieren/i });
      await user.click(button);

      const markdownOption = await screen.findByText(/Als Markdown/i);
      await user.click(markdownOption);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Export fehlgeschlagen',
            variant: 'destructive',
          })
        );
      });
    });

    it('should NOT show toast when user cancels', async () => {
      const user = userEvent.setup();
      const { exportChatHistory } = await import('@/lib/export-chat');

      mockToast.mockClear();
      mockUseToast.mockReturnValue({ toast: mockToast });
      vi.mocked(exportChatHistory).mockResolvedValue({
        success: false,
        cancelled: true,
      });

      render(<ChatExportButton messages={mockMessages} />);

      const button = screen.getByRole('button', { name: /exportieren/i });
      await user.click(button);

      const markdownOption = await screen.findByText(/Als Markdown/i);
      await user.click(markdownOption);

      await waitFor(() => {
        expect(mockToast).not.toHaveBeenCalled(); // Silent on cancel
      });
    });
  });
});
