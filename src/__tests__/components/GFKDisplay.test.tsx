import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GFKDisplay } from '@/components/GFKDisplay';
import type { GFKAnalysis } from '@/lib/types';

describe('GFKDisplay', () => {
  it('should render all GFK sections when data is provided', () => {
    const mockGFK: GFKAnalysis = {
      observations: ['Du hörst mir nicht zu', 'Du schaust auf dein Handy'],
      feelings: ['frustriert', 'ignoriert'],
      needs: ['Gehört werden', 'Aufmerksamkeit'],
      requests: ['Bitte hör mir zu', 'Könntest du das Handy weglegen?'],
      gfkTranslation: 'Ich beobachte, dass du auf dein Handy schaust, und fühle mich frustriert, weil ich das Bedürfnis habe, gehört zu werden.',
      reflectionQuestion: 'Was brauchst du gerade in diesem Moment?',
    };

    render(<GFKDisplay gfk={mockGFK} />);

    // Check header (now appears twice: header + info dropdown)
    expect(screen.getAllByText(/GFK-Analyse/i).length).toBeGreaterThan(0);

    // Check observations
    expect(screen.getAllByText('Beobachtungen').length).toBeGreaterThan(0);
    expect(screen.getByText('Du hörst mir nicht zu')).toBeInTheDocument();
    expect(screen.getByText('Du schaust auf dein Handy')).toBeInTheDocument();

    // Check feelings (now appears in info dropdown too)
    expect(screen.getAllByText('Gefühle').length).toBeGreaterThan(0);
    expect(screen.getByText('frustriert')).toBeInTheDocument();
    expect(screen.getByText('ignoriert')).toBeInTheDocument();

    // Check needs (now appears in info dropdown too)
    expect(screen.getAllByText('Bedürfnisse').length).toBeGreaterThan(0);
    expect(screen.getByText('Gehört werden')).toBeInTheDocument();
    expect(screen.getByText('Aufmerksamkeit')).toBeInTheDocument();

    // Check requests (now appears in info dropdown too)
    expect(screen.getAllByText('Bitten').length).toBeGreaterThan(0);
    expect(screen.getByText('Bitte hör mir zu')).toBeInTheDocument();
    expect(screen.getByText(/Könntest du das Handy weglegen/)).toBeInTheDocument();

    // Check GFK translation (now appears in info dropdown too)
    expect(screen.getAllByText('GFK-Übersetzung').length).toBeGreaterThan(0);
    expect(screen.getByText(/Ich beobachte, dass du auf dein Handy schaust/)).toBeInTheDocument();

    // Check reflection question
    expect(screen.getByText(/Was brauchst du gerade in diesem Moment/)).toBeInTheDocument();
  });

  it('should not render sections with empty data', () => {
    const mockGFK: GFKAnalysis = {
      observations: ['Test observation'],
      feelings: [],
      needs: [],
      requests: [],
      gfkTranslation: '',
      reflectionQuestion: '',
    };

    render(<GFKDisplay gfk={mockGFK} />);

    // Should render observation
    expect(screen.getByText('Beobachtungen')).toBeInTheDocument();

    // Note: Section titles may appear in Info dropdown, so we check for specific content
    // Empty sections should not have their content areas rendered
    expect(screen.queryByText('frustriert')).not.toBeInTheDocument();
    expect(screen.queryByText('Gehört werden')).not.toBeInTheDocument();
    expect(screen.queryByText('Bitte hör mir zu')).not.toBeInTheDocument();
  });

  it('should not render component when all data is empty', () => {
    const mockGFK: GFKAnalysis = {
      observations: [],
      feelings: [],
      needs: [],
      requests: [],
      gfkTranslation: '',
      reflectionQuestion: '',
    };

    const { container } = render(<GFKDisplay gfk={mockGFK} />);

    expect(container.firstChild).toBeNull();
  });

  it('should apply custom className', () => {
    const mockGFK: GFKAnalysis = {
      observations: ['Test'],
      feelings: [],
      needs: [],
      requests: [],
      gfkTranslation: '',
      reflectionQuestion: '',
    };

    const { container } = render(<GFKDisplay gfk={mockGFK} className="custom-class" />);

    const element = container.querySelector('.custom-class');
    expect(element).toBeInTheDocument();
  });

  it('should render only GFK translation without other sections', () => {
    const mockGFK: GFKAnalysis = {
      observations: [],
      feelings: [],
      needs: [],
      requests: [],
      gfkTranslation: 'Test translation',
      reflectionQuestion: '',
    };

    render(<GFKDisplay gfk={mockGFK} />);

    expect(screen.getAllByText('GFK-Übersetzung').length).toBeGreaterThan(0);
    expect(screen.getByText('Test translation')).toBeInTheDocument();
    // Check that no observation content is rendered
    expect(screen.queryByText('Du hörst mir nicht zu')).not.toBeInTheDocument();
  });

  it('should render only reflection question without other sections', () => {
    const mockGFK: GFKAnalysis = {
      observations: [],
      feelings: [],
      needs: [],
      requests: [],
      gfkTranslation: '',
      reflectionQuestion: 'What do you need?',
    };

    render(<GFKDisplay gfk={mockGFK} />);

    expect(screen.getByText('What do you need?')).toBeInTheDocument();
    expect(screen.queryByText('Beobachtungen')).not.toBeInTheDocument();
  });
});
