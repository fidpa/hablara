import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChatInput } from "@/components/ChatInput";
import { vi } from "vitest";

describe("ChatInput", () => {
  it("should render with placeholder", () => {
    render(<ChatInput placeholder="Test placeholder" />);
    expect(screen.getByPlaceholderText("Test placeholder")).toBeInTheDocument();
  });

  it("should clear input after successful send", async () => {
    const onSend = vi.fn(() => Promise.resolve());
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByPlaceholderText("Frage mich etwas...");
    fireEvent.change(input, { target: { value: "Test message" } });

    const sendButton = screen.getByLabelText("Nachricht senden");
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(onSend).toHaveBeenCalledWith("Test message");
      expect(input).toHaveValue("");
    });
  });

  it("should preserve input on send failure (P0-1 Fix)", async () => {
    const onSend = vi.fn(() => Promise.reject(new Error("RAG failed")));
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByPlaceholderText("Frage mich etwas...");
    fireEvent.change(input, { target: { value: "Important question" } });

    const sendButton = screen.getByLabelText("Nachricht senden");
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(onSend).toHaveBeenCalledWith("Important question");
    });

    // CRITICAL: Input should still contain original value after error
    expect(input).toHaveValue("Important question");
  });

  it("should trim whitespace before sending", async () => {
    const onSend = vi.fn(() => Promise.resolve());
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByPlaceholderText("Frage mich etwas...");
    fireEvent.change(input, { target: { value: "  Test  " } });

    const sendButton = screen.getByLabelText("Nachricht senden");
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(onSend).toHaveBeenCalledWith("Test");
    });
  });

  it("should not send empty messages", async () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const sendButton = screen.getByLabelText("Nachricht senden");
    fireEvent.click(sendButton);

    expect(onSend).not.toHaveBeenCalled();
  });

  it("should disable input during loading", () => {
    render(<ChatInput isLoading={true} />);
    const input = screen.getByPlaceholderText("Frage mich etwas...");
    expect(input).toBeDisabled();
  });

  it("should send on Enter key (not Shift+Enter)", async () => {
    const onSend = vi.fn(() => Promise.resolve());
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByPlaceholderText("Frage mich etwas...");
    fireEvent.change(input, { target: { value: "Test" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    await waitFor(() => {
      expect(onSend).toHaveBeenCalledWith("Test");
    });
  });

  it("should not send on Shift+Enter", async () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByPlaceholderText("Frage mich etwas...");
    fireEvent.change(input, { target: { value: "Test" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });

    expect(onSend).not.toHaveBeenCalled();
  });
});
