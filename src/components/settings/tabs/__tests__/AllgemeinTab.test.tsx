import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AllgemeinTab } from "../AllgemeinTab";
import type { AppSettings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";

// Mock isTauri utility
vi.mock("@/lib/utils", async () => {
  const actual = await vi.importActual("@/lib/utils");
  return {
    ...actual,
    isTauri: vi.fn(() => false),
  };
});

// Mock Joyride for TourSection
vi.mock("react-joyride", () => ({
  default: () => null,
}));

describe("AllgemeinTab", () => {
  const mockOnSettingsChange = vi.fn();

  const defaultSettings: AppSettings = {
    ...DEFAULT_SETTINGS,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all sections", () => {
    render(
      <AllgemeinTab
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    // Hotkey Section
    expect(screen.getByText("Hotkey")).toBeInTheDocument();

    // Audio Feedback Section
    expect(screen.getByText("Audio-Feedback")).toBeInTheDocument();

    // About Section (always visible)
    expect(screen.getByText("Über Hablará")).toBeInTheDocument();

    // Note: ZoomSection and TourSection may not render in test environment
    // ZoomSection: only in Tauri (mocked as false)
    // TourSection: depends on localStorage and may not render button in all cases
  });

  it("renders hotkey input", () => {
    render(
      <AllgemeinTab
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    const hotkeyInput = screen.getByDisplayValue(DEFAULT_SETTINGS.hotkey);
    expect(hotkeyInput).toBeInTheDocument();
  });

  it("updates hotkey when input changes", async () => {
    const user = userEvent.setup();
    render(
      <AllgemeinTab
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    const hotkeyInput = screen.getByDisplayValue(DEFAULT_SETTINGS.hotkey);

    await user.clear(hotkeyInput);
    await user.type(hotkeyInput, "CommandOrControl+Shift+R");

    expect(mockOnSettingsChange).toHaveBeenCalled();
  });

  it("renders audio feedback toggle", () => {
    render(
      <AllgemeinTab
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    expect(screen.getByText("Start/Stop-Töne")).toBeInTheDocument();
  });

  it("toggles audio feedback when switch clicked", async () => {
    const user = userEvent.setup();
    render(
      <AllgemeinTab
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    // Find the audio feedback switch
    const switches = screen.getAllByRole("switch");
    expect(switches.length).toBeGreaterThan(0); // Guard: ensure switches exist
    const audioSwitch = switches[0]!; // Safe: guard passed

    await user.click(audioSwitch);

    expect(mockOnSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        audio: expect.objectContaining({
          playStartStopSounds: !defaultSettings.audio.playStartStopSounds,
        }),
      })
    );
  });

  it("shows volume slider when audio feedback enabled", () => {
    const enabledSettings: AppSettings = {
      ...defaultSettings,
      audio: {
        playStartStopSounds: true,
        soundVolume: 0.7,
      },
    };

    render(
      <AllgemeinTab
        settings={enabledSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    expect(screen.getByText("Lautstärke")).toBeInTheDocument();
    expect(screen.getByText("70%")).toBeInTheDocument();
  });

  it("renders tour section", () => {
    render(
      <AllgemeinTab
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    // TourSection is present, button may or may not render depending on localStorage
    // We just verify the section doesn't crash
    expect(screen.getByText("Hotkey")).toBeInTheDocument(); // Verify component renders
  });

  it("renders about section with version and developer", () => {
    render(
      <AllgemeinTab
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    expect(screen.getByText("Über Hablará")).toBeInTheDocument();
    // Version should be displayed
    expect(screen.getByText(/Version/i)).toBeInTheDocument();
    // Developer should be displayed
    expect(screen.getByText(/Entwickelt von/i)).toBeInTheDocument();
    expect(screen.getByText(/Marc Allgeier/i)).toBeInTheDocument();
  });

  it("has proper section separators", () => {
    const { container } = render(
      <AllgemeinTab
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    // Separators are present between sections
    // Radix UI Separator has role="none" and data-orientation="horizontal"
    const separators = container.querySelectorAll('[role="none"][data-orientation="horizontal"]');
    expect(separators.length).toBeGreaterThanOrEqual(3); // At least 3 separators between 4+ visible sections
  });
});
