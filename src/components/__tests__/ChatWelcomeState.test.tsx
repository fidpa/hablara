import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatWelcomeState } from '../ChatWelcomeState';
import { WELCOME_PROMPTS } from '@/lib/types';

describe('ChatWelcomeState', () => {
  it('should render welcome heading and description', () => {
    render(<ChatWelcomeState />);

    expect(screen.getByText('Willkommen bei Hablará')).toBeInTheDocument();
    expect(screen.getByText('Sprich oder tippe – deine Eingabe wird analysiert')).toBeInTheDocument();
  });

  it('should render all 4 feature cards', () => {
    render(<ChatWelcomeState />);

    expect(screen.getByText('Emotionen erkennen')).toBeInTheDocument();
    expect(screen.getByText('Fehlschlüsse aufdecken')).toBeInTheDocument();
    expect(screen.getByText('Kommunikation verstehen')).toBeInTheDocument();
    expect(screen.getByText('Fragen beantworten')).toBeInTheDocument();
  });

  it('should display correct badges', () => {
    render(<ChatWelcomeState />);

    // Updated badges after ChatWelcomeState redesign
    expect(screen.getByText('Multi-Modal')).toBeInTheDocument();
    expect(screen.getByText('CEG-Prompting')).toBeInTheDocument();
    expect(screen.getByText('3 Modelle')).toBeInTheDocument();
    expect(screen.getByText('Offline-fähig')).toBeInTheDocument();
  });

  it('should display default keyboard hint', () => {
    const { container } = render(<ChatWelcomeState />);

    expect(screen.getByText(/Starte mit/i)).toBeInTheDocument();
    expect(screen.getByText(/oder tippe unten/i)).toBeInTheDocument();
    const kbd = container.querySelector('kbd');
    expect(kbd).toHaveTextContent('Ctrl+Shift+D');
  });

  it('should display custom hotkey when provided', () => {
    const { container } = render(<ChatWelcomeState hotkey="Alt+R" />);

    const kbd = container.querySelector('kbd');
    expect(kbd).toHaveTextContent('Alt+R');
  });

  it('should have accessible icons with aria-hidden', () => {
    const { container } = render(<ChatWelcomeState />);

    const icons = container.querySelectorAll('svg[aria-hidden="true"]');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('should have semantic heading hierarchy', () => {
    render(<ChatWelcomeState />);

    const mainHeading = screen.getByRole('heading', { level: 2, name: 'Willkommen bei Hablará' });
    expect(mainHeading).toBeInTheDocument();
  });

  it('should match snapshot', () => {
    const { container } = render(<ChatWelcomeState />);
    expect(container.firstChild).toMatchSnapshot();
  });

  describe('Feature Card Details', () => {
    it('should display emotion analysis card with correct content', () => {
      render(<ChatWelcomeState />);

      expect(screen.getByText('Emotionen erkennen')).toBeInTheDocument();
      expect(screen.getByText('10 Emotionen via Audio + Text Dual-Track Analyse')).toBeInTheDocument();
    });

    it('should display fallacy detection card with correct content', () => {
      render(<ChatWelcomeState />);

      expect(screen.getByText('Fehlschlüsse aufdecken')).toBeInTheDocument();
      expect(screen.getByText('16 logische Argumentationsfehler erkennen')).toBeInTheDocument();
    });

    it('should display psychological enrichment card with correct content', () => {
      render(<ChatWelcomeState />);

      expect(screen.getByText('Kommunikation verstehen')).toBeInTheDocument();
      expect(screen.getByText('GFK, Kognitive Muster, Vier-Seiten-Modell')).toBeInTheDocument();
    });

    it('should display RAG chatbot card with correct content', () => {
      render(<ChatWelcomeState />);

      expect(screen.getByText('Fragen beantworten')).toBeInTheDocument();
      expect(screen.getByText('78 Chunks Wissensbasis über meine Funktionen')).toBeInTheDocument();
    });
  });

  describe('Sample Prompts (P1-2: Chat Welcome State)', () => {
    it('should not display sample prompts when onSamplePromptClick is not provided', () => {
      render(<ChatWelcomeState />);

      expect(screen.queryByText('Oder probiere eine dieser Beispielfragen:')).not.toBeInTheDocument();
      WELCOME_PROMPTS.forEach((prompt) => {
        expect(screen.queryByText(prompt)).not.toBeInTheDocument();
      });
    });

    it('should display sample prompts when onSamplePromptClick is provided', () => {
      const handleClick = vi.fn();
      render(<ChatWelcomeState onSamplePromptClick={handleClick} />);

      expect(screen.getByText('Oder probiere eine dieser Beispielfragen:')).toBeInTheDocument();
      WELCOME_PROMPTS.forEach((prompt) => {
        expect(screen.getByText(prompt)).toBeInTheDocument();
      });
    });

    it('should call onSamplePromptClick when sample button is clicked', () => {
      const handleClick = vi.fn();
      render(<ChatWelcomeState onSamplePromptClick={handleClick} />);

      const firstPrompt = WELCOME_PROMPTS[0];
      const button = screen.getByRole('button', { name: `Beispielfrage: ${firstPrompt}` });
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledWith(firstPrompt);
    });

    it('should render all 3 sample prompts as buttons', () => {
      const handleClick = vi.fn();
      render(<ChatWelcomeState onSamplePromptClick={handleClick} />);

      const buttons = screen.getAllByRole('button').filter((btn) =>
        btn.getAttribute('aria-label')?.startsWith('Beispielfrage:')
      );
      expect(buttons).toHaveLength(3);
    });

    it('should have accessible aria-labels for sample buttons', () => {
      const handleClick = vi.fn();
      render(<ChatWelcomeState onSamplePromptClick={handleClick} />);

      WELCOME_PROMPTS.forEach((prompt) => {
        const button = screen.getByRole('button', { name: `Beispielfrage: ${prompt}` });
        expect(button).toBeInTheDocument();
      });
    });
  });
});
