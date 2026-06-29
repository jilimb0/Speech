import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { HistoryScreen } from './HistoryScreen';

describe('HistoryScreen', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <HistoryScreen />
      </MemoryRouter>,
    );
    expect(screen.getByText(/История/i)).toBeTruthy();
  });
});
