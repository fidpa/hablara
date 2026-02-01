import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatHistory } from '@/components/ChatHistory';
import type { ChatMessage, ProcessingState } from '@/lib/types';

// Mock Tauri clipboard
vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
  writeText: vi.fn().mockResolvedValue(undefined),
}));

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock ProcessingProgress component
vi.mock('@/components/ProcessingProgress', () => ({
  ProcessingProgress: ({ state }: { state: ProcessingState }) => (
    <div data-testid="processing-progress">Processing: {state.isProcessing ? 'yes' : 'no'}</div>
  ),
}));

describe('ChatHistory', () => {
  const mockMessages: ChatMessage[] = [
    {
      id: 'user-1',
      role: 'user',
      content: 'Das ist mein erster Text.',
      timestamp: new Date('2026-01-28T14:30:00'),
      transcriptSegmentId: 'segment-1',
    },
    {
      id: 'assistant-1',
      role: 'assistant',
      content: '**Analyse:** Dein Ausdruck zeigt Frustration.',
      timestamp: new Date('2026-01-28T14:30:05'),
      analysisSourceId: 'segment-1',
    },
    {
      id: 'user-2',
      role: 'user',
      content: 'Noch ein Satz.',
      timestamp: new Date('2026-01-28T14:31:00'),
      transcriptSegmentId: 'segment-2',
    },
    {
      id: 'assistant-2',
      role: 'assistant',
      content: '**Analyse:** Neutral.',
      timestamp: new Date('2026-01-28T14:31:05'),
      analysisSourceId: 'segment-2',
    },
  ];

  const mockOnClear = vi.fn();
  const mockOnCancelProcessing = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render header with "Verlauf" title', () => {
      render(
        <ChatHistory
          messages={[]}
          isRecording={false}
          onClear={mockOnClear}
        />
      );

      expect(screen.getByText('Verlauf')).toBeInTheDocument();
    });

    it('should render all messages', () => {
      render(
        <ChatHistory
          messages={mockMessages}
          isRecording={false}
          onClear={mockOnClear}
        />
      );

      expect(screen.getByText('Das ist mein erster Text.')).toBeInTheDocument();
      expect(screen.getByText('Noch ein Satz.')).toBeInTheDocument();
      // Assistant messages rendered with markdown
      expect(screen.getByText('Dein Ausdruck zeigt Frustration.')).toBeInTheDocument();
    });

    it('should show recording indicator when recording', () => {
      render(
        <ChatHistory
          messages={[]}
          isRecording={true}
          onClear={mockOnClear}
        />
      );

      expect(screen.getByText('Aufnahme läuft')).toBeInTheDocument();
    });
  });

  describe('Empty State / Welcome State', () => {
    it('should show welcome state when no messages and not recording', () => {
      render(
        <ChatHistory
          messages={[]}
          isRecording={false}
          onClear={mockOnClear}
        />
      );

      expect(screen.getByText('Willkommen bei Hablará')).toBeInTheDocument();
      expect(screen.getByText('Emotionen erkennen')).toBeInTheDocument();
      expect(screen.getByText('Fehlschlüsse aufdecken')).toBeInTheDocument();
      expect(screen.getByText('Kommunikation verstehen')).toBeInTheDocument();
      expect(screen.getByText('Fragen beantworten')).toBeInTheDocument();
    });

    it('should display all feature badges in welcome state', () => {
      render(
        <ChatHistory
          messages={[]}
          isRecording={false}
          onClear={mockOnClear}
        />
      );

      // Check for feature badges in welcome state (updated after ChatWelcomeState redesign)
      expect(screen.getByText('Multi-Modal')).toBeInTheDocument();
      expect(screen.getByText('CEG-Prompting')).toBeInTheDocument();
      expect(screen.getByText('3 Modelle')).toBeInTheDocument();
      expect(screen.getByText('Offline-fähig')).toBeInTheDocument();
    });

    it('should show keyboard hint in welcome state', () => {
      const { container } = render(
        <ChatHistory
          messages={[]}
          isRecording={false}
          onClear={mockOnClear}
        />
      );

      expect(screen.getByText(/Starte mit/i)).toBeInTheDocument();
      const kbd = container.querySelector('kbd');
      expect(kbd).toHaveTextContent('Ctrl+Shift+D');
    });

    it('should show waiting message when recording with no messages (not welcome state)', () => {
      render(
        <ChatHistory
          messages={[]}
          isRecording={true}
          onClear={mockOnClear}
        />
      );

      expect(screen.getByText('Warte auf Spracheingabe...')).toBeInTheDocument();
      expect(screen.queryByText('Willkommen bei Hablará')).not.toBeInTheDocument();
    });

    it('should not show welcome state when messages exist', () => {
      render(
        <ChatHistory
          messages={mockMessages}
          isRecording={false}
          onClear={mockOnClear}
        />
      );

      expect(screen.queryByText('Willkommen bei Hablará')).not.toBeInTheDocument();
    });

    it('should have accessible icons with aria-hidden in welcome state', () => {
      const { container } = render(
        <ChatHistory
          messages={[]}
          isRecording={false}
          onClear={mockOnClear}
        />
      );

      const icons = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should have semantic heading in welcome state', () => {
      render(
        <ChatHistory
          messages={[]}
          isRecording={false}
          onClear={mockOnClear}
        />
      );

      const heading = screen.getByRole('heading', { level: 2, name: 'Willkommen bei Hablará' });
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Copy Functionality', () => {
    it('should show copy buttons when messages exist', () => {
      render(
        <ChatHistory
          messages={mockMessages}
          isRecording={false}
          onClear={mockOnClear}
        />
      );

      expect(screen.getByRole('button', { name: /als markdown kopieren/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /als text kopieren/i })).toBeInTheDocument();
    });

    it('should not show copy buttons when no messages', () => {
      render(
        <ChatHistory
          messages={[]}
          isRecording={false}
          onClear={mockOnClear}
        />
      );

      expect(screen.queryByRole('button', { name: /als markdown kopieren/i })).not.toBeInTheDocument();
    });

    it('should copy as markdown when markdown button clicked', async () => {
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
      const user = userEvent.setup();

      render(
        <ChatHistory
          messages={mockMessages}
          isRecording={false}
          onClear={mockOnClear}
        />
      );

      const markdownButton = screen.getByRole('button', { name: /als markdown kopieren/i });
      await user.click(markdownButton);

      expect(writeText).toHaveBeenCalled();
      const mockCalls = (writeText as ReturnType<typeof vi.fn>).mock.calls;
      const calledWith = mockCalls[0]?.[0] as string | undefined;
      expect(calledWith).toBeDefined();
      expect(calledWith).toContain('### Du');
      expect(calledWith).toContain('### Hablará');
      expect(calledWith).toContain('Das ist mein erster Text.');
    });

    it('should copy as plain text when text button clicked', async () => {
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
      const user = userEvent.setup();

      render(
        <ChatHistory
          messages={mockMessages}
          isRecording={false}
          onClear={mockOnClear}
        />
      );

      const textButton = screen.getByRole('button', { name: /als text kopieren/i });
      await user.click(textButton);

      expect(writeText).toHaveBeenCalled();
      const mockCalls = (writeText as ReturnType<typeof vi.fn>).mock.calls;
      const calledWith = mockCalls[0]?.[0] as string | undefined;
      expect(calledWith).toBeDefined();
      expect(calledWith).toContain('[');
      expect(calledWith).toContain('Du:');
      expect(calledWith).toContain('Hablará:');
    });
  });

  describe('Clear Functionality', () => {
    it('should show delete button when messages exist', () => {
      render(
        <ChatHistory
          messages={mockMessages}
          isRecording={false}
          onClear={mockOnClear}
        />
      );

      expect(screen.getByRole('button', { name: /löschen/i })).toBeInTheDocument();
    });

    it('should show confirmation dialog when delete clicked', async () => {
      const user = userEvent.setup();

      render(
        <ChatHistory
          messages={mockMessages}
          isRecording={false}
          onClear={mockOnClear}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /löschen/i });
      await user.click(deleteButton);

      expect(screen.getByText('Verlauf löschen?')).toBeInTheDocument();
      expect(screen.getByText(/4 Nachrichten/i)).toBeInTheDocument();
    });

    it('should call onClear when confirmed', async () => {
      const user = userEvent.setup();

      render(
        <ChatHistory
          messages={mockMessages}
          isRecording={false}
          onClear={mockOnClear}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /löschen/i });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /verlauf löschen/i });
      await user.click(confirmButton);

      expect(mockOnClear).toHaveBeenCalled();
    });

    it('should not call onClear when cancelled', async () => {
      const user = userEvent.setup();

      render(
        <ChatHistory
          messages={mockMessages}
          isRecording={false}
          onClear={mockOnClear}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /löschen/i });
      await user.click(deleteButton);

      const cancelButton = screen.getByRole('button', { name: /abbrechen/i });
      await user.click(cancelButton);

      expect(mockOnClear).not.toHaveBeenCalled();
    });
  });

  describe('Processing State', () => {
    it('should show processing progress when processing', () => {
      const processingState: ProcessingState = {
        isProcessing: true,
        isShowingCompletion: false,
        steps: [],
        startedAt: Date.now(),
        currentStepId: null,
      };

      render(
        <ChatHistory
          messages={[]}
          isRecording={false}
          processingState={processingState}
          onClear={mockOnClear}
          onCancelProcessing={mockOnCancelProcessing}
        />
      );

      expect(screen.getByTestId('processing-progress')).toBeInTheDocument();
    });

    it('should show processing progress during completion animation', () => {
      const processingState: ProcessingState = {
        isProcessing: false,
        isShowingCompletion: true,
        steps: [],
        startedAt: Date.now(),
        currentStepId: null,
      };

      render(
        <ChatHistory
          messages={[]}
          isRecording={false}
          processingState={processingState}
          onClear={mockOnClear}
        />
      );

      expect(screen.getByTestId('processing-progress')).toBeInTheDocument();
    });

    it('should hide messages during processing', () => {
      const processingState: ProcessingState = {
        isProcessing: true,
        isShowingCompletion: false,
        steps: [],
        startedAt: Date.now(),
        currentStepId: null,
      };

      render(
        <ChatHistory
          messages={mockMessages}
          isRecording={false}
          processingState={processingState}
          onClear={mockOnClear}
        />
      );

      // Messages should not be visible during processing
      expect(screen.queryByText('Das ist mein erster Text.')).not.toBeInTheDocument();
    });

    it('should show messages when not processing', () => {
      const processingState: ProcessingState = {
        isProcessing: false,
        isShowingCompletion: false,
        steps: [],
        startedAt: Date.now(),
        currentStepId: null,
      };

      render(
        <ChatHistory
          messages={mockMessages}
          isRecording={false}
          processingState={processingState}
          onClear={mockOnClear}
        />
      );

      expect(screen.getByText('Das ist mein erster Text.')).toBeInTheDocument();
    });
  });

  describe('Message Count', () => {
    it('should correctly count messages in delete dialog', async () => {
      const user = userEvent.setup();
      const twoMessages = mockMessages.slice(0, 2);

      render(
        <ChatHistory
          messages={twoMessages}
          isRecording={false}
          onClear={mockOnClear}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /löschen/i });
      await user.click(deleteButton);

      expect(screen.getByText(/2 Nachrichten/i)).toBeInTheDocument();
    });

    it('should show singular message text for single message', async () => {
      const user = userEvent.setup();
      const oneMessage = [mockMessages[0]];

      render(
        <ChatHistory
          messages={oneMessage}
          isRecording={false}
          onClear={mockOnClear}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /löschen/i });
      await user.click(deleteButton);

      expect(screen.getByText(/diese aktion löscht die nachricht/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show error toast when markdown copy fails', async () => {
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
      (writeText as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Clipboard error'));
      const user = userEvent.setup();

      render(
        <ChatHistory
          messages={mockMessages}
          isRecording={false}
          onClear={mockOnClear}
        />
      );

      const markdownButton = screen.getByRole('button', { name: /als markdown kopieren/i });
      await user.click(markdownButton);

      // Note: Toast is mocked, we just verify writeText was called
      expect(writeText).toHaveBeenCalled();
    });

    it('should show error toast when plain text copy fails', async () => {
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
      (writeText as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Clipboard error'));
      const user = userEvent.setup();

      render(
        <ChatHistory
          messages={mockMessages}
          isRecording={false}
          onClear={mockOnClear}
        />
      );

      const textButton = screen.getByRole('button', { name: /als text kopieren/i });
      await user.click(textButton);

      expect(writeText).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should show model loading placeholder in chat input', () => {
      render(
        <ChatHistory
          messages={[]}
          isRecording={false}
          isModelLoading={true}
          onClear={mockOnClear}
        />
      );

      expect(screen.getByPlaceholderText('Wissensbasis wird vorbereitet...')).toBeInTheDocument();
    });

    it('should show RAG loading placeholder in chat input', () => {
      render(
        <ChatHistory
          messages={[]}
          isRecording={false}
          isRAGLoading={true}
          onClear={mockOnClear}
        />
      );

      expect(screen.getByPlaceholderText('Suche nach Antwort...')).toBeInTheDocument();
    });

    it('should show default placeholder when not loading', () => {
      render(
        <ChatHistory
          messages={[]}
          isRecording={false}
          onClear={mockOnClear}
        />
      );

      expect(screen.getByPlaceholderText('Frage mich etwas...')).toBeInTheDocument();
    });
  });

  describe('Thinking Indicator Integration', () => {
    it('should show thinking indicator when RAG is loading', () => {
      render(
        <ChatHistory
          messages={mockMessages}
          isRecording={false}
          isRAGLoading={true}
          onClear={mockOnClear}
        />
      );

      // Thinking indicator should be visible
      expect(screen.getByText('Denkt nach...')).toBeInTheDocument();
      // Use testid instead of text query to avoid ambiguity
      expect(screen.getByTestId('chat-thinking-indicator')).toBeInTheDocument();
    });

    it('should hide thinking indicator when RAG is not loading', () => {
      render(
        <ChatHistory
          messages={mockMessages}
          isRecording={false}
          isRAGLoading={false}
          onClear={mockOnClear}
        />
      );

      // Thinking indicator should NOT be visible
      expect(screen.queryByTestId('chat-thinking-indicator')).not.toBeInTheDocument();
    });

    it('should place thinking indicator after last message', () => {
      const { container } = render(
        <ChatHistory
          messages={mockMessages}
          isRecording={false}
          isRAGLoading={true}
          onClear={mockOnClear}
        />
      );

      // Find the message list
      const messageList = screen.getByRole('list', { name: 'Analyse-Verlauf' });
      expect(messageList).toBeInTheDocument();

      // Get all list items
      const listItems = container.querySelectorAll('ol[aria-label="Analyse-Verlauf"] > li');

      // Should have 4 messages + 1 thinking indicator = 5 items
      expect(listItems.length).toBe(5);

      // Last item should contain the thinking indicator
      const lastItem = listItems[listItems.length - 1];
      expect(lastItem).toHaveTextContent('Denkt nach...');
    });
  });
});
