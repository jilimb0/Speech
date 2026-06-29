import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders title', () => {
    render(<PageHeader title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeTruthy();
  });

  it('renders left slot content', () => {
    render(<PageHeader title="Test" left={<button type="button">Back</button>} />);
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('renders right slot content', () => {
    render(<PageHeader title="Test" right={<span>Action</span>} />);
    expect(screen.getByText('Action')).toBeTruthy();
  });
});
