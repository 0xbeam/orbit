interface RelationshipStrengthProps {
  score: number; // 0-100
}

function getLabel(score: number): string {
  if (score >= 70) return 'Strong';
  if (score >= 30) return 'Moderate';
  return 'Needs attention';
}

function getBarColor(score: number): string {
  if (score >= 70) return 'bg-status-success';
  if (score >= 30) return 'bg-status-warning';
  return 'bg-status-danger';
}

function getLabelColor(score: number): string {
  if (score >= 70) return 'text-status-success';
  if (score >= 30) return 'text-status-warning';
  return 'text-status-danger';
}

export default function RelationshipStrength({ score }: RelationshipStrengthProps) {
  const label = getLabel(score);
  const barColor = getBarColor(score);
  const labelColor = getLabelColor(score);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="w-full h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.max(5, score)}%` }}
          />
        </div>
      </div>
      <span className={`text-xs font-medium ${labelColor} whitespace-nowrap`}>
        {label}
      </span>
    </div>
  );
}
