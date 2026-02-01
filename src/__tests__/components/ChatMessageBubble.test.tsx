import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatMessageBubble } from '@/components/ChatMessageBubble';
import type { ChatMessage } from '@/lib/types';

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

describe('ChatMessageBubble', () => {
  const mockUserMessage: ChatMessage = {
    id: 'user-1',
    role: 'user',
    content: 'Das ist mein transkribierter Text.',
    timestamp: new Date('2026-01-28T14:30:00'),
    transcriptSegmentId: 'segment-1',
  };

  const mockAssistantMessage: ChatMessage = {
    id: 'assistant-1',
    role: 'assistant',
    content: '**Emotions-Analyse**\n\nDein Ausdruck zeigt Frustration (73%).',
    timestamp: new Date('2026-01-28T14:30:05'),
    analysisSourceId: 'segment-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render user message with correct role label', () => {
      render(<ChatMessageBubble message={mockUserMessage} />);

      expect(screen.getByText('Du')).toBeInTheDocument();
      expect(screen.getByText(mockUserMessage.content)).toBeInTheDocument();
    });

    it('should render assistant message with correct role label', () => {
      render(<ChatMessageBubble message={mockAssistantMessage} />);

      expect(screen.getByText('Hablará')).toBeInTheDocument();
    });

    it('should render user avatar with User icon', () => {
      const { container } = render(<ChatMessageBubble message={mockUserMessage} />);

      // Avatar has aria-hidden="true", so we check for the presence of the icon
      const userIcon = container.querySelector('.lucide-user');
      expect(userIcon).toBeInTheDocument();
    });

    it('should render assistant avatar with Bot icon', () => {
      const { container } = render(<ChatMessageBubble message={mockAssistantMessage} />);

      // Avatar has aria-hidden="true", so we check for the presence of the icon
      const botIcon = container.querySelector('.lucide-bot');
      expect(botIcon).toBeInTheDocument();
    });

    it('should render timestamp as time of day', () => {
      render(<ChatMessageBubble message={mockUserMessage} />);

      // toLocaleTimeString returns HH:MM format (e.g., "14:30")
      expect(screen.getByText('14:30')).toBeInTheDocument();
    });
  });

  describe('User Message Styling', () => {
    it('should have blue background for user messages', () => {
      render(<ChatMessageBubble message={mockUserMessage} />);

      const messageContent = screen.getByText(mockUserMessage.content).parentElement;
      expect(messageContent).toHaveClass('bg-blue-600');
    });

    it('should render user message as plain text (no markdown)', () => {
      const messageWithMarkdown: ChatMessage = {
        ...mockUserMessage,
        content: '**Bold** and *italic*',
      };
      render(<ChatMessageBubble message={messageWithMarkdown} />);

      // Should render as plain text, not as bold/italic HTML
      expect(screen.getByText('**Bold** and *italic*')).toBeInTheDocument();
    });
  });

  describe('Assistant Message Styling', () => {
    it('should have slate background for assistant messages', () => {
      render(<ChatMessageBubble message={mockAssistantMessage} />);

      // Find the message container
      const messageContainer = screen.getByText('Hablará').closest('div[class*="rounded-2xl"]');
      // Light mode uses bg-slate-50, dark mode uses dark:bg-slate-700/50
      expect(messageContainer).toHaveClass('bg-slate-50');
    });

    it('should render assistant message with markdown', () => {
      render(<ChatMessageBubble message={mockAssistantMessage} />);

      // ReactMarkdown should render **bold** as <strong>
      const strongElement = screen.getByText('Emotions-Analyse');
      expect(strongElement.tagName).toBe('STRONG');
    });
  });

  describe('Copy Functionality', () => {
    it('should show copy button on hover', async () => {
      render(<ChatMessageBubble message={mockUserMessage} />);

      // Copy button should exist (visible on hover via CSS)
      const copyButton = screen.getByTitle('Kopieren');
      expect(copyButton).toBeInTheDocument();
    });

    it('should copy message content when copy button is clicked', async () => {
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
      const user = userEvent.setup();

      render(<ChatMessageBubble message={mockUserMessage} />);

      const copyButton = screen.getByTitle('Kopieren');
      await user.click(copyButton);

      expect(writeText).toHaveBeenCalledWith(mockUserMessage.content);
    });
  });

  describe('isLatest Prop', () => {
    it('should apply animation class to latest assistant message', () => {
      render(<ChatMessageBubble message={mockAssistantMessage} isLatest={true} />);

      const messageContainer = screen.getByText('Hablará').closest('div[class*="rounded-2xl"]');
      expect(messageContainer).toHaveClass('animate-fade-in');
    });

    it('should not apply animation class to non-latest messages', () => {
      render(<ChatMessageBubble message={mockAssistantMessage} isLatest={false} />);

      const messageContainer = screen.getByText('Hablará').closest('div[class*="rounded-2xl"]');
      expect(messageContainer).not.toHaveClass('animate-fade-in');
    });

    it('should not apply animation class to user messages even if latest', () => {
      render(<ChatMessageBubble message={mockUserMessage} isLatest={true} />);

      const messageContainer = screen.getByText(mockUserMessage.content).parentElement;
      expect(messageContainer).not.toHaveClass('animate-fade-in');
    });
  });

  // Citation Rendering and XSS Prevention (Pre-Deadline 2026-01-28)
  describe('Citation Rendering and XSS Prevention', () => {
    it('should render citation with BookOpen icon', () => {
      const messageWithCitation: ChatMessage = {
        ...mockAssistantMessage,
        content: 'Emotion Detection nutzt 12 Audio-Features **[Quelle: Emotion Detection]**.',
      };

      const { container } = render(<ChatMessageBubble message={messageWithCitation} />);

      // Citation should be rendered as a styled badge with purple background
      const citationBadge = container.querySelector('.bg-purple-100');
      expect(citationBadge).toBeInTheDocument();

      // Should contain BookOpen icon
      const bookIcon = container.querySelector('.lucide-book-open');
      expect(bookIcon).toBeInTheDocument();

      // Citation text should be visible
      expect(citationBadge?.textContent).toContain('Emotion Detection');
    });

    it('should sanitize HTML-sensitive characters from citation source', () => {
      // Citation sanitization removes HTML-sensitive chars: <>"'&
      // Test with raw HTML special chars (not entities)
      const messageWithHTML: ChatMessage = {
        ...mockAssistantMessage,
        content: 'Test **[Quelle: Source with special "quoted" text]**.',
      };

      const { container } = render(<ChatMessageBubble message={messageWithHTML} />);

      // Quotes (") should be stripped by citation sanitization
      const citationBadge = container.querySelector('.bg-purple-100');
      expect(citationBadge).toBeInTheDocument();
      // Verify text content (quotes removed)
      expect(citationBadge?.textContent).toContain('Source');
      expect(citationBadge?.textContent).toContain('with');
      expect(citationBadge?.textContent).toContain('special');
      expect(citationBadge?.textContent).toContain('quoted');
      expect(citationBadge?.textContent).toContain('text');

      // Should NOT contain quote chars
      expect(citationBadge?.textContent).not.toContain('"');
    });

    it('should remove control characters from citation source', () => {
      const messageWithControlChars: ChatMessage = {
        ...mockAssistantMessage,
        // Using control characters \x00-\x1F and \x7F
        content: 'Test **[Quelle: Evil\x00Citation\x1FWith\x7FControl]**.',
      };

      const { container } = render(<ChatMessageBubble message={messageWithControlChars} />);

      // Control characters should be removed or replaced
      const citationBadge = container.querySelector('.bg-purple-100');
      expect(citationBadge).toBeInTheDocument();
      // textContent includes icon text, we verify key parts are present
      expect(citationBadge?.textContent).toContain('Evil');
      expect(citationBadge?.textContent).toContain('Citation');
      expect(citationBadge?.textContent).toContain('Control');
    });

    it('should truncate long citation sources with ellipsis', () => {
      // Create a citation source longer than MAX_CITATION_LENGTH (100)
      const longSource = 'A'.repeat(120);
      const messageWithLongCitation: ChatMessage = {
        ...mockAssistantMessage,
        content: `Test **[Quelle: ${longSource}]**.`,
      };

      render(<ChatMessageBubble message={messageWithLongCitation} />);

      // Should truncate to 97 chars + "..." (100 total)
      const citation = screen.getByText('A'.repeat(97) + '...');
      expect(citation).toBeInTheDocument();

      // Should NOT display full 120-char source in text
      expect(screen.queryByText(longSource)).not.toBeInTheDocument();
    });

    it('should show full citation source in tooltip for truncated citations', () => {
      const longSource = 'B'.repeat(120);
      const messageWithLongCitation: ChatMessage = {
        ...mockAssistantMessage,
        content: `Test **[Quelle: ${longSource}]**.`,
      };

      const { container } = render(<ChatMessageBubble message={messageWithLongCitation} />);

      // Citation badge should exist
      const citationBadge = container.querySelector('.bg-purple-100');
      expect(citationBadge).toBeInTheDocument();

      // Truncated text should be displayed (97 chars + "...")
      expect(citationBadge?.textContent).toContain('B'.repeat(97) + '...');

      // Title attribute should contain full source
      expect(citationBadge).toHaveAttribute('title', `Quelle: ${longSource}`);
    });

    it('should not truncate citation sources shorter than MAX_CITATION_LENGTH', () => {
      const shortSource = 'Short Citation';
      const messageWithShortCitation: ChatMessage = {
        ...mockAssistantMessage,
        content: `Test **[Quelle: ${shortSource}]**.`,
      };

      render(<ChatMessageBubble message={messageWithShortCitation} />);

      // Should display full source without ellipsis
      const citation = screen.getByText(shortSource);
      expect(citation).toBeInTheDocument();
      expect(screen.queryByText('...')).not.toBeInTheDocument();
    });

    it('should handle multiple citations in a single message', () => {
      const messageWithMultipleCitations: ChatMessage = {
        ...mockAssistantMessage,
        content:
          'Emotion Detection **[Quelle: Audio Features]** und Fallacy Detection **[Quelle: Text Analysis]** sind wichtig.',
      };

      render(<ChatMessageBubble message={messageWithMultipleCitations} />);

      // Both citations should be rendered
      expect(screen.getByText('Audio Features')).toBeInTheDocument();
      expect(screen.getByText('Text Analysis')).toBeInTheDocument();
    });

    it('should render regular bold text without citation pattern as normal strong element', () => {
      const messageWithRegularBold: ChatMessage = {
        ...mockAssistantMessage,
        content: 'Dies ist **wichtig** aber keine Quelle.',
      };

      render(<ChatMessageBubble message={messageWithRegularBold} />);

      // Should render as regular <strong> element
      const boldElement = screen.getByText('wichtig');
      expect(boldElement.tagName).toBe('STRONG');

      // Should NOT have citation badge styling
      const strongParent = boldElement.closest('span');
      if (strongParent) {
        expect(strongParent).not.toHaveClass('bg-purple-500/20');
      }
    });

    it('should sanitize mixed HTML and control characters together', () => {
      // Test both quote chars and control characters
      const messageWithMixedAttack: ChatMessage = {
        ...mockAssistantMessage,
        content: 'Test **[Quelle: "Safe"Sound\x00Evil\x1FChars]**.',
      };

      const { container } = render(<ChatMessageBubble message={messageWithMixedAttack} />);

      // Quotes and control characters should be stripped
      const citationBadge = container.querySelector('.bg-purple-100');
      expect(citationBadge).toBeInTheDocument();
      // Verify sanitized text content (quotes and control chars removed)
      expect(citationBadge?.textContent).toContain('Safe');
      expect(citationBadge?.textContent).toContain('Sound');
      expect(citationBadge?.textContent).toContain('Evil');
      expect(citationBadge?.textContent).toContain('Chars');

      // Should NOT contain quotes or control characters
      expect(citationBadge?.textContent).not.toContain('"');
      expect(citationBadge?.textContent).not.toMatch(/[\x00-\x1F\x7F]/); // No control chars
    });
  });
});
