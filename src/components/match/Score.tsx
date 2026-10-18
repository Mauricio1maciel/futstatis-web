import { hasPenalties } from '@/lib/matches';
import type { Match } from '@/lib/types';

type Props = {
  match: Pick<Match, 'home_score' | 'away_score' | 'home_penalty' | 'away_penalty'>;
  live?: boolean;
  className?: string;
  penaltyClassName?: string;
};

// Placar com os pênaltis ao lado de cada time, em amarelo: "1 (4) - (3) 1"
export function Score({ match, live = false, className = 'text-lg', penaltyClassName = 'text-xs' }: Props) {
  const penalties = hasPenalties(match);
  return (
    <span className={`inline-flex items-baseline whitespace-nowrap font-bold tabular-nums ${live ? 'text-live' : 'text-white'} ${className}`}>
      <span>{match.home_score ?? '-'}</span>
      {penalties && <span className={`ml-1 font-bold text-gold ${penaltyClassName}`}>({match.home_penalty})</span>}
      <span className="mx-1.5">-</span>
      {penalties && <span className={`mr-1 font-bold text-gold ${penaltyClassName}`}>({match.away_penalty})</span>}
      <span>{match.away_score ?? '-'}</span>
    </span>
  );
}
