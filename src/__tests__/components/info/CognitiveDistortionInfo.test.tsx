import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CognitiveDistortionInfo } from "@/components/info/CognitiveDistortionInfo";

describe("CognitiveDistortionInfo", () => {
  it("renders collapsed by default", () => {
    const { container } = render(<CognitiveDistortionInfo />);

    // Summary should be visible
    const summary = screen.getByText(/Wie funktioniert die Analyse kognitiver Verzerrungen\?/i);
    expect(summary).toBeInTheDocument();

    // Details element should NOT have open attribute
    const details = container.querySelector("details");
    expect(details).not.toHaveAttribute("open");
  });

  it("expands when summary clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(<CognitiveDistortionInfo />);

    const summary = screen.getByText(/Wie funktioniert die Analyse kognitiver Verzerrungen\?/i);
    const details = container.querySelector("details");

    // Click to expand
    await user.click(summary);

    // Details should now have open attribute
    expect(details).toHaveAttribute("open");
  });

  it("renders all 5 sections with crisis hotline", () => {
    render(<CognitiveDistortionInfo />);

    // All sections should be in the document
    // Section 1: Theoretical Foundation
    expect(screen.getByText(/Theoretische Grundlage/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Aaron Beck/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Catastrophizing/i).length).toBeGreaterThan(0);

    // Section 2: Dual-Track Methodology
    expect(screen.getByText(/Dual-Track Methodik/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Audio-Track/i).length).toBeGreaterThan(0);

    // Section 3: Implementation Details
    expect(screen.getByText(/Technische Implementation/i)).toBeInTheDocument();
    expect(screen.getAllByText(/COGNITIVE_DISTORTION_PROMPT/i).length).toBeGreaterThan(0);

    // Section 4: Expected Accuracy
    expect(screen.getByText(/Erwartete Genauigkeit/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Fused Output/i).length).toBeGreaterThan(0);

    // Section 5: Disclaimer + Crisis Hotline
    expect(screen.getAllByText(/Selbstreflexions-Tool/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Telefonseelsorge 0800 111 0 111/i).length).toBeGreaterThan(0);

    // Crisis Hotline Link
    const crisisLink = screen.getByRole("link", { name: /Telefonseelsorge/i });
    expect(crisisLink).toHaveAttribute("href", "tel:08001110111");
  });

  it("has accessible ARIA labels", () => {
    const { container } = render(<CognitiveDistortionInfo />);

    // Summary should have aria-label
    const summary = container.querySelector("summary");
    expect(summary).toHaveAttribute("aria-label");

    // Icon should be aria-hidden (decorative)
    const icon = summary?.querySelector('[aria-hidden="true"]');
    expect(icon).toBeInTheDocument();
  });
});
