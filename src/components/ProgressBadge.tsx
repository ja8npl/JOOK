import { ArrowDownRight, ArrowUpRight, Minus, Trophy } from 'lucide-react';
import { type ProgressHistory } from '../db/schema';

interface Props {
  current?: ProgressHistory;
  previous?: ProgressHistory;
  compact?: boolean;
}

export function ProgressBadge({ current, previous, compact = false }: Props) {
  if (!current) return <span className="progress-badge progress-badge-muted">Neu</span>;
  const overloadKg = previous ? current.maxGewicht - previous.maxGewicht : 0;
  const overloadReps = previous ? current.bestReps - previous.bestReps : 0;
  const isUp = overloadKg > 0 || (overloadKg === 0 && overloadReps > 0);
  const isDown = overloadKg < 0 || (overloadKg === 0 && overloadReps < 0);
  const Icon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
  const label = isUp
    ? overloadKg !== 0 ? `+${overloadKg.toLocaleString('de-DE')} kg` : `+${overloadReps} Rep`
    : isDown
      ? overloadKg !== 0 ? `${overloadKg.toLocaleString('de-DE')} kg` : `${overloadReps} Rep`
      : 'Gleich';

  return (
    <span className={`progress-badge ${isUp ? 'progress-badge-up' : isDown ? 'progress-badge-down' : 'progress-badge-muted'}`}>
      <Icon size={compact ? 12 : 14} />
      {label}
      {!compact && <span className="progress-badge-detail"><Trophy size={11} /> PR {current.maxGewicht.toLocaleString('de-DE')} kg · 1RM {Math.round(current.estimatedOneRepMax).toLocaleString('de-DE')}</span>}
    </span>
  );
}
