'use client';

import { ArrowDown, ArrowUp, Shield, Users } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Crest } from '@/components/ui/Crest';
import { classifyEvent, placeStarters, shortPlayerName, type PlacedPlayer } from '@/lib/lineup';
import { teamDisplayName } from '@/lib/matches';
import { setPreview } from '@/lib/preview';
import { playerHref } from '@/lib/routes';
import type { LineupPlayer, Match, MatchEvent } from '@/lib/types';

type Side = 'home' | 'away';

const playerId = (p: LineupPlayer) => p.espn_player_id;

const normalize = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
// A ESPN às vezes grafa o nome de quem saiu diferente da escalação ("Joaquín"/"Joaquin")
const sameName = (a: string, b: string) => normalize(a) === normalize(b);

function rememberPlayer(p: LineupPlayer, teamName?: string) {
  setPreview('player', playerId(p), { name: p.player_name, team_name: teamName, headshot_url: p.headshot_url, jersey_number: p.jersey });
}

function PlayerNode({ player, teamName, out = false }: { player: PlacedPlayer; teamName?: string; out?: boolean }) {
  const id = playerId(player);
  const body = (
    <>
      <span className="relative">
        <Crest src={player.headshot_url} size={40} person className="border-2 border-white bg-white" />
        <span className="absolute -left-1.5 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-[10px] font-bold text-black shadow">
          {player.jersey || '-'}
        </span>
        {out && (
          <span aria-label="Substituído" className="absolute -bottom-0.5 -left-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-live text-white">
            <ArrowDown size={11} strokeWidth={3} />
          </span>
        )}
      </span>
      <span className="mt-1 max-w-full truncate text-[10px] font-bold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
        {shortPlayerName(player.player_name)}
      </span>
    </>
  );
  const style = { left: `${player.x}%`, top: `${player.y}%` };
  const className = 'absolute flex w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center';
  if (!id) return <span className={className} style={style}>{body}</span>;
  return (
    <Link href={playerHref(id)} onClick={() => rememberPlayer(player, teamName)} className={className} style={style}>
      {body}
    </Link>
  );
}

// Campo verde inclinado em perspectiva (só o gramado; os jogadores ficam retos por cima)
function Pitch({ children, formation }: { children: ReactNode; formation?: string }) {
  const line = 'absolute border-white/25';
  return (
    <div className="relative mx-auto aspect-10/13 w-full max-w-110 [perspective:900px]">
      <div
        aria-hidden
        className="absolute inset-0 overflow-hidden rounded-xl border-2 border-[#40a368] [transform:rotateX(24deg)] [transform-origin:50%_100%]"
        style={{ background: 'repeating-linear-gradient(180deg, #166534 0 10%, #15803d 10% 20%)' }}
      >
        <div className={`${line} inset-3 border-[1.5px]`} />
        <div className={`${line} left-3 right-3 top-1/2 border-t-[1.5px]`} />
        <div className={`${line} left-1/2 top-1/2 aspect-square w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px]`} />
        <div className={`${line} left-1/4 top-3 h-[14%] w-1/2 border-[1.5px] border-t-0`} />
        <div className={`${line} bottom-3 left-1/4 h-[14%] w-1/2 border-[1.5px] border-b-0`} />
      </div>
      <div className="absolute inset-0">{children}</div>
      {formation && (
        <span className="absolute bottom-3 left-4 rounded-full bg-black/30 px-3 py-1 text-sm font-bold text-white">{formation}</span>
      )}
    </div>
  );
}

// Quem entrou durante o jogo (eventos de substituição do time), com o minuto
function Substitutions({ events, players, teamName }: { events: MatchEvent[]; players: LineupPlayer[]; teamName?: string }) {
  if (events.length === 0) return null;
  return (
    <section className="mx-4 mt-5 overflow-hidden rounded-xl bg-card">
      <h3 className="border-b border-line px-4 py-3 text-[15px] font-bold text-ink">Substituições</h3>
      <ul className="no-scrollbar flex divide-x divide-line overflow-x-auto py-4">
        {events.map((event, index) => {
          const player = players.find(p => p.player_name === event.player_name);
          const id = player ? playerId(player) : undefined;
          const body = (
            <>
              <span className="text-[13px] text-muted">{event.minute}</span>
              <span className="relative mt-1">
                <Crest src={player?.headshot_url} size={48} person className="border-2 border-white bg-white" />
                {player?.jersey && (
                  <span className="absolute -right-1.5 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-black">
                    {player.jersey}
                  </span>
                )}
                <span className="absolute -left-1.5 bottom-0 flex h-5 w-5 items-center justify-center rounded-full bg-win text-white">
                  <ArrowUp size={12} strokeWidth={3} />
                </span>
              </span>
              <span className="mt-1.5 max-w-full truncate text-[13px] font-semibold text-win">{event.player_name}</span>
              {event.details && (
                <span className="flex max-w-full items-center gap-0.5 text-xs text-muted">
                  <ArrowDown size={11} strokeWidth={3} className="shrink-0 text-live" />
                  <span className="truncate">{event.details}</span>
                </span>
              )}
            </>
          );
          const className = 'flex w-28 shrink-0 flex-col items-center px-2 text-center';
          return (
            <li key={`${event.minute}-${event.player_name}-${index}`}>
              {id && player ? (
                <Link href={playerHref(id)} onClick={() => rememberPlayer(player, teamName)} className={className}>
                  {body}
                </Link>
              ) : (
                <div className={className}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

type Props = {
  match: Match;
  lineups: LineupPlayer[];
  events?: MatchEvent[];
  side: Side;
  onSideChange: (side: Side) => void;
};

// Escalação: seletor do time, titulares posicionados pela formação e a lista de reservas
export function MatchLineups({ match, lineups, events = [], side, onSideChange }: Props) {
  const teamEspnId = side === 'home' ? match.espn_home_team_id : match.espn_away_team_id;
  const teamName = side === 'home' ? match.home_team : match.away_team;
  const players = lineups.filter(p => String(p.espn_team_id) === String(teamEspnId));
  const starters = placeStarters(players.filter(p => p.is_starter));
  const substitutes = players.filter(p => !p.is_starter);
  const substitutions = events.filter(
    e => classifyEvent(e.event_type) === 'substitution' && String(e.espn_team_id) === String(teamEspnId) && e.player_name,
  );
  const subbedOut = substitutions.map(e => e.details || '').filter(Boolean);

  return (
    <div className="pb-6">
      <div className="flex gap-2.5 p-4">
        {(['home', 'away'] as Side[]).map(s => {
          const active = s === side;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              onClick={() => onSideChange(s)}
              className={`min-w-0 flex-1 truncate rounded-full px-3 py-2.5 text-xs font-bold ${active ? 'bg-accent text-white' : 'bg-line text-muted'}`}
            >
              {teamDisplayName(s === 'home' ? match.home_team : match.away_team)}
            </button>
          );
        })}
      </div>

      <div className="px-2.5">
        <Pitch formation={starters[0]?.formation}>
          {starters.length > 0 ? (
            starters.map((player, index) => <PlayerNode
                key={`${playerId(player) ?? player.player_name}-${index}`}
                player={player}
                teamName={teamName}
                out={subbedOut.some(name => sameName(name, player.player_name))}
              />)
          ) : (
            <div className="absolute inset-x-0 top-[38%] flex flex-col items-center px-8 text-center">
              <Shield size={32} className="text-white/60" />
              <p className="mt-2 text-sm font-bold text-white/80">Escalação não disponível</p>
              <p className="mt-1 text-[11px] italic text-white/60">Toque em atualizar no topo para buscar de novo.</p>
            </div>
          )}
        </Pitch>
      </div>

      <Substitutions events={substitutions} players={players} teamName={teamName} />

      <section className="mt-5 px-4">
        <h3 className="mb-3 flex items-center gap-2 border-b border-line pb-2 text-[13px] font-bold tracking-wider text-muted">
          <Users size={18} /> RESERVAS
        </h3>
        {substitutes.length === 0 ? (
          <p className="mt-2 text-center text-[13px] text-faint">Nenhum reserva listado.</p>
        ) : (
          <ul className="space-y-1.5">
            {substitutes.map((player, index) => {
              const id = playerId(player);
              const body = (
                <>
                  <Crest src={player.headshot_url} size={30} person className="mr-3" />
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{player.player_name}</span>
                  <span className="text-[11px] font-bold text-faint">{player.jersey ? `#${player.jersey}` : ''}</span>
                </>
              );
              return (
                <li key={`${id ?? player.player_name}-${index}`}>
                  {id ? (
                    <Link
                      href={playerHref(id)}
                      onClick={() => rememberPlayer(player, teamName)}
                      className="flex items-center rounded-lg bg-card p-3 active:bg-white/5"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="flex items-center rounded-lg bg-card p-3">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
