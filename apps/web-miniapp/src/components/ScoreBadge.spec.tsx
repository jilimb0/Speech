import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScoreBadge } from './ScoreBadge';

describe('ScoreBadge', () => {
  it('renders the score number', () => {
    render(<ScoreBadge score={85} />);
    expect(screen.getByText('85')).toBeTruthy();
  });

  it('shows green color for high score', () => {
    const { container } = render(<ScoreBadge score={90} />);
    const span = container.querySelector('span');
    expect(span?.style.color).toBe('rgb(52, 199, 89)');
  });

  it('shows red color for low score', () => {
    const { container } = render(<ScoreBadge score={30} />);
    const span = container.querySelector('span');
    expect(span?.style.color).toBe('rgb(255, 59, 48)');
  });

  it('supports sm size', () => {
    const { container } = render(<ScoreBadge score={75} size="sm" />);
    expect(container.textContent).toBe('75');
  });

  it('supports lg size', () => {
    const { container } = render(<ScoreBadge score={75} size="lg" />);
    expect(container.textContent).toBe('75');
  });
});
