import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatThinkingIndicator } from "@/components/ChatThinkingIndicator";

describe("ChatThinkingIndicator", () => {
  it("renders 'Denkt nach...' text", () => {
    render(<ChatThinkingIndicator />);
    expect(screen.getByText("Denkt nach...")).toBeInTheDocument();
  });

  it("renders 'Hablará' label", () => {
    render(<ChatThinkingIndicator />);
    expect(screen.getByText("Hablará")).toBeInTheDocument();
  });

  it("has correct ARIA attributes for screen readers", () => {
    render(<ChatThinkingIndicator />);

    // Main container should have role="status" for screen reader announcements
    const statusElement = screen.getByRole("status");
    expect(statusElement).toBeInTheDocument();

    // Should have aria-live="polite" for non-intrusive announcements
    expect(statusElement).toHaveAttribute("aria-live", "polite");

    // Should have descriptive aria-label
    expect(statusElement).toHaveAttribute("aria-label", "Hablará denkt nach");
  });

  it("renders Bot icon in purple avatar", () => {
    const { container } = render(<ChatThinkingIndicator />);

    // Check for purple background color (bg-purple-600)
    const avatar = container.querySelector(".bg-purple-600");
    expect(avatar).toBeInTheDocument();

    // Check for Bot icon (lucide renders as svg)
    const botIcon = container.querySelector("svg");
    expect(botIcon).toBeInTheDocument();
  });

  it("renders Loader2 spinner icon", () => {
    const { container } = render(<ChatThinkingIndicator />);

    // Loader2 should have animate-spin class
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("has motion-reduce classes for accessibility", () => {
    const { container } = render(<ChatThinkingIndicator />);

    // Thinking bubble should have motion-reduce:animate-none
    const bubble = container.querySelector(".animate-fade-in");
    expect(bubble).toHaveClass("motion-reduce:animate-none");

    // Spinner should have motion-reduce:animate-none
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toHaveClass("motion-reduce:animate-none");
  });

  it("matches assistant message bubble styling", () => {
    const { container } = render(<ChatThinkingIndicator />);

    // Should have slate-100 background in light mode (dark mode uses dark:bg-slate-700/50)
    const bubble = container.querySelector(".bg-slate-100");
    expect(bubble).toBeInTheDocument();

    // Should have rounded-tl-sm (matches assistant bubble tail)
    const tailElement = container.querySelector(".rounded-tl-sm");
    expect(tailElement).toBeInTheDocument();
  });

  it("renders with proper layout structure", () => {
    const { container } = render(<ChatThinkingIndicator />);

    // Main container should be an article with flex layout
    const article = container.querySelector("article");
    expect(article).toBeInTheDocument();
    expect(article).toHaveClass("flex", "gap-3", "flex-row");

    // Should have avatar and bubble
    const avatar = container.querySelector(".flex-shrink-0");
    expect(avatar).toBeInTheDocument();

    const bubble = container.querySelector(".flex-1");
    expect(bubble).toBeInTheDocument();
  });

  it("matches snapshot for visual regression protection", () => {
    const { container } = render(<ChatThinkingIndicator />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("has data-testid attribute for E2E testing", () => {
    render(<ChatThinkingIndicator />);
    const indicator = screen.getByTestId("chat-thinking-indicator");
    expect(indicator).toBeInTheDocument();
  });
});
