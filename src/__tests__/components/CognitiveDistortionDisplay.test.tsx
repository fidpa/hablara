import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CognitiveDistortionDisplay } from '@/components/CognitiveDistortionDisplay';
import type { CognitiveDistortionResult, CognitiveDistortionType } from '@/lib/types';

describe('CognitiveDistortionDisplay', () => {
  it('should render thinking style badge for balanced thinking', () => {
    const mockCognitive: CognitiveDistortionResult = {
      distortions: [],
      overallThinkingStyle: 'balanced',
    };

    render(<CognitiveDistortionDisplay cognitive={mockCognitive} />);

    expect(screen.getByText('Kognitive Verzerrungen')).toBeInTheDocument();
    expect(screen.getByText('Ausgewogen')).toBeInTheDocument();
    expect(screen.getByText('Keine kognitiven Verzerrungen erkannt')).toBeInTheDocument();
  });

  it('should render thinking style badge for somewhat distorted thinking', () => {
    const mockCognitive: CognitiveDistortionResult = {
      distortions: [
        {
          type: 'all_or_nothing',
          quote: 'Ich mache immer alles falsch',
          explanation: 'Schwarz-Weiß-Denken ohne Graustufen',
          reframe: 'Manchmal mache ich Fehler, manchmal nicht',
        },
      ],
      overallThinkingStyle: 'somewhat_distorted',
    };

    render(<CognitiveDistortionDisplay cognitive={mockCognitive} />);

    expect(screen.getByText('Leicht verzerrt')).toBeInTheDocument();
  });

  it('should render thinking style badge for highly distorted thinking', () => {
    const mockCognitive: CognitiveDistortionResult = {
      distortions: [
        {
          type: 'catastrophizing',
          quote: 'Alles wird scheitern',
          explanation: 'Katastrophisierung',
          reframe: 'Einige Dinge könnten schiefgehen',
        },
      ],
      overallThinkingStyle: 'highly_distorted',
    };

    render(<CognitiveDistortionDisplay cognitive={mockCognitive} />);

    expect(screen.getByText('Stark verzerrt')).toBeInTheDocument();
  });

  it('should render distortion cards with all fields', () => {
    const mockCognitive: CognitiveDistortionResult = {
      distortions: [
        {
          type: 'all_or_nothing',
          quote: 'Ich mache immer alles falsch',
          explanation: 'Dies ist Schwarz-Weiß-Denken',
          reframe: 'Manchmal mache ich Fehler, und das ist okay',
        },
      ],
      overallThinkingStyle: 'somewhat_distorted',
    };

    render(<CognitiveDistortionDisplay cognitive={mockCognitive} />);

    // Check distortion type label
    expect(screen.getByText('Schwarz-Weiß-Denken')).toBeInTheDocument();

    // Check quote (component uses HTML entities: &ldquo; &rdquo;)
    expect(screen.getByText(/Ich mache immer alles falsch/)).toBeInTheDocument();

    // Check explanation
    expect(screen.getByText('Dies ist Schwarz-Weiß-Denken')).toBeInTheDocument();

    // Check reframe
    expect(screen.getByText(/Alternative:/)).toBeInTheDocument();
    expect(screen.getByText(/Manchmal mache ich Fehler/)).toBeInTheDocument();
  });

  it('should render multiple distortions', () => {
    const mockCognitive: CognitiveDistortionResult = {
      distortions: [
        {
          type: 'catastrophizing',
          quote: 'Alles wird scheitern',
          explanation: 'Katastrophisierung',
          reframe: 'Einige Dinge könnten schiefgehen',
        },
        {
          type: 'overgeneralization',
          quote: 'Niemand mag mich',
          explanation: 'Übergeneralisierung',
          reframe: 'Einige Menschen mögen mich nicht',
        },
      ],
      overallThinkingStyle: 'highly_distorted',
    };

    render(<CognitiveDistortionDisplay cognitive={mockCognitive} />);

    expect(screen.getByText('Katastrophisieren')).toBeInTheDocument();
    // "Übergeneralisierung" appears in both badge and explanation, use getAllByText
    expect(screen.getAllByText('Übergeneralisierung').length).toBeGreaterThanOrEqual(1);
    // Quotes use HTML entities (&ldquo; &rdquo;), use regex
    expect(screen.getByText(/Alles wird scheitern/)).toBeInTheDocument();
    expect(screen.getByText(/Niemand mag mich/)).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const mockCognitive: CognitiveDistortionResult = {
      distortions: [],
      overallThinkingStyle: 'balanced',
    };

    const { container } = render(
      <CognitiveDistortionDisplay cognitive={mockCognitive} className="custom-class" />
    );

    const element = container.querySelector('.custom-class');
    expect(element).toBeInTheDocument();
  });

  it('should render all 7 cognitive distortion types correctly', () => {
    const allTypes: CognitiveDistortionType[] = [
      'catastrophizing',
      'all_or_nothing',
      'overgeneralization',
      'mind_reading',
      'personalization',
      'emotional_reasoning',
      'should_statements',
    ];

    const mockCognitive: CognitiveDistortionResult = {
      distortions: allTypes.map((type) => ({
        type,
        quote: `Quote for ${type}`,
        explanation: `Explanation for ${type}`,
        reframe: `Reframe for ${type}`,
      })),
      overallThinkingStyle: 'highly_distorted',
    };

    render(<CognitiveDistortionDisplay cognitive={mockCognitive} />);

    expect(screen.getByText('Katastrophisieren')).toBeInTheDocument();
    expect(screen.getByText('Schwarz-Weiß-Denken')).toBeInTheDocument();
    expect(screen.getByText('Übergeneralisierung')).toBeInTheDocument();
    expect(screen.getByText('Gedankenlesen')).toBeInTheDocument();
    expect(screen.getByText('Personalisierung')).toBeInTheDocument();
    expect(screen.getByText('Emotionales Schlussfolgern')).toBeInTheDocument();
    expect(screen.getByText('Sollte-Aussagen')).toBeInTheDocument();
  });

  it('should not render reframe section if reframe is empty', () => {
    const mockCognitive: CognitiveDistortionResult = {
      distortions: [
        {
          type: 'all_or_nothing',
          quote: 'Test quote',
          explanation: 'Test explanation',
          reframe: '',
        },
      ],
      overallThinkingStyle: 'somewhat_distorted',
    };

    render(<CognitiveDistortionDisplay cognitive={mockCognitive} />);

    expect(screen.queryByText(/Alternative:/)).not.toBeInTheDocument();
  });
});
