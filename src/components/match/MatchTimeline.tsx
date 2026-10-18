import { ArrowLeftRight, Clock, X } from 'lucide-react';
import { EmptyState } from '@/components/ui/States';
import { classifyEvent, eventLabel, timelineEvents, type EventKind } from '@/lib/lineup';
import type { MatchEvent } from '@/lib/types';

const BORDER: Record<EventKind, string> = {
  goal: 'border-emerald-500',
  'own-goal': 'border-emerald-500',
  'penalty-miss': 'border-faint',
  yellow: 'border-gold',
  'second-yellow': 'border-live',
  red: 'border-live',
  substitution: 'border-accent',
  other: 'border-faint',
};

function EventIcon({ kind }: { kind: EventKind }) {
  if (kind === 'goal' || kind === 'own-goal') return <span className="text-[13px] leading-none">⚽</span>;
  if (kind === 'yellow') return <span className="h-3.5 w-2.5 rounded-xs bg-gold" />;
  if (kind === 'red') return <span className="h-3.5 w-2.5 rounded-xs bg-live" />;
  if (kind === 'second-yellow')
    return (
      <span className="relative h-3.5 w-3.5">
        <span className="absolute left-0 top-0 h-3 w-2 rounded-xs bg-gold" />
        <span className="absolute bottom-0 right-0 h-3 w-2 rounded-xs bg-live" />
      </span>
    );
  if (kind === 'substitution') return <ArrowLeftRight size={14} className="text-accent" />;
  if (kind === 'penalty-miss') return <X size={14} className="text-muted" />;
  return <span className="h-1.5 w-1.5 rounded-full bg-faint" />;
}

function EventText({ event, align }: { event: MatchEvent; align: 'left' | 'right' }) {
  const label = eventLabel(event.event_type);
  return (
    <div className={align === 'right' ? 'text-right' : 'text-left'}>
      <p className="text-sm font-bold text-white">{event.player_name || label}</p>
      <p className="mt-0.5 text-xs text-muted">
        {event.player_name ? label : ''}
        {event.details ? `${event.player_name ? ' • ' : ''}${event.details}` : ''}
      </p>
    </div>
  );
}

// Linha do tempo: gols, cartões e substituições; mandante à esquerda, visitante à direita
export function MatchTimeline({ events, homeEspnId }: { events: MatchEvent[]; homeEspnId?: unknown }) {
  const list = timelineEvents(events);
  if (list.length === 0) {
    return (
      <EmptyState
        compact
        icon={Clock}
        text={
          <>
            Nenhum evento importante registrado ainda.
            <br />
            <span className="text-xs italic">Toque em atualizar no topo para buscar de novo.</span>
          </>
        }
      />
    );
  }
  return (
    <div className="relative px-4 py-7">
      <div className="absolute bottom-7 left-1/2 top-7 w-0.5 -translate-x-1/2 bg-line" aria-hidden />
      <ol>
        {list.map((event, index) => {
          const isHome = String(event.espn_team_id) === String(homeEspnId);
          const kind = classifyEvent(event.event_type);
          return (
            <li key={`${event.minute}-${event.event_type}-${event.player_name}-${index}`} className="relative mb-6 grid grid-cols-[1fr_56px_1fr] items-center">
              <div className="pr-2">{isHome && <EventText event={event} align="right" />}</div>
              <div className="flex flex-col items-center">
                <span className="mb-1 bg-screen px-1 text-[11px] font-bold text-muted">{event.minute}</span>
                <span className={`flex h-6.5 w-6.5 items-center justify-center rounded-full border-2 bg-card ${BORDER[kind]}`}>
                  <EventIcon kind={kind} />
                </span>
              </div>
              <div className="pl-2">{!isHome && <EventText event={event} align="left" />}</div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
