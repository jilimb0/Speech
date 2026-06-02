import type { ReactNode } from 'react';

interface Props {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
}

export function PageHeader({ title, left, right }: Props) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-[var(--tg-theme-bg-color)] border-b border-[var(--tg-theme-secondary-bg-color)]">
      {left && <div className="shrink-0">{left}</div>}
      <h1 className="flex-1 text-[17px] font-semibold truncate">{title}</h1>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}
