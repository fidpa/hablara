import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrivacyStatusSection } from '@/components/settings/PrivacyStatusSection';
import { DEFAULT_SETTINGS, DEFAULT_STORAGE_PATH } from '@/lib/types';
import type { AppSettings } from '@/lib/types';

describe('PrivacyStatusSection', () => {
  const mockOnSwitchToLocal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Privacy Badge - Offline Status (Ollama)', () => {
    it('should show green "Vollständig offline" badge for Ollama provider', () => {
      const settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        llm: {
          ...DEFAULT_SETTINGS.llm,
          provider: 'ollama',
          model: 'qwen2.5:7b',
        },
      };

      render(
        <PrivacyStatusSection
          settings={settings}
          onSwitchToLocal={mockOnSwitchToLocal}
        />
      );

      expect(screen.getByText('Vollständig offline')).toBeInTheDocument();
      expect(
        screen.getByText(/alle ihre daten bleiben auf diesem gerät/i)
      ).toBeInTheDocument();
    });

    it('should render ShieldCheck icon for offline status', () => {
      const settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        llm: { ...DEFAULT_SETTINGS.llm, provider: 'ollama' },
      };

      const { container } = render(
        <PrivacyStatusSection
          settings={settings}
          onSwitchToLocal={mockOnSwitchToLocal}
        />
      );

      // ShieldCheck icon should be present (green-600 color class)
      const badge = container.querySelector('.bg-green-50');
      expect(badge).toBeInTheDocument();
    });

    it('should NOT show "Zu Ollama wechseln" button for Ollama provider', () => {
      const settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        llm: { ...DEFAULT_SETTINGS.llm, provider: 'ollama' },
      };

      render(
        <PrivacyStatusSection
          settings={settings}
          onSwitchToLocal={mockOnSwitchToLocal}
        />
      );

      expect(
        screen.queryByRole('button', { name: /zu ollama.*wechseln/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('Privacy Badge - Cloud Status (OpenAI)', () => {
    it('should show amber "Cloud-Analyse aktiv" badge for OpenAI provider', () => {
      const settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        llm: {
          ...DEFAULT_SETTINGS.llm,
          provider: 'openai',
          model: 'gpt-4o-mini',
        },
      };

      render(
        <PrivacyStatusSection
          settings={settings}
          onSwitchToLocal={mockOnSwitchToLocal}
        />
      );

      expect(screen.getByText('Cloud-Analyse aktiv')).toBeInTheDocument();
      expect(
        screen.getByText(/texte werden zur ki-analyse an openai gesendet/i)
      ).toBeInTheDocument();
    });

    it('should render Cloud icon for cloud status', () => {
      const settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        llm: { ...DEFAULT_SETTINGS.llm, provider: 'openai' },
      };

      const { container } = render(
        <PrivacyStatusSection
          settings={settings}
          onSwitchToLocal={mockOnSwitchToLocal}
        />
      );

      // Cloud icon should be present (amber-600 color class)
      const badge = container.querySelector('.bg-amber-50');
      expect(badge).toBeInTheDocument();
    });

    it('should show "Zu Ollama wechseln" button for OpenAI provider', () => {
      const settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        llm: { ...DEFAULT_SETTINGS.llm, provider: 'openai' },
      };

      render(
        <PrivacyStatusSection
          settings={settings}
          onSwitchToLocal={mockOnSwitchToLocal}
        />
      );

      expect(
        screen.getByRole('button', { name: /zu ollama.*wechseln/i })
      ).toBeInTheDocument();
    });

    it('should show cloud warning message for OpenAI', () => {
      const settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        llm: { ...DEFAULT_SETTINGS.llm, provider: 'openai' },
      };

      render(
        <PrivacyStatusSection
          settings={settings}
          onSwitchToLocal={mockOnSwitchToLocal}
        />
      );

      expect(
        screen.getByText(/openai kann diese daten für modellverbesserungen nutzen/i)
      ).toBeInTheDocument();
    });

    it('should show OpenAI Privacy Policy link', () => {
      const settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        llm: { ...DEFAULT_SETTINGS.llm, provider: 'openai' },
      };

      render(
        <PrivacyStatusSection
          settings={settings}
          onSwitchToLocal={mockOnSwitchToLocal}
        />
      );

      expect(
        screen.getByRole('button', { name: /privacy policy/i })
      ).toBeInTheDocument();
    });
  });

  describe('Privacy Badge - Cloud Status (Anthropic)', () => {
    it('should show amber "Cloud-Analyse aktiv" badge for Anthropic provider', () => {
      const settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        llm: {
          ...DEFAULT_SETTINGS.llm,
          provider: 'anthropic',
          model: 'claude-sonnet-4',
        },
      };

      render(
        <PrivacyStatusSection
          settings={settings}
          onSwitchToLocal={mockOnSwitchToLocal}
        />
      );

      expect(screen.getByText('Cloud-Analyse aktiv')).toBeInTheDocument();
      expect(
        screen.getByText(/texte werden zur ki-analyse an anthropic gesendet/i)
      ).toBeInTheDocument();
    });

    it('should show Anthropic Privacy Policy link', () => {
      const settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        llm: { ...DEFAULT_SETTINGS.llm, provider: 'anthropic' },
      };

      render(
        <PrivacyStatusSection
          settings={settings}
          onSwitchToLocal={mockOnSwitchToLocal}
        />
      );

      expect(
        screen.getByRole('button', { name: /privacy policy/i })
      ).toBeInTheDocument();
    });
  });

  describe('Switch to Local Button', () => {
    it('should call onSwitchToLocal when button is clicked', async () => {
      const user = userEvent.setup();
      const settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        llm: { ...DEFAULT_SETTINGS.llm, provider: 'openai' },
      };

      render(
        <PrivacyStatusSection
          settings={settings}
          onSwitchToLocal={mockOnSwitchToLocal}
        />
      );

      const switchButton = screen.getByRole('button', {
        name: /zu ollama.*wechseln/i,
      });
      await user.click(switchButton);

      expect(mockOnSwitchToLocal).toHaveBeenCalledTimes(1);
    });

    it('should NOT render switch button when onSwitchToLocal is not provided', () => {
      const settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        llm: { ...DEFAULT_SETTINGS.llm, provider: 'openai' },
      };

      render(<PrivacyStatusSection settings={settings} />);

      expect(
        screen.queryByRole('button', { name: /zu ollama.*wechseln/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('Data Location Info', () => {
    it('should show storage path section header', () => {
      const settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        llm: { ...DEFAULT_SETTINGS.llm, provider: 'ollama' },
      };

      render(<PrivacyStatusSection settings={settings} />);

      expect(
        screen.getByText(/wo werden meine daten gespeichert/i)
      ).toBeInTheDocument();
    });

    it('should display default storage path when not provided', () => {
      const settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        llm: { ...DEFAULT_SETTINGS.llm, provider: 'ollama' },
      };

      render(<PrivacyStatusSection settings={settings} />);

      expect(screen.getByText(DEFAULT_STORAGE_PATH)).toBeInTheDocument();
    });

    it('should display custom storage path when provided', () => {
      const settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        llm: { ...DEFAULT_SETTINGS.llm, provider: 'ollama' },
      };
      const customPath = '/custom/storage/path';

      render(
        <PrivacyStatusSection settings={settings} storagePath={customPath} />
      );

      expect(screen.getByText(customPath)).toBeInTheDocument();
    });

    it('should show all data location entries', () => {
      const settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        llm: { ...DEFAULT_SETTINGS.llm, provider: 'ollama' },
      };

      render(<PrivacyStatusSection settings={settings} />);

      expect(screen.getByText(/audio-aufnahmen:/i)).toBeInTheDocument();
      expect(screen.getByText(/transkripte & analysen:/i)).toBeInTheDocument();
      expect(screen.getByText(/api-schlüssel:/i)).toBeInTheDocument();
      expect(screen.getByText(/app-einstellungen:/i)).toBeInTheDocument();
    });

    it('should mention macOS Keychain for API keys', () => {
      const settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        llm: { ...DEFAULT_SETTINGS.llm, provider: 'ollama' },
      };

      render(<PrivacyStatusSection settings={settings} />);

      expect(
        screen.getByText(/macos schlüsselbund.*aes-256/i)
      ).toBeInTheDocument();
    });

    it('should show desktop-app disclaimer', () => {
      const settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        llm: { ...DEFAULT_SETTINGS.llm, provider: 'ollama' },
      };

      render(<PrivacyStatusSection settings={settings} />);

      expect(
        screen.getByText(/desktop-app ohne eigene server/i)
      ).toBeInTheDocument();
    });
  });
});
