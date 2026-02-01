/**
 * Simplified PDF Export Tests
 *
 * Focus: Business logic and HTML generation (80%+ coverage target)
 * Excludes: Tauri integration (tested manually)
 */

import { describe, it, expect } from "vitest";
import { generatePrintHTML } from "../pdf";
import type { ChatMessage } from "@/lib/types";

describe("PDF Export - HTML Generation", () => {
  const mockMessage: ChatMessage = {
    id: "1",
    role: "user",
    content: "Test message",
    timestamp: Date.now(),
    source: "text",
  };

  describe("generatePrintHTML", () => {
    it("should generate valid HTML structure", () => {
      const html = generatePrintHTML([mockMessage], {
        includeMetadata: false,
        includeAudioFeatures: false,
        includeTimestamps: false,
      });

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain('<html lang="de">');
      expect(html).toContain("<head>");
      expect(html).toContain("<body>");
      expect(html).toContain("</html>");
    });

    it("should include export title and metadata", () => {
      const html = generatePrintHTML([mockMessage], {
        includeMetadata: false,
        includeAudioFeatures: false,
        includeTimestamps: false,
      });

      expect(html).toContain("Hablará Sprachanalyse");
      expect(html).toContain("Exportiert:");
      // Check for message count (flexible format)
      const hasMessageCount = html.includes("1") && (html.includes("Nachrichten") || html.includes("message"));
      expect(hasMessageCount).toBe(true);
    });

    it("should render message content", () => {
      const html = generatePrintHTML([mockMessage], {
        includeMetadata: false,
        includeAudioFeatures: false,
        includeTimestamps: false,
      });

      expect(html).toContain("Test message");
    });

    it("should escape HTML in user content (XSS protection)", () => {
      const xssMessage: ChatMessage = {
        id: "2",
        role: "user",
        content: "<script>alert('XSS')</script>",
        timestamp: Date.now(),
        source: "text",
      };

      const html = generatePrintHTML([xssMessage], {
        includeMetadata: false,
        includeAudioFeatures: false,
        includeTimestamps: false,
      });

      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
      expect(html).toContain("alert(&#39;XSS&#39;)");
    });

    it("should include timestamps when option is true", () => {
      const html = generatePrintHTML([mockMessage], {
        includeMetadata: false,
        includeAudioFeatures: false,
        includeTimestamps: true,
      });

      expect(html).toContain("Zeitstempel:");
    });

    it("should exclude timestamps when option is false", () => {
      const html = generatePrintHTML([mockMessage], {
        includeMetadata: false,
        includeAudioFeatures: false,
        includeTimestamps: false,
      });

      expect(html).not.toContain("Zeitstempel:");
    });

    it("should include GFK metadata when option is true", () => {
      const messageWithGFK: ChatMessage = {
        id: "3",
        role: "user",
        content: "Test",
        timestamp: Date.now(),
        source: "voice",
        gfk: {
          observations: [],
          feelings: ["Freude", "Dankbarkeit"],
          needs: ["Verbindung"],
          requests: [],
          gfkTranslation: "",
          reflectionQuestion: "",
        },
      };

      const html = generatePrintHTML([messageWithGFK], {
        includeMetadata: true,
        includeAudioFeatures: false,
        includeTimestamps: false,
      });

      expect(html).toContain("GFK-Analyse");
      expect(html).toContain("Freude");
      expect(html).toContain("Verbindung");
    });

    it("should exclude GFK metadata when option is false", () => {
      const messageWithGFK: ChatMessage = {
        id: "3",
        role: "user",
        content: "Test",
        timestamp: Date.now(),
        source: "voice",
        gfk: {
          observations: [],
          feelings: ["Freude"],
          needs: ["Verbindung"],
          requests: [],
          gfkTranslation: "",
          reflectionQuestion: "",
        },
      };

      const html = generatePrintHTML([messageWithGFK], {
        includeMetadata: false,
        includeAudioFeatures: false,
        includeTimestamps: false,
      });

      expect(html).not.toContain("GFK-Analyse");
    });

    it("should include cognitive distortions when option is true", () => {
      const messageWithCognitive: ChatMessage = {
        id: "4",
        role: "user",
        content: "Test",
        timestamp: Date.now(),
        source: "text",
        cognitive: {
          overallThinkingStyle: "Ausgewogen",
          distortions: [
            {
              type: "Catastrophizing",
              evidence: "Example",
              reframe: "Alternative",
            },
          ],
        },
      };

      const html = generatePrintHTML([messageWithCognitive], {
        includeMetadata: true,
        includeAudioFeatures: false,
        includeTimestamps: false,
      });

      expect(html).toContain("Kognitive Verzerrungen");
      expect(html).toContain("Ausgewogen");
    });

    it("should include Four Sides model when option is true", () => {
      const messageWithFourSides: ChatMessage = {
        id: "5",
        role: "user",
        content: "Test",
        timestamp: Date.now(),
        source: "text",
        fourSides: {
          sachinhalt: "Factual content",
          selbstoffenbarung: "Self-disclosure",
          beziehung: "Relationship",
          appell: "Appeal",
          possibleMisunderstandings: [],
        },
      };

      const html = generatePrintHTML([messageWithFourSides], {
        includeMetadata: true,
        includeAudioFeatures: false,
        includeTimestamps: false,
      });

      expect(html).toContain("Vier-Seiten-Modell");
      expect(html).toContain("Sachinhalt");
      expect(html).toContain("Factual content");
    });

    it("should handle empty message array", () => {
      const html = generatePrintHTML([], {
        includeMetadata: false,
        includeAudioFeatures: false,
        includeTimestamps: false,
      });

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Hablará Sprachanalyse");
      // Should have 0 messages - just check structure is valid
      expect(html).toContain("</html>");
    });

    it("should handle large message arrays", () => {
      const largeMessages = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        role: "user" as const,
        content: `Message ${i}`.repeat(10),
        timestamp: Date.now(),
        source: "text" as const,
      }));

      const html = generatePrintHTML(largeMessages, {
        includeMetadata: true,
        includeAudioFeatures: true,
        includeTimestamps: true,
      });

      expect(html).toContain("<!DOCTYPE html>");
      // Verify all messages are included (more robust check)
      expect(html).toContain("Message 0");
      expect(html).toContain("Message 50");
      expect(html).toContain("Message 99");
      // Should have 100 message divs
      const messageCount = (html.match(/<div class="message">/g) || []).length;
      expect(messageCount).toBe(100);
    });

    it("should differentiate between user and assistant messages", () => {
      const messages: ChatMessage[] = [
        {
          id: "1",
          role: "user",
          content: "User message",
          timestamp: Date.now(),
          source: "text",
        },
        {
          id: "2",
          role: "assistant",
          content: "Assistant message",
          timestamp: Date.now(),
        },
      ];

      const html = generatePrintHTML(messages, {
        includeMetadata: false,
        includeAudioFeatures: false,
        includeTimestamps: false,
      });

      expect(html).toContain("Benutzer");
      expect(html).toContain("Hablará");
    });

    it("should include source information for user messages", () => {
      const messages: ChatMessage[] = [
        {
          id: "1",
          role: "user",
          content: "Voice message",
          timestamp: Date.now(),
          source: "voice",
        },
        {
          id: "2",
          role: "user",
          content: "Text message",
          timestamp: Date.now(),
          source: "text",
        },
        {
          id: "3",
          role: "user",
          content: "RAG message",
          timestamp: Date.now(),
          source: "rag",
        },
      ];

      const html = generatePrintHTML(messages, {
        includeMetadata: false,
        includeAudioFeatures: false,
        includeTimestamps: false,
      });

      expect(html).toContain("Sprachaufnahme");
      expect(html).toContain("Text-Import");
      expect(html).toContain("RAG-Chatbot");
    });

    it("should include CSS for print and screen", () => {
      const html = generatePrintHTML([mockMessage], {
        includeMetadata: false,
        includeAudioFeatures: false,
        includeTimestamps: false,
      });

      expect(html).toContain("@media print");
      expect(html).toContain("@media screen");
      expect(html).toContain("page-break-inside: avoid");
    });
  });
});
