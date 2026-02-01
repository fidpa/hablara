import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToneIndicator } from "../ToneIndicator";
import type { ToneState } from "@/lib/types";

const mockTone: ToneState = {
  formality: 3,
  professionalism: 4,
  directness: 2,
  energy: 5,
  seriousness: 3,
  confidence: 0.75,
  source: "fused",
};

describe("ToneIndicator", () => {
  it("renders all 5 dimension bars", () => {
    render(<ToneIndicator tone={mockTone} />);
    expect(screen.getByText("Formalität")).toBeInTheDocument();
    expect(screen.getByText("Professionalität")).toBeInTheDocument();
    expect(screen.getByText("Direktheit")).toBeInTheDocument();
    expect(screen.getByText("Energie")).toBeInTheDocument();
    expect(screen.getByText("Ernsthaftigkeit")).toBeInTheDocument();
  });

  it("displays confidence percentage", () => {
    render(<ToneIndicator tone={mockTone} />);
    expect(screen.getByText("75% Konfidenz")).toBeInTheDocument();
  });

  it("shows collapsible descriptions section", () => {
    render(<ToneIndicator tone={mockTone} />);

    // Collapsible trigger should be present
    const descriptionButton = screen.getByText("Beschreibungen anzeigen");
    expect(descriptionButton).toBeInTheDocument();

    // Details element should exist
    const details = descriptionButton.closest("details");
    expect(details).toBeInTheDocument();
  });

  it("expands and collapses descriptions on click", async () => {
    const user = userEvent.setup();
    render(<ToneIndicator tone={mockTone} />);

    const summary = screen.getByText("Beschreibungen anzeigen");
    const details = summary.closest("details");

    // Initially closed (browser default)
    expect(details).not.toHaveAttribute("open");

    // Click to expand
    await user.click(summary);
    expect(details).toHaveAttribute("open");

    // Click to collapse
    await user.click(summary);
    expect(details).not.toHaveAttribute("open");
  });

  it("shows active indicator when isActive", () => {
    render(<ToneIndicator tone={mockTone} isActive />);
    const heading = screen.getByRole("heading", { name: "Ton-Analyse" });
    const container = heading.closest("div");
    const indicator = container?.querySelector(".animate-pulse");
    expect(indicator).toBeInTheDocument();
  });

  it("displays source badge correctly for fused", () => {
    render(<ToneIndicator tone={mockTone} />);
    expect(screen.getByText("Audio + Text")).toBeInTheDocument();
    expect(screen.getByText("(40% Audio, 60% Text)")).toBeInTheDocument();
  });

  it("displays source badge correctly for audio only", () => {
    const audioTone: ToneState = { ...mockTone, source: "audio" };
    render(<ToneIndicator tone={audioTone} />);
    expect(screen.getByText("Audio")).toBeInTheDocument();
    expect(screen.getByText("(nur Audio-Features)")).toBeInTheDocument();
  });

  it("displays source badge correctly for text only", () => {
    const textTone: ToneState = { ...mockTone, source: "text" };
    render(<ToneIndicator tone={textTone} />);
    expect(screen.getByText("Text")).toBeInTheDocument();
    expect(screen.getByText("(nur LLM-Analyse)")).toBeInTheDocument();
  });
});
