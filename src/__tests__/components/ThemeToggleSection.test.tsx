/**
 * ThemeToggleSection - Unit Tests
 *
 * Tests cycle behavior, icon/label rendering, keyboard accessibility.
 * Mocks next-themes useTheme hook.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggleSection } from "@/components/settings/ThemeToggleSection";

// Mock next-themes
const mockSetTheme = vi.fn();
let mockTheme = "dark";

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: mockTheme,
    setTheme: mockSetTheme,
  }),
}));

describe("ThemeToggleSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme = "dark";
  });

  it("renders without crashing", () => {
    const { container } = render(<ThemeToggleSection />);
    expect(container).toBeTruthy();
  });

  it("renders dark theme with moon icon after mount", async () => {
    render(<ThemeToggleSection />);

    await waitFor(() => {
      expect(screen.getByText("Dunkel")).toBeInTheDocument();
    });

    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("Dunkel");
  });

  it("renders light theme with sun icon", async () => {
    mockTheme = "light";
    render(<ThemeToggleSection />);

    await waitFor(() => {
      expect(screen.getByText("Hell")).toBeInTheDocument();
    });
  });

  it("renders system theme with monitor icon", async () => {
    mockTheme = "system";
    render(<ThemeToggleSection />);

    await waitFor(() => {
      expect(screen.getByText("System")).toBeInTheDocument();
    });
  });

  it("cycles from light to dark when clicked", async () => {
    mockTheme = "light";
    const user = userEvent.setup();
    render(<ThemeToggleSection />);

    await waitFor(() => {
      expect(screen.getByText("Hell")).toBeInTheDocument();
    });

    const button = screen.getByRole("button");
    await user.click(button);

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("cycles from dark to system when clicked", async () => {
    mockTheme = "dark";
    const user = userEvent.setup();
    render(<ThemeToggleSection />);

    await waitFor(() => {
      expect(screen.getByText("Dunkel")).toBeInTheDocument();
    });

    const button = screen.getByRole("button");
    await user.click(button);

    expect(mockSetTheme).toHaveBeenCalledWith("system");
  });

  it("cycles from system to light when clicked", async () => {
    mockTheme = "system";
    const user = userEvent.setup();
    render(<ThemeToggleSection />);

    await waitFor(() => {
      expect(screen.getByText("System")).toBeInTheDocument();
    });

    const button = screen.getByRole("button");
    await user.click(button);

    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("is keyboard accessible", async () => {
    mockTheme = "dark";
    const user = userEvent.setup();
    render(<ThemeToggleSection />);

    await waitFor(() => {
      expect(screen.getByText("Dunkel")).toBeInTheDocument();
    });

    const button = screen.getByRole("button");

    // Focus button via Tab
    await user.tab();
    expect(button).toHaveFocus();

    // Activate via Enter
    await user.keyboard("{Enter}");
    expect(mockSetTheme).toHaveBeenCalledWith("system");
  });
});
