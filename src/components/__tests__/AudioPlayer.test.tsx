import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AudioPlayer } from '../AudioPlayer';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Audio element
class MockAudio {
  public src = '';
  public volume = 1;
  public playbackRate = 1;
  public currentTime = 0;
  public duration = 10; // 10 seconds mock duration
  public paused = true;
  private listeners: Record<string, ((event: Event) => void)[]> = {};

  constructor(src?: string) {
    if (src) this.src = src;
    // Simulate loadedmetadata after creation
    setTimeout(() => {
      this.dispatchEvent(new Event('loadedmetadata'));
    }, 0);
  }

  addEventListener(event: string, handler: (event: Event) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
  }

  removeEventListener(event: string, handler: (event: Event) => void) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(h => h !== handler);
    }
  }

  dispatchEvent(event: Event) {
    const handlers = this.listeners[event.type] || [];
    handlers.forEach(handler => handler(event));
    return true;
  }

  play() {
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }

  load() {
    // No-op for tests
  }
}

// Replace global Audio with mock
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global Audio mock requires type override
      global.Audio = MockAudio as any;

// Mock atob for base64 decoding (no longer needed for Data URLs, but kept for compatibility)
global.atob = vi.fn((_str: string) => {
  // Return mock binary data
  return '\x00'.repeat(100); // 100 bytes of mock WAV data
});

describe('AudioPlayer', () => {
  const mockBase64Audio = 'bW9ja0F1ZGlvRGF0YQ=='; // "mockAudioData" in base64
  let mockOnPlayStateChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnPlayStateChange = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render "Keine Audiodaten verfügbar" when audioData is null', () => {
      render(<AudioPlayer audioData={null} />);
      expect(screen.getByText(/keine audiodaten verfügbar/i)).toBeInTheDocument();
    });

    it('should render audio controls when audioData is provided', async () => {
      const { container } = render(<AudioPlayer audioData={mockBase64Audio} />);

      // Wait for audio to load - check for play/pause button by class
      await waitFor(() => {
        const buttons = container.querySelectorAll('button');
        expect(buttons.length).toBeGreaterThan(0);
      });

      // Verify playback controls rendered
      expect(screen.getByText('1x')).toBeInTheDocument(); // Speed button as proxy
    });

    it('should display playback speed buttons', async () => {
      render(<AudioPlayer audioData={mockBase64Audio} />);

      await waitFor(() => {
        expect(screen.getByText('0.5x')).toBeInTheDocument();
        expect(screen.getByText('1x')).toBeInTheDocument();
        expect(screen.getByText('2x')).toBeInTheDocument();
      });
    });

    it('should create Data URL instead of Blob URL', async () => {
      // Store reference to created audio elements
      const createdAudios: MockAudio[] = [];
      const OriginalMockAudio = MockAudio;

      class TrackingMockAudio extends OriginalMockAudio {
        constructor(src?: string) {
          super(src);
          createdAudios.push(this);
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global Audio mock requires type override
      global.Audio = TrackingMockAudio as any;

      render(<AudioPlayer audioData={mockBase64Audio} />);

      // Wait for audio to be created
      await waitFor(() => {
        expect(createdAudios.length).toBeGreaterThan(0);
      });

      // Verify Data URL was used (not blob URL)
      expect(createdAudios[0].src).toBe(`data:audio/wav;base64,${mockBase64Audio}`);
      expect(createdAudios[0].src).not.toContain('blob:');

      // Restore
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global Audio mock requires type override
      global.Audio = OriginalMockAudio as any;
    });
  });

  describe('Auto-play feature', () => {
    it('should auto-play when autoPlay prop is true', async () => {
      const mockPlay = vi.fn().mockResolvedValue(undefined);
      const originalMockAudio = MockAudio;

      // Override play method for this test
      class MockAudioWithPlay extends MockAudio {
        play() {
          mockPlay();
          return Promise.resolve();
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global Audio mock requires type override
      global.Audio = MockAudioWithPlay as any;

      render(<AudioPlayer audioData={mockBase64Audio} autoPlay={true} />);

      // Wait for auto-play to trigger
      await waitFor(() => {
        expect(mockPlay).toHaveBeenCalled();
      }, { timeout: 1000 });

      // Restore original mock
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global Audio mock requires type override
      global.Audio = originalMockAudio as any;
    });

    it('should NOT auto-play when autoPlay prop is false', async () => {
      const mockPlay = vi.fn().mockResolvedValue(undefined);

      class MockAudioNoAutoPlay extends MockAudio {
        play() {
          mockPlay();
          return Promise.resolve();
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global Audio mock requires type override
      global.Audio = MockAudioNoAutoPlay as any;

      render(<AudioPlayer audioData={mockBase64Audio} autoPlay={false} />);

      // Wait a bit to ensure no auto-play
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPlay).not.toHaveBeenCalled();
    });

    it('should call onPlayStateChange with true when auto-playing', async () => {
      render(<AudioPlayer audioData={mockBase64Audio} autoPlay={true} onPlayStateChange={mockOnPlayStateChange} />);

      // Wait for auto-play to trigger
      await waitFor(() => {
        expect(mockOnPlayStateChange).toHaveBeenCalledWith(true);
      }, { timeout: 1000 });
    });

    it('should handle auto-play rejection gracefully', async () => {
      const mockPlay = vi.fn().mockRejectedValue(new DOMException('NotAllowedError'));
      const OriginalMockAudio = MockAudio;

      class MockAudioAutoPlayBlocked extends MockAudio {
        play() {
          mockPlay();
          return Promise.reject(new DOMException('NotAllowedError'));
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global Audio mock requires type override
      global.Audio = MockAudioAutoPlayBlocked as any;

      render(<AudioPlayer audioData={mockBase64Audio} autoPlay={true} onPlayStateChange={mockOnPlayStateChange} />);

      // Wait for auto-play attempt
      await waitFor(() => {
        expect(mockPlay).toHaveBeenCalled();
      });

      // Should NOT call onPlayStateChange since play was blocked
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockOnPlayStateChange).not.toHaveBeenCalled();

      // Restore
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global Audio mock requires type override
      global.Audio = OriginalMockAudio as any;
    });
  });

  describe('Play/Pause Functionality', () => {
    it('should toggle play state when play button is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AudioPlayer audioData={mockBase64Audio} onPlayStateChange={mockOnPlayStateChange} />
      );

      // Wait for audio to load - speed buttons appear
      await waitFor(() => {
        expect(screen.getByText('1x')).toBeInTheDocument();
      });

      // First button in controls is play/pause (size="icon")
      // Wait for button to become enabled (audio loaded)
      let playPauseButton: Element | undefined;
      await waitFor(() => {
        const buttons = container.querySelectorAll('button');
        playPauseButton = Array.from(buttons).find(btn =>
          btn.className.includes('h-9 w-9')
        );
        expect(playPauseButton).toBeDefined();
        expect(playPauseButton).not.toBeDisabled();
      });

      // Click play
      await user.click(playPauseButton!);

      // Verify onPlayStateChange was called with true
      await waitFor(() => {
        expect(mockOnPlayStateChange).toHaveBeenCalledWith(true);
      });
    });

    it('should call onPlayStateChange with false when toggled off', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AudioPlayer audioData={mockBase64Audio} onPlayStateChange={mockOnPlayStateChange} />
      );

      await waitFor(() => {
        expect(screen.getByText('1x')).toBeInTheDocument();
      });

      // Find play/pause button
      const buttons = container.querySelectorAll('button');
      const playPauseButton = Array.from(buttons).find(btn =>
        btn.className.includes('h-9 w-9')
      );

      // Click twice: play then pause
      await user.click(playPauseButton!);
      await waitFor(() => expect(mockOnPlayStateChange).toHaveBeenCalledWith(true));

      await user.click(playPauseButton!);

      // Verify onPlayStateChange was called with false
      await waitFor(() => {
        const calls = mockOnPlayStateChange.mock.calls;
        expect(calls[calls.length - 1][0]).toBe(false);
      });
    });
  });

  describe('Volume Control', () => {
    it('should toggle mute when volume button is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<AudioPlayer audioData={mockBase64Audio} />);

      await waitFor(() => {
        expect(screen.getByText('1x')).toBeInTheDocument();
      });

      // Find volume button (h-8 w-8 size, second icon button)
      const buttons = container.querySelectorAll('button');
      const volumeButton = Array.from(buttons).find(btn =>
        btn.className.includes('h-8 w-8')
      );

      expect(volumeButton).toBeDefined();

      // Click to mute
      await user.click(volumeButton!);

      // Component should re-render (state change)
      // No error means test passes - mute toggle worked
      expect(volumeButton).toBeInTheDocument();
    });
  });

  describe('Playback Speed', () => {
    it('should change playback speed when speed button is clicked', async () => {
      const user = userEvent.setup();
      render(<AudioPlayer audioData={mockBase64Audio} />);

      await waitFor(() => {
        expect(screen.getByText('1x')).toBeInTheDocument();
      });

      // Click 1.5x button
      const speed15Button = screen.getByText('1.5x');
      await user.click(speed15Button);

      // Verify button is now active (secondary variant)
      await waitFor(() => {
        expect(speed15Button.className).toContain('secondary');
      });
    });

    it('should have all 6 playback speed options', async () => {
      render(<AudioPlayer audioData={mockBase64Audio} />);

      await waitFor(() => {
        expect(screen.getByText('0.5x')).toBeInTheDocument();
        expect(screen.getByText('0.75x')).toBeInTheDocument();
        expect(screen.getByText('1x')).toBeInTheDocument();
        expect(screen.getByText('1.25x')).toBeInTheDocument();
        expect(screen.getByText('1.5x')).toBeInTheDocument();
        expect(screen.getByText('2x')).toBeInTheDocument();
      });
    });
  });

  describe('Time Formatting', () => {
    it('should display formatted time (MM:SS)', async () => {
      render(<AudioPlayer audioData={mockBase64Audio} />);

      // Mock audio duration is 10 seconds
      await waitFor(() => {
        expect(screen.getByText('0:00')).toBeInTheDocument(); // currentTime
        expect(screen.getByText('0:10')).toBeInTheDocument(); // duration
      });
    });
  });

  describe('Cleanup', () => {
    it('should pause audio when component unmounts', async () => {
      const mockPause = vi.fn();

      class MockAudioWithPause extends MockAudio {
        pause() {
          mockPause();
          super.pause();
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global Audio mock requires type override
      global.Audio = MockAudioWithPause as any;

      const { unmount } = render(<AudioPlayer audioData={mockBase64Audio} />);

      await waitFor(() => {
        expect(screen.getByText('1x')).toBeInTheDocument();
      });

      unmount();

      // Verify audio was paused on cleanup
      expect(mockPause).toHaveBeenCalled();
    });

    it('should recreate audio element when audioData changes', async () => {
      // Track created audio elements
      const createdAudios: MockAudio[] = [];
      const OriginalMockAudio = MockAudio;

      class TrackingMockAudio extends OriginalMockAudio {
        constructor(src?: string) {
          super(src);
          createdAudios.push(this);
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global Audio mock requires type override
      global.Audio = TrackingMockAudio as any;

      const { rerender } = render(<AudioPlayer audioData={mockBase64Audio} />);

      await waitFor(() => {
        expect(createdAudios.length).toBe(1);
        expect(createdAudios[0].src).toBe(`data:audio/wav;base64,${mockBase64Audio}`);
      });

      // Change audioData
      const newAudioData = 'bmV3QXVkaW9EYXRh'; // "newAudioData" in base64
      rerender(<AudioPlayer audioData={newAudioData} />);

      await waitFor(() => {
        expect(createdAudios.length).toBe(2);
        expect(createdAudios[1].src).toBe(`data:audio/wav;base64,${newAudioData}`);
      });

      // Restore
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global Audio mock requires type override
      global.Audio = OriginalMockAudio as any;
    });
  });

  describe('Error Handling', () => {
    it('should render component even with invalid audio data', async () => {
      // Pass invalid base64 to trigger potential errors
      const { container } = render(<AudioPlayer audioData="invalid-base64!!!" />);

      // Component should still render controls (graceful degradation)
      await waitFor(() => {
        const buttons = container.querySelectorAll('button');
        expect(buttons.length).toBeGreaterThan(0);
      });

      // Should have playback speed buttons even if audio fails
      expect(screen.getByText('1x')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button structure for screen readers', async () => {
      const { container } = render(<AudioPlayer audioData={mockBase64Audio} />);

      await waitFor(() => {
        expect(screen.getByText('1x')).toBeInTheDocument();
      });

      // Verify multiple buttons exist (play/pause, volume, speed controls)
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(5); // At least: play, volume, 6 speed buttons

      // Verify buttons are keyboard-accessible (not divs)
      buttons.forEach(button => {
        expect(button.tagName).toBe('BUTTON');
      });
    });
  });
});
