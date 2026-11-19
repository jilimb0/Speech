import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client.js';
import { PremiumScreen } from './PremiumScreen.js';

describe('PremiumScreen', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete window.Telegram;
  });

  it('renders checkout CTA with tracking attributes and calls Telegram openInvoice', async () => {
    const createInvoiceSpy = vi
      .spyOn(api, 'createInvoice')
      .mockResolvedValue({ link: 'https://t.me/$test-invoice' });
    const openInvoice = vi.fn();

    window.Telegram = {
      WebApp: {
        version: '7.0',
        platform: 'tdesktop',
        initData: '',
        initDataUnsafe: {},
        colorScheme: 'light',
        themeParams: {},
        expand: vi.fn(),
        ready: vi.fn(),
        close: vi.fn(),
        openInvoice,
        BackButton: {
          show: vi.fn(),
          hide: vi.fn(),
          onClick: vi.fn(),
          offClick: vi.fn(),
        },
        MainButton: {
          text: '',
          show: vi.fn(),
          hide: vi.fn(),
          onClick: vi.fn(),
          offClick: vi.fn(),
        },
      },
    };

    render(
      <MemoryRouter>
        <PremiumScreen />
      </MemoryRouter>,
    );

    const checkoutBtn = screen.getByTestId('premium-checkout-button');
    expect(checkoutBtn.getAttribute('data-analytics-id')).toBe('funnel_checkout_click');

    fireEvent.click(checkoutBtn);

    await waitFor(() => {
      expect(createInvoiceSpy).toHaveBeenCalledWith('monthly');
      expect(openInvoice).toHaveBeenCalledWith('https://t.me/$test-invoice', expect.any(Function));
    });
  });
});
