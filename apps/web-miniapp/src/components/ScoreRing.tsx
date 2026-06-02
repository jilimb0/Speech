interface Props {
  score: number;
  size?: number;
}

function scoreColor(score: number): string {
  if (score >= 85) return '#34c759';
  if (score >= 70) return '#ff9500';
  if (score >= 50) return '#ff6b35';
  return '#ff3b30';
}

function scoreLabel(score: number): string {
  if (score >= 85) return 'Чистая речь';
  if (score >= 70) return 'Неплохо';
  if (score >= 50) return 'Заметны паразиты';
  return 'Речь засорена';
}

export function ScoreRing({ score, size = 120 }: Props) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = scoreColor(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        role="img"
        aria-label={`Оценка речи: ${score} из 100`}
      >
        <title>Оценка речи: {score} из 100</title>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--tg-theme-secondary-bg-color)"
          strokeWidth={8}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
        {/* Score text — rotated back */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="rotate-90 origin-center"
          fill={color}
          fontSize={size * 0.28}
          fontWeight="700"
          style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
        >
          {score}
        </text>
      </svg>
      <span className="text-sm text-[var(--tg-theme-hint-color)]">{scoreLabel(score)}</span>
    </div>
  );
}
