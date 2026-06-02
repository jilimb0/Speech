import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/index.js';

interface Props {
  to?: string;
}

export function BackButton({ to = '/' }: Props) {
  const navigate = useNavigate();
  const { tg } = useTelegram();

  useEffect(() => {
    if (!tg) return;
    tg.BackButton.show();
    const handler = () => navigate(to);
    tg.BackButton.onClick(handler);
    return () => {
      tg.BackButton.offClick(handler);
      tg.BackButton.hide();
    };
  }, [tg, navigate, to]);

  // Fallback in-app button when not running inside Telegram
  if (tg) return null;

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="text-[var(--tg-theme-link-color)] text-[15px]"
    >
      ← Назад
    </button>
  );
}
