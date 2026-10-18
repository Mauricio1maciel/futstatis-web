import { formatGroupName } from './matches';
import type { StandingRow } from './types';

export type StandingsGroup = { name: string; rows: StandingRow[] };

// Agrupa por group_name ("GROUP_A" e "Group A" viram "Grupo A"). Sem group_name: tabela única (name "")
export function groupStandings(rows: StandingRow[]): StandingsGroup[] {
  const groups: StandingsGroup[] = [];
  rows.forEach(row => {
    const name = row.group_name ? formatGroupName(row.group_name) : '';
    let group = groups.find(g => g.name === name);
    if (!group) {
      group = { name, rows: [] };
      groups.push(group);
    }
    group.rows.push(row);
  });
  return groups;
}

export type TeamRef = { id?: unknown; name?: unknown };

// A linha é de um destes times? Pelo ID (api_id) e, sem ele, pelo nome
export function isHighlighted(row: StandingRow, teams: TeamRef[]) {
  return teams.some(
    t =>
      (t.id != null && String(t.id) !== '' && String(t.id) !== '0' && String(row.team_id) === String(t.id)) ||
      (!!t.name && String(row.team_name) === String(t.name)),
  );
}

// Temporadas antigas vêm sem zonas: aí a tabela fica sem cores e sem legenda
export const hasZones = (rows: StandingRow[]) => rows.some(r => String(r.zone || '').trim() !== '');

// Algum time jogando agora? (só a classificação ao vivo traz "live")
export const hasLiveTeams = (rows: StandingRow[] | null | undefined) => !!rows?.some(r => r.live === true);
