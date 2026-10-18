import { BarChart3 } from 'lucide-react';
import { EmptyState } from '@/components/ui/States';
import type { MatchStat } from '@/lib/types';

// A API não manda as cores dos times: cores fixas para mandante e visitante
export const HOME_COLOR = 'bg-accent';
export const AWAY_COLOR = 'bg-away';

// 50.2 -> "50,2"; 21 -> "21"; com unit "%": "50,2%"
export function formatStatValue(value: unknown, unit?: string) {
  const n = Number(value);
  const text = Number.isFinite(n) ? (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',')) : String(value ?? '-');
  return unit ? `${text}${unit}` : text;
}

// Estatísticas (já vêm na ordem e em português): mandante | rótulo | visitante e a barra dividida
export function MatchStats({ statistics, homeName, awayName }: { statistics: MatchStat[]; homeName?: string; awayName?: string }) {
  if (statistics.length === 0) {
    return <EmptyState compact icon={BarChart3} text="Estatísticas disponíveis quando o jogo começar" />;
  }
  return (
    <div className="p-4">
      <div className="mb-5 flex items-center justify-between gap-4">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${HOME_COLOR}`} />
          <span className="truncate text-[13px] font-bold text-ink">{homeName}</span>
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[13px] font-bold text-ink">{awayName}</span>
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${AWAY_COLOR}`} />
        </span>
      </div>
      <ul className="space-y-4">
        {statistics.map(stat => {
          const home = Number(stat.home) || 0;
          const away = Number(stat.away) || 0;
          // Os dois zerados (ex: cartões vermelhos): barra meio a meio
          const homeShare = home + away > 0 ? home / (home + away) : 0.5;
          return (
            <li key={stat.key || stat.label}>
              <div className="mb-1.5 flex items-center">
                <span className={`w-16 text-sm font-bold tabular-nums ${home > away ? 'text-white' : 'text-muted'}`}>
                  {formatStatValue(stat.home, stat.unit)}
                </span>
                <span className="flex-1 truncate text-center text-[13px] text-ink-2">{stat.label}</span>
                <span className={`w-16 text-right text-sm font-bold tabular-nums ${away > home ? 'text-white' : 'text-muted'}`}>
                  {formatStatValue(stat.away, stat.unit)}
                </span>
              </div>
              <div className="flex h-1.5 gap-0.75">
                <span className={`h-full rounded-full ${HOME_COLOR}`} style={{ width: `${homeShare * 100}%` }} />
                <span className={`h-full flex-1 rounded-full ${AWAY_COLOR}`} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
