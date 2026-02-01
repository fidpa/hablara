import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmotionIndicator from "../EmotionIndicator";
import type { EmotionState } from "@/lib/types";

const mockEmotion: EmotionState = {
  primary: "stress",
  confidence: 0.75,
  audioFeatures: {
    pitch: 180,
    energy: 0.6,
    speechRate: 1.3,
  },
};

describe("EmotionIndicator", () => {
  it("renders emotion name and confidence", () => {
    render(<EmotionIndicator emotion={mockEmotion} isActive />);
    expect(screen.getByText("Stress")).toBeInTheDocument();
    // Multiple "75%" elements exist (main display + confidence bar)
    const confidenceElements = screen.getAllByText("75%");
    expect(confidenceElements.length).toBeGreaterThan(0);
  });

  it("displays audio features when active", () => {
    render(<EmotionIndicator emotion={mockEmotion} isActive />);
    expect(screen.getByText("Tonhöhe")).toBeInTheDocument();
    expect(screen.getByText("Energie")).toBeInTheDocument();
    expect(screen.getByText("Tempo")).toBeInTheDocument();
  });

  describe("Info Dropdown", () => {
    it("renders info section with summary", () => {
      render(<EmotionIndicator emotion={mockEmotion} isActive />);

      const summary = screen.getByText(/Wie funktioniert die Emotionsanalyse/i);
      expect(summary).toBeInTheDocument();
    });

    it("expands info section on click", async () => {
      const user = userEvent.setup();
      render(<EmotionIndicator emotion={mockEmotion} isActive />);

      const summary = screen.getByText(/Wie funktioniert die Emotionsanalyse/i);
      const details = summary.closest("details");

      // Initially closed
      expect(details).not.toHaveAttribute("open");

      // Click to expand
      await user.click(summary);
      expect(details).toHaveAttribute("open");

      // Verify content sections visible
      expect(screen.getByText("Emotionale Modelle")).toBeVisible();
      expect(screen.getByText("Dual-Track Methodik")).toBeVisible();
      expect(screen.getByText("12 Audio-Merkmale")).toBeVisible();
      expect(screen.getByText("Emotions-Blending")).toBeVisible();
      expect(screen.getByText("Erwartete Genauigkeit")).toBeVisible();
    });

    it("has all 5 content sections", async () => {
      const user = userEvent.setup();
      render(<EmotionIndicator emotion={mockEmotion} isActive />);

      // Expand details
      const summary = screen.getByText(/Wie funktioniert die Emotionsanalyse/i);
      await user.click(summary);

      // Verify all 5 section headers
      expect(screen.getByText("Emotionale Modelle")).toBeInTheDocument();
      expect(screen.getByText("Dual-Track Methodik")).toBeInTheDocument();
      expect(screen.getByText("12 Audio-Merkmale")).toBeInTheDocument();
      expect(screen.getByText("Emotions-Blending")).toBeInTheDocument();
      expect(screen.getByText("Erwartete Genauigkeit")).toBeInTheDocument();

      // Verify key content snippets
      expect(screen.getByText(/Plutchiks Rad/i)).toBeInTheDocument();
      expect(screen.getByText(/Audio-Track \(40%\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Legacy \(3\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Verhältnis zwischen Primär/i)).toBeInTheDocument(); // Blend Ratio section
      expect(screen.getByText(/Telefonseelsorge/i)).toBeInTheDocument();
    });

    it("has correct accessibility attributes", () => {
      render(<EmotionIndicator emotion={mockEmotion} isActive />);

      const summary = screen.getByText(/Wie funktioniert die Emotionsanalyse/i);
      expect(summary.closest("summary")).toHaveAttribute(
        "aria-label",
        "Informationen zur Emotionsanalyse ein-/ausblenden"
      );

      // Icon should be aria-hidden
      const summaryElement = summary.closest("summary");
      const icon = summaryElement?.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent("ℹ️");
    });
  });

  it("shows circumplex collapsible", () => {
    render(<EmotionIndicator emotion={mockEmotion} isActive />);
    expect(
      screen.getByText("Dimensionale Ansicht (Valence-Arousal)")
    ).toBeInTheDocument();
  });
});
