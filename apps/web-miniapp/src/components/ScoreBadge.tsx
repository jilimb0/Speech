interface Props {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

function scoreColor(score: number): string {
  if (score >= 85) return '#34c759';
  if (score >= 70) return '#ff9500';
  if (score >= 50) return '#ff6b35';
  return '#ff3b30';
}

export function ScoreBadge({ score, size = 'md' }: Props) {
  const fontSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-3xl' : 'text-xl';
  return (
    <span className={`font-bold tabular-nums ${fontSize}`} style={{ color: scoreColor(score) }}>
      {score}
    </span>
  );
}
