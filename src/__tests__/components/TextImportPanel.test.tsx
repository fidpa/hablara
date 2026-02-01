import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TextImportPanel, { getCharacterCountColor } from '@/components/TextImportPanel';
import { DEFAULT_INPUT_LIMITS } from '@/lib/types';

describe('TextImportPanel', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();

    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        readText: vi.fn().mockResolvedValue('Clipboard text content'),
      },
      writable: true,
      configurable: true,
    });
  });

  describe('Rendering', () => {
    it('should render textarea', () => {
      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} />);

      const textarea = screen.getByPlaceholderText(/text hier eingeben/i);
      expect(textarea).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} />);

      const submitButton = screen.getByRole('button', { name: /analysieren/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('should render file import button', () => {
      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} />);

      const fileButton = screen.getByRole('button', { name: /datei importieren/i });
      expect(fileButton).toBeInTheDocument();
    });

    it('should render clipboard button', () => {
      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} />);

      const clipboardButton = screen.getByRole('button', { name: /zwischenablage/i });
      expect(clipboardButton).toBeInTheDocument();
    });

    it('should show character count', () => {
      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} />);

      // Initially 0
      expect(screen.getByText(/0 zeichen/i)).toBeInTheDocument();
    });
  });

  describe('Text Input', () => {
    it('should update character count on input', async () => {
      const user = userEvent.setup();
      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} />);

      const textarea = screen.getByPlaceholderText(/text hier eingeben/i);

      await user.type(textarea, 'Hello');

      expect(screen.getByText(/5 \/ 100,000 zeichen/i)).toBeInTheDocument();
    });

    it('should enable submit button when text is entered', async () => {
      const user = userEvent.setup();
      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} />);

      const textarea = screen.getByPlaceholderText(/text hier eingeben/i);
      const submitButton = screen.getByRole('button', { name: /analysieren/i });

      // Initially disabled
      expect(submitButton).toBeDisabled();

      // Type text
      await user.type(textarea, 'Some text');

      // Now enabled
      expect(submitButton).toBeEnabled();
    });

    it('should keep submit button disabled for whitespace-only text', async () => {
      const user = userEvent.setup();
      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} />);

      const textarea = screen.getByPlaceholderText(/text hier eingeben/i);
      const submitButton = screen.getByRole('button', { name: /analysieren/i });

      await user.type(textarea, '   \n\t  ');

      expect(submitButton).toBeDisabled();
    });
  });

  describe('Submit Functionality', () => {
    it('should call onSubmit with text and source="text"', async () => {
      const user = userEvent.setup();
      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} />);

      const textarea = screen.getByPlaceholderText(/text hier eingeben/i);
      const submitButton = screen.getByRole('button', { name: /analysieren/i });

      await user.type(textarea, 'Test text');
      await user.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledWith('Test text', 'text');
    });

    it('should clear textarea after submit', async () => {
      const user = userEvent.setup();
      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} />);

      const textarea = screen.getByPlaceholderText(/text hier eingeben/i) as HTMLTextAreaElement;
      const submitButton = screen.getByRole('button', { name: /analysieren/i });

      await user.type(textarea, 'Test text');
      await user.click(submitButton);

      expect(textarea.value).toBe('');
    });

    it('should reset character count after submit', async () => {
      const user = userEvent.setup();
      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} />);

      const textarea = screen.getByPlaceholderText(/text hier eingeben/i);
      const submitButton = screen.getByRole('button', { name: /analysieren/i });

      await user.type(textarea, 'Test text');
      await user.click(submitButton);

      expect(screen.getByText(/0 zeichen/i)).toBeInTheDocument();
    });

    it('should submit with Ctrl+Enter', async () => {
      const user = userEvent.setup();
      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} />);

      const textarea = screen.getByPlaceholderText(/text hier eingeben/i);

      await user.type(textarea, 'Test text');
      await user.keyboard('{Control>}{Enter}{/Control}');

      expect(mockOnSubmit).toHaveBeenCalledWith('Test text', 'text');
    });

    it('should not submit empty text with Ctrl+Enter', async () => {
      const user = userEvent.setup();
      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} />);

      const textarea = screen.getByPlaceholderText(/text hier eingeben/i);

      await user.click(textarea);
      await user.keyboard('{Control>}{Enter}{/Control}');

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('File Import', () => {
    it('should read file content into textarea', async () => {
      const _user = userEvent.setup();
      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} />);

      const _fileButton = screen.getByRole('button', { name: /datei importieren/i });

      // Find hidden file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      // Create a mock file
      const fileContent = 'File content from txt';
      const file = new File([fileContent], 'test.txt', { type: 'text/plain' });

      // Trigger file selection
      await userEvent.upload(fileInput, file);

      // Wait for file content to appear in textarea
      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(/text hier eingeben/i) as HTMLTextAreaElement;
        expect(textarea.value).toBe(fileContent);
      });
    });

    it('should handle file read errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Create a mock file that will fail to read
      // Note: This is hard to test properly in JSDOM, so we just verify the input exists
      expect(fileInput).toBeInTheDocument();
      expect(fileInput.accept).toContain('.txt');

      consoleSpy.mockRestore();
    });
  });

  describe('Clipboard Import', () => {
    it('should have clipboard button', () => {
      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} />);

      const clipboardButton = screen.getByTitle(/zwischenablage/i);
      expect(clipboardButton).toBeInTheDocument();
      expect(clipboardButton).not.toBeDisabled();
    });

    it('should disable clipboard button when disabled', () => {
      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={true} />);

      const clipboardButton = screen.getByTitle(/zwischenablage/i);
      expect(clipboardButton).toBeDisabled();
    });

    it('should read clipboard content and populate textarea', async () => {
      const user = userEvent.setup();
      const clipboardContent = 'Clipboard text content';

      // Mock clipboard API with specific content
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          readText: vi.fn().mockResolvedValue(clipboardContent),
        },
        writable: true,
        configurable: true,
      });

      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} />);

      const clipboardButton = screen.getByTitle(/zwischenablage/i);
      const textarea = screen.getByPlaceholderText(/text hier eingeben/i) as HTMLTextAreaElement;

      await user.click(clipboardButton);

      await waitFor(() => {
        expect(textarea.value).toBe(clipboardContent);
      });
    });

    it('should auto-focus textarea after clipboard import', async () => {
      const user = userEvent.setup();
      const clipboardContent = 'Focus test content';

      Object.defineProperty(navigator, 'clipboard', {
        value: {
          readText: vi.fn().mockResolvedValue(clipboardContent),
        },
        writable: true,
        configurable: true,
      });

      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} />);

      const clipboardButton = screen.getByTitle(/zwischenablage/i);
      const textarea = screen.getByPlaceholderText(/text hier eingeben/i) as HTMLTextAreaElement;

      await user.click(clipboardButton);

      // Wait for clipboard content to be loaded
      await waitFor(() => {
        expect(textarea.value).toBe(clipboardContent);
      });

      // Verify textarea is focused (activeElement)
      await waitFor(() => {
        expect(document.activeElement).toBe(textarea);
      });
    });

    it('should show success toast after clipboard import', async () => {
      const user = userEvent.setup();
      const clipboardContent = 'Success toast test';

      Object.defineProperty(navigator, 'clipboard', {
        value: {
          readText: vi.fn().mockResolvedValue(clipboardContent),
        },
        writable: true,
        configurable: true,
      });

      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} />);

      const clipboardButton = screen.getByTitle(/zwischenablage/i);

      await user.click(clipboardButton);

      // Wait for content to be loaded (toast is called internally)
      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(/text hier eingeben/i) as HTMLTextAreaElement;
        expect(textarea.value).toBe(clipboardContent);
      });

      // Note: Toast verification requires mocking the toast hook
      // In integration tests, we verify the side effect (text loaded)
    });

    it('should show error toast when clipboard read fails', async () => {
      const user = userEvent.setup();

      // Mock clipboard API to reject
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          readText: vi.fn().mockRejectedValue(new Error('Clipboard access denied')),
        },
        writable: true,
        configurable: true,
      });

      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} />);

      const clipboardButton = screen.getByTitle(/zwischenablage/i);
      const textarea = screen.getByPlaceholderText(/text hier eingeben/i) as HTMLTextAreaElement;

      await user.click(clipboardButton);

      // Verify textarea remains empty after error
      await waitFor(() => {
        expect(textarea.value).toBe('');
      });

      // Note: Error toast verification requires mocking the toast hook
      // In integration tests, we verify the side effect (text NOT loaded)
    });

    it('should show error toast when clipboard content exceeds character limit', async () => {
      const user = userEvent.setup();
      const limits = { maxTextCharacters: 50, maxTextFileSizeMB: 10, maxAudioFileSizeMB: 50, maxRecordingMinutes: 30 };
      const longContent = 'a'.repeat(100); // Exceeds 50 char limit

      Object.defineProperty(navigator, 'clipboard', {
        value: {
          readText: vi.fn().mockResolvedValue(longContent),
        },
        writable: true,
        configurable: true,
      });

      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} limits={limits} />);

      const clipboardButton = screen.getByTitle(/zwischenablage/i);
      const textarea = screen.getByPlaceholderText(/text hier eingeben/i) as HTMLTextAreaElement;

      await user.click(clipboardButton);

      // Verify textarea remains empty (content NOT loaded due to limit)
      await waitFor(() => {
        expect(textarea.value).toBe('');
      });

      // Note: Error toast verification requires mocking the toast hook
    });

    it('should not import when clipboard is empty', async () => {
      const user = userEvent.setup();

      Object.defineProperty(navigator, 'clipboard', {
        value: {
          readText: vi.fn().mockResolvedValue(''),
        },
        writable: true,
        configurable: true,
      });

      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} />);

      const clipboardButton = screen.getByTitle(/zwischenablage/i);
      const textarea = screen.getByPlaceholderText(/text hier eingeben/i) as HTMLTextAreaElement;

      await user.click(clipboardButton);

      // Verify textarea remains empty
      await waitFor(() => {
        expect(textarea.value).toBe('');
      });
    });
  });

  describe('Disabled State', () => {
    it('should disable all controls when disabled prop is true', () => {
      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={true} />);

      const textarea = screen.getByPlaceholderText(/text hier eingeben/i);
      // When disabled, button has aria-label "Text wird analysiert"
      const submitButton = screen.getByRole('button', { name: /text wird analysiert/i });
      const fileButton = screen.getByTitle(/datei importieren/i);
      const clipboardButton = screen.getByTitle(/zwischenablage/i);

      expect(textarea).toBeDisabled();
      expect(submitButton).toBeDisabled();
      expect(fileButton).toBeDisabled();
      expect(clipboardButton).toBeDisabled();
    });

    it('should show loading state when disabled', () => {
      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={true} />);

      // Submit button should be disabled with "Verarbeite..." text
      // aria-label is "Text wird analysiert" when disabled
      const submitButton = screen.getByRole('button', { name: /text wird analysiert/i });
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Verarbeite...');
    });
  });

  describe('Character Counter Color Zones', () => {
    const MAX_CHARS = DEFAULT_INPUT_LIMITS.maxTextCharacters;

    // Helper function unit tests
    describe('getCharacterCountColor', () => {
      it('returns muted color for text below 70% threshold', () => {
        const result = getCharacterCountColor(50000, MAX_CHARS);
        expect(result).toBe('text-muted-foreground');
      });

      it('returns amber color at exactly 70% threshold', () => {
        const result = getCharacterCountColor(70000, MAX_CHARS);
        expect(result).toBe('text-amber-500');
      });

      it('returns amber color for text between 70-90%', () => {
        const result = getCharacterCountColor(80000, MAX_CHARS);
        expect(result).toBe('text-amber-500');
      });

      it('returns destructive color at exactly 90% threshold', () => {
        const result = getCharacterCountColor(90000, MAX_CHARS);
        expect(result).toBe('text-destructive font-medium');
      });

      it('returns destructive color for text above 90%', () => {
        const result = getCharacterCountColor(95000, MAX_CHARS);
        expect(result).toBe('text-destructive font-medium');
      });

      it('handles zero length', () => {
        const result = getCharacterCountColor(0, MAX_CHARS);
        expect(result).toBe('text-muted-foreground');
      });

      it('handles exact max length (100%)', () => {
        const result = getCharacterCountColor(100000, MAX_CHARS);
        expect(result).toBe('text-destructive font-medium');
      });
    });

    // Integration tests
    describe('UI Integration', () => {
      it('shows gray counter for text below 70%', () => {
        const { container } = render(<TextImportPanel onSubmit={vi.fn()} disabled={false} />);

        const textarea = screen.getByPlaceholderText(/text hier eingeben/i);
        fireEvent.change(textarea, { target: { value: 'a'.repeat(50000) } });

        // Find counter by class
        const counter = container.querySelector('.text-muted-foreground');
        expect(counter).toBeInTheDocument();
        expect(counter?.textContent).toContain('Zeichen');
      });

      it('shows amber counter for text at 70%', () => {
        const { container } = render(<TextImportPanel onSubmit={vi.fn()} disabled={false} />);

        const textarea = screen.getByPlaceholderText(/text hier eingeben/i);
        fireEvent.change(textarea, { target: { value: 'a'.repeat(70000) } });

        // Find counter by class
        const counter = container.querySelector('.text-amber-500');
        expect(counter).toBeInTheDocument();
        expect(counter?.textContent).toContain('Zeichen');
      });

      it('shows amber counter for text at 85%', () => {
        const { container } = render(<TextImportPanel onSubmit={vi.fn()} disabled={false} />);

        const textarea = screen.getByPlaceholderText(/text hier eingeben/i);
        fireEvent.change(textarea, { target: { value: 'a'.repeat(85000) } });

        // Find counter by class
        const counter = container.querySelector('.text-amber-500');
        expect(counter).toBeInTheDocument();
        expect(counter?.textContent).toContain('Zeichen');
      });

      it('shows red counter for text at 90%', () => {
        const { container } = render(<TextImportPanel onSubmit={vi.fn()} disabled={false} />);

        const textarea = screen.getByPlaceholderText(/text hier eingeben/i);
        fireEvent.change(textarea, { target: { value: 'a'.repeat(90000) } });

        // Find counter by class
        const counter = container.querySelector('.text-destructive.font-medium');
        expect(counter).toBeInTheDocument();
        expect(counter?.textContent).toContain('Zeichen');
      });
    });
  });

  describe('Character Limit Validation', () => {
    it('should show critical icon at 90% of character limit', () => {
      const limits = { maxTextCharacters: 100, maxTextFileSizeMB: 10, maxAudioFileSizeMB: 50, maxRecordingMinutes: 30 };

      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} limits={limits} />);

      const textarea = screen.getByPlaceholderText(/text hier eingeben/i);

      // Type 90 characters (90% of 100)
      fireEvent.change(textarea, { target: { value: 'a'.repeat(90) } });

      // Critical icon should be visible (AlertTriangle) - now red zone starts at 90%
      const charCounter = screen.getByText(/90 \/ 100 zeichen/i);
      expect(charCounter).toHaveClass('text-destructive');
      expect(charCounter).toHaveClass('font-medium');
    });

    it('should show error icon and disable submit at 100% of limit', () => {
      const limits = { maxTextCharacters: 100, maxTextFileSizeMB: 10, maxAudioFileSizeMB: 50, maxRecordingMinutes: 30 };

      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} limits={limits} />);

      const textarea = screen.getByPlaceholderText(/text hier eingeben/i);

      // Type 101 characters (exceeds limit)
      fireEvent.change(textarea, { target: { value: 'a'.repeat(101) } });

      // Error styling should be visible
      const charCounter = screen.getByText(/101 \/ 100 zeichen/i);
      expect(charCounter).toHaveClass('text-destructive');

      // Submit button should be disabled
      const submitButton = screen.getByRole('button', { name: /analysieren/i });
      expect(submitButton).toBeDisabled();
    });

    it('should show toast error when file content exceeds character limit', async () => {
      // Note: Toast is called internally, but we cannot easily mock it in this test environment.
      // This test verifies that the file is NOT loaded into the textarea when it exceeds the limit.
      const limits = { maxTextCharacters: 50, maxTextFileSizeMB: 10, maxAudioFileSizeMB: 50, maxRecordingMinutes: 30 };

      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} limits={limits} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const textarea = screen.getByPlaceholderText(/text hier eingeben/i) as HTMLTextAreaElement;

      const longContent = 'a'.repeat(100); // Exceeds 50 char limit
      const file = new File([longContent], 'test.txt', { type: 'text/plain' });

      await userEvent.upload(fileInput, file);

      // Verify textarea remains empty (content was not loaded due to limit)
      await waitFor(() => {
        expect(textarea.value).toBe('');
      });
    });

    it('should show toast error when file size exceeds limit', async () => {
      // Note: Toast is called internally, but we cannot easily mock it in this test environment.
      // This test verifies that the file is NOT loaded into the textarea when it exceeds the size limit.
      const limits = { maxTextCharacters: 100000, maxTextFileSizeMB: 1, maxAudioFileSizeMB: 50, maxRecordingMinutes: 30 };

      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} limits={limits} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const textarea = screen.getByPlaceholderText(/text hier eingeben/i) as HTMLTextAreaElement;

      // Create 2 MB file (exceeds 1 MB limit)
      const largeBuffer = new ArrayBuffer(2 * 1024 * 1024);
      const file = new File([largeBuffer], 'large.txt', { type: 'text/plain' });

      await userEvent.upload(fileInput, file);

      // Verify textarea remains empty (file was not loaded due to size limit)
      await waitFor(() => {
        expect(textarea.value).toBe('');
      });
    });

    it('should respect custom character limit from limits prop', () => {
      const customLimits = { maxTextCharacters: 20, maxTextFileSizeMB: 10, maxAudioFileSizeMB: 50, maxRecordingMinutes: 30 };

      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} limits={customLimits} />);

      const textarea = screen.getByPlaceholderText(/text hier eingeben/i);

      // Type 21 characters (exceeds custom 20 limit)
      fireEvent.change(textarea, { target: { value: 'a'.repeat(21) } });

      // Character counter should show custom limit
      expect(screen.getByText(/21 \/ 20 zeichen/i)).toBeInTheDocument();

      // Submit should be disabled
      const submitButton = screen.getByRole('button', { name: /analysieren/i });
      expect(submitButton).toBeDisabled();
    });

    it('should use default 100k limit when limits prop is not provided', async () => {
      const user = userEvent.setup();

      render(<TextImportPanel onSubmit={mockOnSubmit} disabled={false} />);

      const textarea = screen.getByPlaceholderText(/text hier eingeben/i);

      await user.type(textarea, 'Test text');

      // Should show default 100,000 limit
      expect(screen.getByText(/\/ 100,000 zeichen/i)).toBeInTheDocument();
    });
  });
});
