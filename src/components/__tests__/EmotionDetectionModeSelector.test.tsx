import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmotionDetectionModeSelector } from '@/components/settings/EmotionDetectionModeSelector';
import { DEFAULT_SETTINGS } from '@/lib/types';
import type { AppSettings } from '@/lib/types';

describe('EmotionDetectionModeSelector', () => {
  const mockOnSettingsChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render 3 mode buttons', () => {
      render(
        <EmotionDetectionModeSelector
          settings={DEFAULT_SETTINGS}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
    });

    it('should render "Ausgewogen" button', () => {
      render(
        <EmotionDetectionModeSelector
          settings={DEFAULT_SETTINGS}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      expect(screen.getByText('Ausgewogen')).toBeInTheDocument();
    });

    it('should render "Stimmbetonung" button', () => {
      render(
        <EmotionDetectionModeSelector
          settings={DEFAULT_SETTINGS}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      expect(screen.getByText('Stimmbetonung')).toBeInTheDocument();
    });

    it('should render "Inhaltsfokus" button', () => {
      render(
        <EmotionDetectionModeSelector
          settings={DEFAULT_SETTINGS}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      expect(screen.getByText('Inhaltsfokus')).toBeInTheDocument();
    });

    it('should display section label "Erkennungsmodus"', () => {
      render(
        <EmotionDetectionModeSelector
          settings={DEFAULT_SETTINGS}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      expect(screen.getByText('Erkennungsmodus')).toBeInTheDocument();
    });

    it('should display helper text about affected features', () => {
      render(
        <EmotionDetectionModeSelector
          settings={DEFAULT_SETTINGS}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      expect(
        screen.getByText(/betrifft: emotionsanalyse, ton-analyse/i)
      ).toBeInTheDocument();
    });
  });

  describe('Default State', () => {
    it('should have "balanced" mode selected by default', () => {
      render(
        <EmotionDetectionModeSelector
          settings={DEFAULT_SETTINGS}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const ausgewogenButton = screen.getByText('Ausgewogen').closest('button');
      expect(ausgewogenButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should NOT have other modes selected by default', () => {
      render(
        <EmotionDetectionModeSelector
          settings={DEFAULT_SETTINGS}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const voiceFocusButton = screen.getByText('Stimmbetonung').closest('button');
      const contentFocusButton = screen.getByText('Inhaltsfokus').closest('button');

      expect(voiceFocusButton).toHaveAttribute('aria-pressed', 'false');
      expect(contentFocusButton).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Mode Selection', () => {
    it('should call onSettingsChange with voice-focus mode when Stimmbetonung clicked', async () => {
      const user = userEvent.setup();

      render(
        <EmotionDetectionModeSelector
          settings={DEFAULT_SETTINGS}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const voiceFocusButton = screen.getByText('Stimmbetonung').closest('button')!;
      await user.click(voiceFocusButton);

      expect(mockOnSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: expect.objectContaining({
            emotionDetectionMode: 'voice-focus',
          }),
        })
      );
    });

    it('should call onSettingsChange with content-focus mode when Inhaltsfokus clicked', async () => {
      const user = userEvent.setup();

      render(
        <EmotionDetectionModeSelector
          settings={DEFAULT_SETTINGS}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const contentFocusButton = screen.getByText('Inhaltsfokus').closest('button')!;
      await user.click(contentFocusButton);

      expect(mockOnSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: expect.objectContaining({
            emotionDetectionMode: 'content-focus',
          }),
        })
      );
    });

    it('should call onSettingsChange with balanced mode when Ausgewogen clicked', async () => {
      const user = userEvent.setup();
      const settingsWithVoiceFocus: AppSettings = {
        ...DEFAULT_SETTINGS,
        audio: {
          ...DEFAULT_SETTINGS.audio,
          emotionDetectionMode: 'voice-focus',
        },
      };

      render(
        <EmotionDetectionModeSelector
          settings={settingsWithVoiceFocus}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const balancedButton = screen.getByText('Ausgewogen').closest('button')!;
      await user.click(balancedButton);

      expect(mockOnSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: expect.objectContaining({
            emotionDetectionMode: 'balanced',
          }),
        })
      );
    });
  });

  describe('Current Mode Display', () => {
    it('should show voice-focus as active when settings has voice-focus', () => {
      const settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        audio: {
          ...DEFAULT_SETTINGS.audio,
          emotionDetectionMode: 'voice-focus',
        },
      };

      render(
        <EmotionDetectionModeSelector
          settings={settings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const voiceFocusButton = screen.getByText('Stimmbetonung').closest('button');
      expect(voiceFocusButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should show content-focus as active when settings has content-focus', () => {
      const settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        audio: {
          ...DEFAULT_SETTINGS.audio,
          emotionDetectionMode: 'content-focus',
        },
      };

      render(
        <EmotionDetectionModeSelector
          settings={settings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const contentFocusButton = screen.getByText('Inhaltsfokus').closest('button');
      expect(contentFocusButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should default to balanced when emotionDetectionMode is undefined', () => {
      const settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        audio: {
          ...DEFAULT_SETTINGS.audio,
          emotionDetectionMode: undefined as unknown as 'balanced',
        },
      };

      render(
        <EmotionDetectionModeSelector
          settings={settings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const balancedButton = screen.getByText('Ausgewogen').closest('button');
      expect(balancedButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Mode Descriptions', () => {
    it('should show "(40/60)" description for balanced', () => {
      render(
        <EmotionDetectionModeSelector
          settings={DEFAULT_SETTINGS}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      expect(screen.getByText(/40\/60/)).toBeInTheDocument();
    });

    it('should show "(60/40)" description for voice-focus', () => {
      render(
        <EmotionDetectionModeSelector
          settings={DEFAULT_SETTINGS}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      expect(screen.getByText(/60\/40/)).toBeInTheDocument();
    });

    it('should show "(20/80)" description for content-focus', () => {
      render(
        <EmotionDetectionModeSelector
          settings={DEFAULT_SETTINGS}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      expect(screen.getByText(/20\/80/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button roles', () => {
      render(
        <EmotionDetectionModeSelector
          settings={DEFAULT_SETTINGS}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-pressed');
      });
    });

    it('should have button type="button" to prevent form submission', () => {
      render(
        <EmotionDetectionModeSelector
          settings={DEFAULT_SETTINGS}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });

  describe('Settings Preservation', () => {
    it('should preserve other settings when changing mode', async () => {
      const user = userEvent.setup();
      const customSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        audio: {
          ...DEFAULT_SETTINGS.audio,
          playStartStopSounds: true,
          soundVolume: 0.8,
          emotionDetectionMode: 'balanced',
        },
        features: {
          ...DEFAULT_SETTINGS.features,
          emotionAnalysis: true,
          fallacyDetection: true,
        },
      };

      render(
        <EmotionDetectionModeSelector
          settings={customSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const voiceFocusButton = screen.getByText('Stimmbetonung').closest('button')!;
      await user.click(voiceFocusButton);

      expect(mockOnSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: expect.objectContaining({
            playStartStopSounds: true,
            soundVolume: 0.8,
            emotionDetectionMode: 'voice-focus',
          }),
          features: expect.objectContaining({
            emotionAnalysis: true,
            fallacyDetection: true,
          }),
        })
      );
    });
  });
});
