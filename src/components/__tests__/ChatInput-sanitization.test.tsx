/**
 * Unit tests for ChatInput sanitization logic
 *
 * Tests OWASP A03:2021 (Injection) defenses in chat input
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChatInput, CHAT_INPUT_CONSTANTS } from "../ChatInput";

describe("ChatInput - Sanitization", () => {
  describe("Empty String After Sanitization", () => {
    it("should not call onSend when input is only control characters", async () => {
      const onSendMock = vi.fn();
      render(<ChatInput onSend={onSendMock} />);

      const textarea = screen.getByRole("textbox");
      const sendButton = screen.getByRole("button", { name: /nachricht senden/i });

      // Input only control characters (will be removed by sanitizeInput)
      fireEvent.change(textarea, { target: { value: "\x00\x01\x02\x1F\x7F" } });

      // Try to send
      fireEvent.click(sendButton);

      // onSend should NOT be called (empty after sanitization)
      await waitFor(() => {
        expect(onSendMock).not.toHaveBeenCalled();
      });
    });

    it("should not call onSend when input is only whitespace", async () => {
      const onSendMock = vi.fn();
      render(<ChatInput onSend={onSendMock} />);

      const textarea = screen.getByRole("textbox");
      const sendButton = screen.getByRole("button", { name: /nachricht senden/i });

      // Input only whitespace
      fireEvent.change(textarea, { target: { value: "   \t\n   " } });

      // Try to send
      fireEvent.click(sendButton);

      // onSend should NOT be called (trim() returns empty)
      await waitFor(() => {
        expect(onSendMock).not.toHaveBeenCalled();
      });
    });

    it("should call onSend when input has valid text after sanitization", async () => {
      const onSendMock = vi.fn();
      render(<ChatInput onSend={onSendMock} />);

      const textarea = screen.getByRole("textbox");
      const sendButton = screen.getByRole("button", { name: /nachricht senden/i });

      // Input with control characters + valid text
      fireEvent.change(textarea, { target: { value: "Hello\x00World" } });

      // Send
      fireEvent.click(sendButton);

      // onSend should be called with sanitized text (control chars removed)
      await waitFor(() => {
        expect(onSendMock).toHaveBeenCalledWith("HelloWorld");
      });
    });

    it("should clear input after successful send", async () => {
      const onSendMock = vi.fn().mockResolvedValue(undefined);
      render(<ChatInput onSend={onSendMock} />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      const sendButton = screen.getByRole("button", { name: /nachricht senden/i });

      // Input valid text
      fireEvent.change(textarea, { target: { value: "Test message" } });

      // Send
      fireEvent.click(sendButton);

      // Wait for async send to complete
      await waitFor(() => {
        expect(onSendMock).toHaveBeenCalledWith("Test message");
      });

      // Input should be cleared
      await waitFor(() => {
        expect(textarea.value).toBe("");
      });
    });

    it("should preserve input on send error for retry", async () => {
      const onSendMock = vi.fn().mockRejectedValue(new Error("Network error"));
      render(<ChatInput onSend={onSendMock} />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      const sendButton = screen.getByRole("button", { name: /nachricht senden/i });

      // Input valid text
      fireEvent.change(textarea, { target: { value: "Test message" } });

      // Send (will fail)
      fireEvent.click(sendButton);

      // Wait for async send to fail
      await waitFor(() => {
        expect(onSendMock).toHaveBeenCalledWith("Test message");
      });

      // Input should be PRESERVED (not cleared) for retry
      await waitFor(() => {
        expect(textarea.value).toBe("Test message");
      });
    });
  });

  describe("Length Limit", () => {
    it("should enforce maxLength attribute", () => {
      render(<ChatInput />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

      // Verify maxLength attribute matches constant (Dynamic Values Pattern)
      expect(textarea.maxLength).toBe(CHAT_INPUT_CONSTANTS.MAX_LENGTH);
    });
  });
});
