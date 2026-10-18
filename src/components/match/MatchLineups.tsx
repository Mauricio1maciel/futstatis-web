'use client';

import { Shield, Users } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Crest } from '@/components/ui/Crest';
import { placeStarters, shortPlayerName, type PlacedPlayer } from '@/lib/lineup';
import { teamDisplayName } from '@/lib/matches';
import { setPreview } from '@/lib/preview';
import { playerHref } from '@/lib/routes';
import type { LineupPlayer, Match } from '@/lib/types';

type Side = 'home' | 'away';

const playerId = (p: LineupPlayer) => p.espn_player_id;

function rememberPlayer(p: LineupPlayer, teamName?: string) {
  setPreview('player', playerId(p), { name: p.player_name, team_name: teamName, headshot_url: p.headshot_url, jersey_number: p.jersey });
}

function PlayerNode({ player, teamName }: { player: PlacedPlayer; teamName?: string }) {
  const id = playerId(player);
  const body = (
    <>
      <span className="relative">
        <Crest src={player.headshot_url} size={40} person className="border-2 border-white bg-white" />
        <span className="absolute -left-1.5 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-[10px] font-bold text-black shadow">
          {player.jersey || '-'}
        </span>
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

// Campo verde com as linhas
function Pitch({ children, formation }: { children: ReactNode; formation?: string }) {
  const line = 'absolute border-white/20';
  return (
    <div
      className="relative mx-auto aspect-10/13 w-full max-w-110 overflow-hidden rounded-xl border-2 border-[#40a368]"
      style={{ background: 'repeating-linear-gradient(180deg, #166534 0 10%, #15803d 10% 20%)' }}
    >
      <div className={`${line} inset-3 border-[1.5px]`} />
      <div className={`${line} left-3 right-3 top-1/2 border-t-[1.5px]`} />
      <div className={`${line} left-1/2 top-1/2 aspect-square w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px]`} />
      <div className={`${line} left-1/4 top-3 h-[14%] w-1/2 border-[1.5px] border-t-0`} />
      <div className={`${line} bottom-3 left-1/4 h-[14%] w-1/2 border-[1.5px] border-b-0`} />
      {children}
      {formation && <span className="absolute bottom-3 left-5 text-sm font-bold text-white/45">{formation}</span>}
    </div>
  );
}

type Props = {
  match: Match;
  lineups: LineupPlayer[];
  side: Side;
  onSideChange: (side: Side) => void;
};

// Escalação: seletor do time, titulares posicionados pela formação e a lista de reservas
export function MatchLineups({ match, lineups, side, onSideChange }: Props) {
  const teamEspnId = side === 'home' ? match.espn_home_team_id : match.espn_away_team_id;
  const teamName = side === 'home' ? match.home_team : match.away_team;
  const players = lineups.filter(p => String(p.espn_team_id) === String(teamEspnId));
  const starters = placeStarters(players.filter(p => p.is_starter));
  const substitutes = players.filter(p => !p.is_starter);

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
            starters.map((player, index) => <PlayerNode key={`${playerId(player) ?? player.player_name}-${index}`} player={player} teamName={teamName} />)
          ) : (
            <div className="absolute inset-x-0 top-[38%] flex flex-col items-center px-8 text-center">
              <Shield size={32} className="text-white/60" />
              <p className="mt-2 text-sm font-bold text-white/80">Escalação não disponível</p>
              <p className="mt-1 text-[11px] italic text-white/60">Toque em atualizar no topo para buscar de novo.</p>
            </div>
          )}
        </Pitch>
      </div>

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
