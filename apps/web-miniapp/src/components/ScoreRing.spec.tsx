import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScoreRing } from './ScoreRing';

describe('ScoreRing', () => {
  it('renders SVG with score', () => {
    const { container } = render(<ScoreRing score={75} />);
    expect(container.querySelector('svg')).toBeTruthy();
    expect(screen.getByText('75')).toBeTruthy();
  });

  it('has accessible label', () => {
    render(<ScoreRing score={85} />);
    const svg = document.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).toMatch(/Оценка/);
  });

  it('shows correct label for high scores', () => {
    render(<ScoreRing score={90} />);
    expect(screen.getByText('Чистая речь')).toBeTruthy();
  });

  it('shows correct label for medium scores', () => {
    render(<ScoreRing score={60} />);
    expect(screen.getByText('Заметны паразиты')).toBeTruthy();
  });

  it('shows correct label for low scores', () => {
    render(<ScoreRing score={20} />);
    expect(screen.getByText('Речь засорена')).toBeTruthy();
  });
});
