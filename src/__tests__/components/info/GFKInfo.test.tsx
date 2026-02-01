import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GFKInfo } from "@/components/info/GFKInfo";

describe("GFKInfo", () => {
  it("renders collapsed by default", () => {
    const { container } = render(<GFKInfo />);

    // Summary should be visible
    const summary = screen.getByText(/Wie funktioniert die GFK-Analyse\?/i);
    expect(summary).toBeInTheDocument();

    // Details element should NOT have open attribute
    const details = container.querySelector("details");
    expect(details).not.toHaveAttribute("open");
  });

  it("expands when summary clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(<GFKInfo />);

    const summary = screen.getByText(/Wie funktioniert die GFK-Analyse\?/i);
    const details = container.querySelector("details");

    // Click to expand
    await user.click(summary);

    // Details should now have open attribute
    expect(details).toHaveAttribute("open");
  });

  it("renders all 5 sections with crisis hotline", () => {
    render(<GFKInfo />);

    // All sections should be in the document (even if collapsed)
    // Section 1: Theoretical Foundation
    expect(screen.getByText(/Theoretische Grundlage/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Marshall Rosenberg/i).length).toBeGreaterThan(0);

    // Section 2: Dual-Track Methodology
    expect(screen.getByText(/Dual-Track Methodik/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Audio-Track/i).length).toBeGreaterThan(0);

    // Section 3: Implementation Details
    expect(screen.getByText(/Technische Implementation/i)).toBeInTheDocument();
    expect(screen.getAllByText(/qwen2\.5:7b-custom/i).length).toBeGreaterThan(0);

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
    const { container } = render(<GFKInfo />);

    // Summary should have aria-label
    const summary = container.querySelector("summary");
    expect(summary).toHaveAttribute("aria-label");

    // Icon should be aria-hidden (decorative)
    const icon = summary?.querySelector('[aria-hidden="true"]');
    expect(icon).toBeInTheDocument();
  });
});
