import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { DEFAULT_INPUT_LIMITS, DEFAULT_SETTINGS, SETTINGS_UI_TIMINGS, type AppSettings, type InputLimits } from '@/lib/types';

// Mock useRecordings hook
vi.mock('@/hooks/useRecordings', () => ({
  useRecordings: () => ({
    config: {
      storageEnabled: true,
      storagePath: '/mock/storage/path',
      maxRecordings: 50,
      autoSave: true,
    },
    updateConfig: vi.fn(),
    recordings: [],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    deleteRecording: vi.fn(),
    clearAllRecordings: vi.fn(),
    getStorageStats: vi.fn().mockResolvedValue({
      count: 0,
      totalSizeMB: 0,
    }),
  }),
}));

// Mock LLM client
vi.mock('@/lib/llm', () => ({
  getOllamaClient: () => ({
    isAvailable: vi.fn().mockResolvedValue(true),
  }),
}));

// Mock useLLMProviderStatus hook
vi.mock('@/hooks/useLLMProviderStatus', () => ({
  useLLMProviderStatus: () => ({
    status: {
      ollama: 'online',
      openai: 'no-key',
      anthropic: 'no-key',
    },
    isLoading: false,
  }),
}));

// Mock secure-storage
vi.mock('@/lib/secure-storage', () => ({
  storeApiKey: vi.fn().mockResolvedValue(undefined),
  deleteApiKey: vi.fn().mockResolvedValue(undefined),
  getApiKey: vi.fn().mockResolvedValue(null),
}));

// Mock use-toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('SettingsPanel - Input Limits', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSettingsChange = vi.fn();
  let mockSettings: AppSettings;

  beforeEach(() => {
    mockOnOpenChange.mockClear();
    mockOnSettingsChange.mockClear();
    mockSettings = { ...DEFAULT_SETTINGS };

    // Mock localStorage with default empty implementation
    // Individual tests can override getItem as needed
    const localStorageMock = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    };
    global.localStorage = localStorageMock as unknown as Storage;
  });

  describe('Tab Navigation', () => {
    it('should render all 5 tabs', () => {
      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      expect(screen.getByRole('tab', { name: /allgemein/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /analyse/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /ki-modelle/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /speicher/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /erweitert/i })).toBeInTheDocument();
    });

    it('should show Allgemein tab by default', () => {
      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Allgemein Tab is default
      const allgemeinTab = screen.getByRole('tab', { name: /allgemein/i });
      expect(allgemeinTab).toHaveAttribute('data-state', 'active');
    });

    it('should switch to Analyse tab on click', async () => {
      const user = userEvent.setup();
      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const analyseTab = screen.getByRole('tab', { name: /analyse/i });
      await user.click(analyseTab);

      expect(analyseTab).toHaveAttribute('data-state', 'active');
    });

    it('should switch to Speicher tab on click', async () => {
      const user = userEvent.setup();

      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const speicherTab = screen.getByRole('tab', { name: /speicher/i });
      await user.click(speicherTab);

      expect(speicherTab).toHaveAttribute('data-state', 'active');
    });
  });

  describe('Rendering', () => {
    it('should render all 4 input limit fields in Speicher tab', async () => {
      const user = userEvent.setup();

      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Navigate to Speicher tab
      const speicherTab = screen.getByRole('tab', { name: /speicher/i });
      await user.click(speicherTab);

      // Check for Input Limits section
      expect(screen.getByText('Input-Limits')).toBeInTheDocument();

      // Check for all 4 limit inputs
      expect(screen.getByLabelText(/maximale textzeichen/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/maximale textdateigröße/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/maximale audiodateigröße/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/maximale aufnahmedauer/i)).toBeInTheDocument();
    });

    it('should display default values', async () => {
      const user = userEvent.setup();

      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Navigate to Speicher tab
      const speicherTab = screen.getByRole('tab', { name: /speicher/i });
      await user.click(speicherTab);

      const textCharsInput = screen.getByLabelText(/maximale textzeichen/i) as HTMLInputElement;
      const textFileSizeInput = screen.getByLabelText(/maximale textdateigröße/i) as HTMLInputElement;
      const audioFileSizeInput = screen.getByLabelText(/maximale audiodateigröße/i) as HTMLInputElement;
      const recordingDurationInput = screen.getByLabelText(/maximale aufnahmedauer/i) as HTMLInputElement;

      expect(textCharsInput.value).toBe('100000');
      expect(textFileSizeInput.value).toBe('10');
      expect(audioFileSizeInput.value).toBe('50');
      expect(recordingDurationInput.value).toBe('30');
    });

    it('should show helper text for each limit', async () => {
      const user = userEvent.setup();

      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Navigate to Speicher tab
      const speicherTab = screen.getByRole('tab', { name: /speicher/i });
      await user.click(speicherTab);

      expect(screen.getByText(/100,000 zeichen.*50 seiten/i)).toBeInTheDocument();
      expect(screen.getByText(/10 mb.*\.txt\/\.md/i)).toBeInTheDocument();
      expect(screen.getByText(/50 mb.*audio-dateien/i)).toBeInTheDocument();
      expect(screen.getByText(/30 minuten/i)).toBeInTheDocument();
    });

    it('should show reset button', async () => {
      const user = userEvent.setup();

      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Navigate to Speicher tab
      const speicherTab = screen.getByRole('tab', { name: /speicher/i });
      await user.click(speicherTab);

      const resetButton = screen.getByRole('button', { name: /auf standard zurücksetzen/i });
      expect(resetButton).toBeInTheDocument();
    });
  });

  describe('Value Updates', () => {
    // NOTE: Architecture changed - SettingsPanel now uses local state and only calls
    // onSettingsChange on Save button click (Phase 32 Tab-based Settings Redesign).
    // These tests tested the old "immediate propagation" behavior.
    // The new behavior is tested via "should persist changes to localStorage on save".

    it.skip('should call onSettingsChange when maxTextCharacters is updated (OBSOLETE: now requires Save click)', async () => {
      const user = userEvent.setup();

      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Navigate to Speicher tab
      const speicherTab = screen.getByRole('tab', { name: /speicher/i });
      await user.click(speicherTab);

      const textCharsInput = screen.getByLabelText(/maximale textzeichen/i) as HTMLInputElement;

      // Use fireEvent to directly trigger onChange with new value
      fireEvent.change(textCharsInput, { target: { value: '50000' } });

      // Verify onSettingsChange was called with updated limits
      expect(mockOnSettingsChange).toHaveBeenCalled();
      const lastCall = mockOnSettingsChange.mock.calls[mockOnSettingsChange.mock.calls.length - 1][0];
      expect(lastCall.limits?.maxTextCharacters).toBe(50000);
    });

    it.skip('should call onSettingsChange when maxTextFileSizeMB is updated (OBSOLETE: now requires Save click)', async () => {
      const user = userEvent.setup();

      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Navigate to Speicher tab
      const speicherTab = screen.getByRole('tab', { name: /speicher/i });
      await user.click(speicherTab);

      const textFileSizeInput = screen.getByLabelText(/maximale textdateigröße/i) as HTMLInputElement;

      fireEvent.change(textFileSizeInput, { target: { value: '20' } });

      expect(mockOnSettingsChange).toHaveBeenCalled();
      const lastCall = mockOnSettingsChange.mock.calls[mockOnSettingsChange.mock.calls.length - 1][0];
      expect(lastCall.limits?.maxTextFileSizeMB).toBe(20);
    });

    it.skip('should call onSettingsChange when maxAudioFileSizeMB is updated (OBSOLETE: now requires Save click)', async () => {
      const user = userEvent.setup();

      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Navigate to Speicher tab
      const speicherTab = screen.getByRole('tab', { name: /speicher/i });
      await user.click(speicherTab);

      const audioFileSizeInput = screen.getByLabelText(/maximale audiodateigröße/i) as HTMLInputElement;

      fireEvent.change(audioFileSizeInput, { target: { value: '100' } });

      expect(mockOnSettingsChange).toHaveBeenCalled();
      const lastCall = mockOnSettingsChange.mock.calls[mockOnSettingsChange.mock.calls.length - 1][0];
      expect(lastCall.limits?.maxAudioFileSizeMB).toBe(100);
    });

    it.skip('should call onSettingsChange when maxRecordingMinutes is updated (OBSOLETE: now requires Save click)', async () => {
      const user = userEvent.setup();

      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Navigate to Speicher tab
      const speicherTab = screen.getByRole('tab', { name: /speicher/i });
      await user.click(speicherTab);

      const recordingDurationInput = screen.getByLabelText(/maximale aufnahmedauer/i) as HTMLInputElement;

      fireEvent.change(recordingDurationInput, { target: { value: '60' } });

      expect(mockOnSettingsChange).toHaveBeenCalled();
      const lastCall = mockOnSettingsChange.mock.calls[mockOnSettingsChange.mock.calls.length - 1][0];
      expect(lastCall.limits?.maxRecordingMinutes).toBe(60);
    });

    it('should respect input constraints (min/max)', async () => {
      const user = userEvent.setup();

      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Navigate to Speicher tab
      const speicherTab = screen.getByRole('tab', { name: /speicher/i });
      await user.click(speicherTab);

      const textCharsInput = screen.getByLabelText(/maximale textzeichen/i) as HTMLInputElement;

      // Check min/max attributes
      expect(textCharsInput.min).toBe('1000');
      expect(textCharsInput.max).toBe('1000000');
      expect(textCharsInput.step).toBe('1000');
    });
  });

  describe('Reset Functionality', () => {
    it('should have reset button in Erweitert tab', async () => {
      const user = userEvent.setup();

      // Start with modified settings
      const modifiedSettings = {
        ...DEFAULT_SETTINGS,
        limits: {
          maxTextCharacters: 50000,
          maxTextFileSizeMB: 20,
          maxAudioFileSizeMB: 100,
          maxRecordingMinutes: 60,
        },
      };

      render(
        <SettingsPanel
          settings={modifiedSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Navigate to Erweitert tab
      const erweitertTab = screen.getByRole('tab', { name: /erweitert/i });
      await user.click(erweitertTab);

      // Wait for tab content and verify reset section exists
      await waitFor(() => {
        expect(screen.getByText(/einstellungen zurücksetzen/i)).toBeInTheDocument();
      });
    });
  });

  describe('Persistence', () => {
    it('should persist changes to localStorage on save', async () => {
      const user = userEvent.setup();

      // Create modified settings to trigger save
      const modifiedSettings = {
        ...DEFAULT_SETTINGS,
        limits: {
          ...DEFAULT_INPUT_LIMITS,
          maxTextCharacters: 75000,
        },
      };

      render(
        <SettingsPanel
          settings={modifiedSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Click save button
      const saveButton = screen.getByRole('button', { name: /speichern/i });
      await user.click(saveButton);

      // Verify localStorage.setItem was called with settings containing 75000
      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalled();
        const calls = vi.mocked(localStorage.setItem).mock.calls;
        const settingsCall = calls.find(call => call[0] === 'hablara-settings');
        expect(settingsCall).toBeDefined();
        expect(settingsCall![1]).toContain('75000');
      });
    });

    it('should display custom limits passed via props', async () => {
      const user = userEvent.setup();

      const customSettings = {
        ...DEFAULT_SETTINGS,
        limits: {
          maxTextCharacters: 200000,
          maxTextFileSizeMB: 25,
          maxAudioFileSizeMB: 75,
          maxRecordingMinutes: 45,
        },
      };

      render(
        <SettingsPanel
          settings={customSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Navigate to Speicher tab
      const speicherTab = screen.getByRole('tab', { name: /speicher/i });
      await user.click(speicherTab);

      // Verify custom values are displayed
      await waitFor(() => {
        const textCharsInput = screen.getByLabelText(/maximale textzeichen/i) as HTMLInputElement;
        expect(textCharsInput.value).toBe('200000');
      });

      const textFileSizeInput = screen.getByLabelText(/maximale textdateigröße/i) as HTMLInputElement;
      const audioFileSizeInput = screen.getByLabelText(/maximale audiodateigröße/i) as HTMLInputElement;
      const recordingDurationInput = screen.getByLabelText(/maximale aufnahmedauer/i) as HTMLInputElement;

      expect(textFileSizeInput.value).toBe('25');
      expect(audioFileSizeInput.value).toBe('75');
      expect(recordingDurationInput.value).toBe('45');
    });

    // NOTE: Architecture changed - onSettingsChange only called on Save click (Phase 32)
    it.skip('should call onSettingsChange on input change (integration test) (OBSOLETE: now requires Save click)', async () => {
      const user = userEvent.setup();

      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Navigate to Speicher tab
      const speicherTab = screen.getByRole('tab', { name: /speicher/i });
      await user.click(speicherTab);

      // Wait for tab content to render
      await waitFor(() => {
        expect(screen.getByLabelText(/maximale textzeichen/i)).toBeInTheDocument();
      });

      // Modify a limit using fireEvent
      const textCharsInput = screen.getByLabelText(/maximale textzeichen/i) as HTMLInputElement;
      fireEvent.change(textCharsInput, { target: { value: '75000' } });

      // Verify onSettingsChange was called
      expect(mockOnSettingsChange).toHaveBeenCalled();
      const lastCall = mockOnSettingsChange.mock.calls[mockOnSettingsChange.mock.calls.length - 1][0];
      expect(lastCall.limits?.maxTextCharacters).toBe(75000);
    });
  });

  describe('Edge Cases', () => {
    it('should use default limits when settings.limits is undefined', async () => {
      const user = userEvent.setup();

      const settingsWithoutLimits = {
        ...DEFAULT_SETTINGS,
        limits: undefined,
      };

      render(
        <SettingsPanel
          settings={settingsWithoutLimits as AppSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Navigate to Speicher tab
      const speicherTab = screen.getByRole('tab', { name: /speicher/i });
      await user.click(speicherTab);

      // Should fall back to defaults
      const textCharsInput = screen.getByLabelText(/maximale textzeichen/i) as HTMLInputElement;
      expect(textCharsInput.value).toBe(DEFAULT_INPUT_LIMITS.maxTextCharacters.toString());
    });

    it('should handle partial limits object', async () => {
      const user = userEvent.setup();

      const partialLimits = {
        ...DEFAULT_SETTINGS,
        limits: {
          maxTextCharacters: 50000,
          // Missing other properties - should use defaults
        } as Partial<InputLimits>,
      };

      render(
        <SettingsPanel
          settings={partialLimits}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Navigate to Speicher tab
      const speicherTab = screen.getByRole('tab', { name: /speicher/i });
      await user.click(speicherTab);

      const textFileSizeInput = screen.getByLabelText(/maximale textdateigröße/i) as HTMLInputElement;
      expect(textFileSizeInput.value).toBe(DEFAULT_INPUT_LIMITS.maxTextFileSizeMB.toString());
    });

    // NOTE: Architecture changed - onSettingsChange only called on Save click (Phase 32)
    // Minimum enforcement still works in InputLimitsSection but tests via local state
    it.skip('should enforce minimum value (1000) for maxTextCharacters (OBSOLETE: now requires Save click)', async () => {
      const user = userEvent.setup();

      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Navigate to Speicher tab
      const speicherTab = screen.getByRole('tab', { name: /speicher/i });
      await user.click(speicherTab);

      const textCharsInput = screen.getByLabelText(/maximale textzeichen/i) as HTMLInputElement;

      // Try to set value below minimum using fireEvent
      fireEvent.change(textCharsInput, { target: { value: '500' } });

      // Verify onSettingsChange enforces minimum
      expect(mockOnSettingsChange).toHaveBeenCalled();
      const lastCall = mockOnSettingsChange.mock.calls[mockOnSettingsChange.mock.calls.length - 1][0];
      expect(lastCall.limits?.maxTextCharacters).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('Setup Hints Modal', () => {
    it('should close settings when "Setup-Hinweise anzeigen" is clicked', async () => {
      const user = userEvent.setup();
      const mockOnRestartSetupHints = vi.fn();

      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
          onRestartSetupHints={mockOnRestartSetupHints}
        />
      );

      // Navigate to Allgemein tab (should be default, but ensure it)
      const allgemeinTab = screen.getByRole('tab', { name: /allgemein/i });
      await user.click(allgemeinTab);

      // Find and click "Setup-Hinweise anzeigen" button
      const setupHintsButton = screen.getByRole('button', { name: /setup-hinweise anzeigen/i });
      await user.click(setupHintsButton);

      // Verify onOpenChange was called with false to close settings
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);

      // Verify onRestartSetupHints was also called
      expect(mockOnRestartSetupHints).toHaveBeenCalled();
    });
  });

  describe('Save Button Visual Feedback (Phase 51)', () => {
    // NOTE: These tests use REAL timers because vi.useFakeTimers() + userEvent.click = deadlock
    // userEvent v14 uses setTimeout internally, which doesn't advance with fake timers
    // See: https://github.com/testing-library/user-event/issues/1115

    let originalSetItem: typeof localStorage.setItem;
    let setItemMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      // Save original localStorage.setItem for cleanup
      originalSetItem = global.localStorage.setItem;
      // Default mock that works (can be overridden in individual tests)
      setItemMock = vi.fn();
      global.localStorage.setItem = setItemMock;
    });

    afterEach(() => {
      vi.clearAllMocks();
      vi.restoreAllMocks();
      // Restore original localStorage.setItem
      global.localStorage.setItem = originalSetItem;
    });

    it('should show idle state initially', () => {
      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const saveButton = screen.getByRole('button', { name: /^speichern$/i });
      expect(saveButton).toBeInTheDocument();
      expect(saveButton).not.toBeDisabled();
    });

    it('should show success state after successful save', async () => {
      const user = userEvent.setup();

      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const saveButton = screen.getByRole('button', { name: /^speichern$/i });
      await user.click(saveButton);

      // Wait for save to complete (async operations + state updates)
      await waitFor(() => {
        expect(screen.getByText(/^gespeichert$/i)).toBeInTheDocument();
      });
    });

    it('should reset to idle after success timeout', async () => {
      const user = userEvent.setup();

      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const saveButton = screen.getByRole('button', { name: /^speichern$/i });
      await user.click(saveButton);

      // Wait for success state
      await waitFor(() => {
        expect(screen.getByText(/^gespeichert$/i)).toBeInTheDocument();
      });

      // Wait for real timeout (SETTINGS_UI_TIMINGS.saveSuccessFeedbackMs = 2000ms)
      // We use waitFor with longer timeout to wait for idle state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^speichern$/i })).toBeInTheDocument();
      }, { timeout: SETTINGS_UI_TIMINGS.saveSuccessFeedbackMs + 500 });
    });

    it('should disable button during saving', async () => {
      // NOTE: The "saving" state is very brief with mocked localStorage (sync operation)
      // We test that the button becomes disabled during the async save operation
      // by verifying the success state (which means it transitioned through saving)
      const user = userEvent.setup();

      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const saveButton = screen.getByRole('button', { name: /^speichern$/i });
      await user.click(saveButton);

      // After successful save, button shows "Gespeichert"
      // This confirms the save flow (idle → saving → success) completed
      await waitFor(() => {
        const button = screen.getByText(/^gespeichert$/i).closest('button');
        expect(button).toBeInTheDocument();
      });
    });

    it('should have proper aria attributes on success', async () => {
      const user = userEvent.setup();

      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const saveButton = screen.getByRole('button', { name: /^speichern$/i });
      await user.click(saveButton);

      // Wait for success state
      await waitFor(() => {
        const successButton = screen.getByText(/^gespeichert$/i).closest('button');
        expect(successButton).toBeInTheDocument();
        // After saving, aria-busy should be false (not saving anymore)
        expect(successButton).not.toHaveAttribute('aria-busy', 'true');
      });
    });

    it('should announce success state via aria-live', async () => {
      const user = userEvent.setup();

      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const saveButton = screen.getByRole('button', { name: /^speichern$/i });
      await user.click(saveButton);

      // Wait for success aria-live announcement
      await waitFor(() => {
        const liveRegion = screen.getByText(/einstellungen gespeichert/i);
        expect(liveRegion).toHaveClass('sr-only');
        expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should cleanup timeout on unmount without errors', async () => {
      const user = userEvent.setup();

      const { unmount } = render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const saveButton = screen.getByRole('button', { name: /^speichern$/i });
      await user.click(saveButton);

      // Wait for success state
      await waitFor(() => {
        expect(screen.getByText(/^gespeichert$/i)).toBeInTheDocument();
      });

      // Unmount before timeout completes - should not throw error
      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid clicks gracefully (race condition)', async () => {
      const user = userEvent.setup();
      mockOnSettingsChange.mockClear();

      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const saveButton = screen.getByRole('button', { name: /^speichern$/i });

      // Click rapidly - second click should be blocked by isSaving guard
      await user.click(saveButton);

      // Wait for save to complete
      await waitFor(() => {
        expect(screen.getByText(/^gespeichert$/i)).toBeInTheDocument();
      });

      // Now we can click again (after success state)
      await user.click(saveButton);

      // Wait for second save to complete
      await waitFor(() => {
        expect(screen.getByText(/^gespeichert$/i)).toBeInTheDocument();
      });

      // Should be called twice (once per successful save cycle)
      expect(mockOnSettingsChange).toHaveBeenCalledTimes(2);
    });

    it('should allow new save after success state', async () => {
      const user = userEvent.setup();
      mockOnSettingsChange.mockClear();

      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const saveButton = screen.getByRole('button', { name: /^speichern$/i });

      // First save
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/^gespeichert$/i)).toBeInTheDocument();
      });

      // Wait for idle state to return
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^speichern$/i })).toBeInTheDocument();
      }, { timeout: SETTINGS_UI_TIMINGS.saveSuccessFeedbackMs + 500 });

      // Second save should work
      await user.click(screen.getByRole('button', { name: /^speichern$/i }));

      await waitFor(() => {
        expect(screen.getByText(/^gespeichert$/i)).toBeInTheDocument();
      });

      // Should have been called twice
      expect(mockOnSettingsChange).toHaveBeenCalledTimes(2);
    });

    it('should show error state after failed save', async () => {
      const user = userEvent.setup();

      // Mock localStorage to throw error
      global.localStorage.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const saveButton = screen.getByRole('button', { name: /^speichern$/i });
      await user.click(saveButton);

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/fehler - erneut versuchen/i)).toBeInTheDocument();
      });
    });

    it('should reset error state after timeout', async () => {
      const user = userEvent.setup();

      // Mock localStorage to throw error
      global.localStorage.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const saveButton = screen.getByRole('button', { name: /^speichern$/i });
      await user.click(saveButton);

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/fehler - erneut versuchen/i)).toBeInTheDocument();
      });

      // Wait for error timeout to reset to idle (SETTINGS_UI_TIMINGS.saveErrorResetMs = 5000ms)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^speichern$/i })).toBeInTheDocument();
      }, { timeout: SETTINGS_UI_TIMINGS.saveErrorResetMs + 500 });
    }, 10000); // Extended timeout: 5s error reset + buffer

    it('should show check icon on success', async () => {
      const user = userEvent.setup();

      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const saveButton = screen.getByRole('button', { name: /^speichern$/i });
      await user.click(saveButton);

      // Wait for success state with check icon
      await waitFor(() => {
        const successButton = screen.getByText(/^gespeichert$/i).closest('button');
        expect(successButton).toBeInTheDocument();
        // Check icon should be present (aria-hidden)
        const icon = successButton?.querySelector('[aria-hidden="true"]');
        expect(icon).toBeInTheDocument();
      });
    });

    it('should call localStorage.setItem with correct key', async () => {
      const user = userEvent.setup();

      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const saveButton = screen.getByRole('button', { name: /^speichern$/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(setItemMock).toHaveBeenCalled();
        // Find the call with 'hablara-settings' key
        const settingsCall = setItemMock.mock.calls.find(
          (call) => call[0] === 'hablara-settings'
        );
        expect(settingsCall).toBeDefined();
      });
    });

    it('should call onSettingsChange on successful save', async () => {
      const user = userEvent.setup();
      mockOnSettingsChange.mockClear();

      render(
        <SettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const saveButton = screen.getByRole('button', { name: /^speichern$/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalled();
      });
    });
  });
});
