import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FourSidesDisplay } from '@/components/FourSidesDisplay';
import type { FourSidesAnalysis } from '@/lib/types';

describe('FourSidesDisplay', () => {
  it('should render all 4 quadrants when data is provided', () => {
    const mockFourSides: FourSidesAnalysis = {
      sachinhalt: 'Die Ampel ist grün',
      selbstoffenbarung: 'Ich bin bereit zu fahren',
      beziehung: 'Du-Ansprache, direkt',
      appell: 'Fahr los',
      potentielleMissverstaendnisse: [],
    };

    render(<FourSidesDisplay fourSides={mockFourSides} />);

    // Now appears multiple times (header + info dropdown)
    expect(screen.getAllByText(/Vier-Seiten-Modell/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sachinhalt').length).toBeGreaterThan(0);
    expect(screen.getByText('Die Ampel ist grün')).toBeInTheDocument();
    expect(screen.getByText('Selbstoffenbarung')).toBeInTheDocument();
    expect(screen.getByText('Ich bin bereit zu fahren')).toBeInTheDocument();
    expect(screen.getByText('Beziehung')).toBeInTheDocument();
    expect(screen.getByText('Du-Ansprache, direkt')).toBeInTheDocument();
    expect(screen.getByText('Appell')).toBeInTheDocument();
    expect(screen.getByText('Fahr los')).toBeInTheDocument();
  });

  it('should not render empty quadrants', () => {
    const mockFourSides: FourSidesAnalysis = {
      sachinhalt: 'Test content',
      selbstoffenbarung: '',
      beziehung: '',
      appell: '',
      potentielleMissverstaendnisse: [],
    };

    render(<FourSidesDisplay fourSides={mockFourSides} />);

    expect(screen.getByText('Sachinhalt')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
    expect(screen.queryByText('Selbstoffenbarung')).not.toBeInTheDocument();
    expect(screen.queryByText('Beziehung')).not.toBeInTheDocument();
    expect(screen.queryByText('Appell')).not.toBeInTheDocument();
  });

  it('should render collapsible misunderstandings section', () => {
    const mockFourSides: FourSidesAnalysis = {
      sachinhalt: 'Test',
      selbstoffenbarung: '',
      beziehung: '',
      appell: '',
      potentielleMissverstaendnisse: ['Könnte als Befehl aufgefasst werden', 'Könnte unhöflich wirken'],
    };

    render(<FourSidesDisplay fourSides={mockFourSides} />);

    expect(screen.getByText('Potenzielle Missverständnisse')).toBeInTheDocument();
    // Initially collapsed
    expect(screen.queryByText('Könnte als Befehl aufgefasst werden')).not.toBeInTheDocument();
  });

  it('should expand/collapse misunderstandings on click', async () => {
    const user = userEvent.setup();
    const mockFourSides: FourSidesAnalysis = {
      sachinhalt: 'Test',
      selbstoffenbarung: '',
      beziehung: '',
      appell: '',
      potentielleMissverstaendnisse: ['Könnte als Befehl aufgefasst werden'],
    };

    render(<FourSidesDisplay fourSides={mockFourSides} />);

    const button = screen.getByText('Potenzielle Missverständnisse').closest('button');
    expect(button).toBeInTheDocument();

    // Initially collapsed
    expect(screen.queryByText('Könnte als Befehl aufgefasst werden')).not.toBeInTheDocument();

    // Click to expand
    await user.click(button!);
    expect(screen.getByText('Könnte als Befehl aufgefasst werden')).toBeInTheDocument();

    // Click to collapse
    await user.click(button!);
    expect(screen.queryByText('Könnte als Befehl aufgefasst werden')).not.toBeInTheDocument();
  });

  it('should not render misunderstandings section if empty', () => {
    const mockFourSides: FourSidesAnalysis = {
      sachinhalt: 'Test',
      selbstoffenbarung: '',
      beziehung: '',
      appell: '',
      potentielleMissverstaendnisse: [],
    };

    render(<FourSidesDisplay fourSides={mockFourSides} />);

    expect(screen.queryByText('Potenzielle Missverständnisse')).not.toBeInTheDocument();
  });

  it('should not render component when all data is empty', () => {
    const mockFourSides: FourSidesAnalysis = {
      sachinhalt: '',
      selbstoffenbarung: '',
      beziehung: '',
      appell: '',
      potentielleMissverstaendnisse: [],
    };

    const { container } = render(<FourSidesDisplay fourSides={mockFourSides} />);

    expect(container.firstChild).toBeNull();
  });

  it('should apply custom className', () => {
    const mockFourSides: FourSidesAnalysis = {
      sachinhalt: 'Test',
      selbstoffenbarung: '',
      beziehung: '',
      appell: '',
      potentielleMissverstaendnisse: [],
    };

    const { container } = render(<FourSidesDisplay fourSides={mockFourSides} className="custom-class" />);

    const element = container.querySelector('.custom-class');
    expect(element).toBeInTheDocument();
  });

  it('should render multiple misunderstandings', async () => {
    const user = userEvent.setup();
    const mockFourSides: FourSidesAnalysis = {
      sachinhalt: 'Test',
      selbstoffenbarung: '',
      beziehung: '',
      appell: '',
      potentielleMissverstaendnisse: [
        'Könnte als Befehl aufgefasst werden',
        'Könnte unhöflich wirken',
        'Könnte missverstanden werden',
      ],
    };

    render(<FourSidesDisplay fourSides={mockFourSides} />);

    const button = screen.getByText('Potenzielle Missverständnisse').closest('button');
    await user.click(button!);

    expect(screen.getByText('Könnte als Befehl aufgefasst werden')).toBeInTheDocument();
    expect(screen.getByText('Könnte unhöflich wirken')).toBeInTheDocument();
    expect(screen.getByText('Könnte missverstanden werden')).toBeInTheDocument();
  });

  it('should render only misunderstandings without quadrants', async () => {
    const user = userEvent.setup();
    const mockFourSides: FourSidesAnalysis = {
      sachinhalt: '',
      selbstoffenbarung: '',
      beziehung: '',
      appell: '',
      potentielleMissverstaendnisse: ['Test misunderstanding'],
    };

    render(<FourSidesDisplay fourSides={mockFourSides} />);

    expect(screen.getByText('Potenzielle Missverständnisse')).toBeInTheDocument();

    const button = screen.getByText('Potenzielle Missverständnisse').closest('button');
    await user.click(button!);

    expect(screen.getByText('Test misunderstanding')).toBeInTheDocument();
    expect(screen.queryByText('Sachinhalt')).not.toBeInTheDocument();
  });
});
