import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessageBubble } from '@/components/ChatMessageBubble';
import type { ChatMessage } from '@/lib/types';

// Mock Tauri clipboard
vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
  writeText: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('ChatMessageBubble - Processing Duration Badge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('zeigt Badge für assistant message mit duration > 0', () => {
    const message: ChatMessage = {
      id: '1',
      role: 'assistant',
      content: 'Test',
      timestamp: new Date(),
      processingDurationMs: 4200,
    };

    render(<ChatMessageBubble message={message} />);
    expect(screen.getByText('4.2s')).toBeInTheDocument();
  });

  it('zeigt KEIN Badge für user messages', () => {
    const message: ChatMessage = {
      id: '1',
      role: 'user',
      content: 'Test',
      timestamp: new Date(),
      processingDurationMs: 4200,
    };

    render(<ChatMessageBubble message={message} />);
    expect(screen.queryByText('4.2s')).not.toBeInTheDocument();
  });

  it('zeigt KEIN Badge wenn duration fehlt', () => {
    const message: ChatMessage = {
      id: '1',
      role: 'assistant',
      content: 'Test',
      timestamp: new Date(),
    };

    render(<ChatMessageBubble message={message} />);
    expect(screen.queryByText(/s$/)).not.toBeInTheDocument();
  });

  it('zeigt KEIN Badge wenn duration = 0', () => {
    const message: ChatMessage = {
      id: '1',
      role: 'assistant',
      content: 'Test',
      timestamp: new Date(),
      processingDurationMs: 0,
    };

    render(<ChatMessageBubble message={message} />);
    expect(screen.queryByText(/s$/)).not.toBeInTheDocument();
  });

  it('formatiert Duration < 1000ms als Millisekunden', () => {
    const message: ChatMessage = {
      id: '1',
      role: 'assistant',
      content: 'Test',
      timestamp: new Date(),
      processingDurationMs: 850,
    };

    render(<ChatMessageBubble message={message} />);
    expect(screen.getByText('850ms')).toBeInTheDocument();
  });

  it('zeigt Clock Icon für assistant message mit duration', () => {
    const message: ChatMessage = {
      id: '1',
      role: 'assistant',
      content: 'Test',
      timestamp: new Date(),
      processingDurationMs: 4200,
    };

    const { container } = render(<ChatMessageBubble message={message} />);

    // Clock icon sollte vorhanden sein (Lucide rendered als SVG)
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
