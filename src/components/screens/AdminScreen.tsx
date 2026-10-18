'use client';

import { Eye, EyeOff, Loader2, LogOut, Play, Server, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { LEAGUE_CODES } from '@/config/leagues';
import { Pills } from '@/components/ui/Pills';
import { TopBar } from '@/components/ui/TopBar';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { buildEndpoint, requestApi } from '@/lib/api';
import { loginAdmin, logoutAdmin } from '@/lib/auth';
import { getBaseUrl } from '@/lib/config';

type ActionResult = { loading: boolean; status?: number; text?: string };

// Resume a resposta para caber na tela (listas grandes viram só a contagem)
function formatResult(data: unknown) {
  if (data == null) return 'Sem resposta';
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return `OK: ${data.length} itens`;
  const error = (data as { error?: unknown }).error;
  if (error) return String(error);
  const text = JSON.stringify(data, (_key, value) => (Array.isArray(value) ? `[${value.length} itens]` : value), 2);
  return text.length > 600 ? `${text.slice(0, 600)}…` : text;
}

const inputClass =
  'w-full rounded-xl border border-line-2 bg-card-2 px-4 py-3.5 text-base text-ink outline-none placeholder:text-faint focus:border-accent';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading || !email || !password) return;
    setLoading(true);
    setError('');
    const result = await loginAdmin(getBaseUrl(), email, password);
    setLoading(false);
    // A senha nunca fica guardada: só o token
    if (result.ok) setPassword('');
    else setError(result.error || 'Erro ao entrar');
  };

  return (
    <form onSubmit={submit} className="space-y-3.5">
      <h2 className="mb-5 text-center text-xl font-bold text-ink">Acesso de administrador</h2>
      <input
        type="email"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        placeholder="E-mail"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className={inputClass}
      />
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="Senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className={`${inputClass} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(v => !v)}
          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted"
        >
          {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
        </button>
      </div>
      {error && <p className="text-center text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading || !email || !password}
        className="flex w-full items-center justify-center rounded-xl bg-accent py-3.5 text-base font-bold text-white disabled:opacity-50"
      >
        {loading ? <Loader2 size={20} className="animate-spin" /> : 'Entrar'}
      </button>
    </form>
  );
}

function AdminPanel() {
  const [league, setLeague] = useState(LEAGUE_CODES[0]);
  const [teamId, setTeamId] = useState('');
  const [results, setResults] = useState<Record<string, ActionResult>>({});

  const run = async (key: string, endpoint: string) => {
    setResults(prev => ({ ...prev, [key]: { loading: true } }));
    const result = await requestApi(endpoint);
    setResults(prev => ({
      ...prev,
      [key]: { loading: false, status: result?.status, text: result ? formatResult(result.data) : 'Falha na requisição' },
    }));
  };

  const action = (key: string, label: string, endpoint: string, disabled = false) => {
    const result = results[key];
    const isError = result?.status != null && result.status >= 400;
    return (
      <div key={key} className="mb-2.5">
        <button
          type="button"
          onClick={() => run(key, endpoint)}
          disabled={result?.loading || disabled}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-line-2 bg-card-2 px-4 py-3.5 text-left disabled:opacity-50"
        >
          <span className="text-sm font-semibold text-ink">{label}</span>
          {result?.loading ? <Loader2 size={16} className="animate-spin text-accent" /> : <Play size={16} className="text-accent" />}
        </button>
        {result && !result.loading && (
          <pre className={`mt-1.5 whitespace-pre-wrap break-words px-1 font-mono text-xs ${isError ? 'text-red-400' : 'text-muted'}`}>
            {result.status ? `[${result.status}] ` : ''}
            {result.text}
          </pre>
        )}
      </div>
    );
  };

  const sectionTitle = (text: string) => <h2 className="mb-3 mt-7 text-xs font-bold uppercase tracking-wider text-faint">{text}</h2>;

  return (
    <div>
      <div className="mx-auto mb-2 flex w-fit items-center gap-2 rounded-full border border-gold-2 px-4 py-1.5">
        <ShieldCheck size={16} className="text-gold-2" />
        <span className="text-sm font-bold text-gold-2">Modo admin</span>
      </div>

      {sectionTitle('Sincronizações gerais')}
      {action('sync-daily', 'Sincronização diária (background)', '/admin/sync-daily')}
      {action('sync-teams', 'Vincular times à ESPN', '/admin/sync-teams')}
      {action('image-bot', 'Ligar robô de fotos', '/admin/run-image-bot')}

      {sectionTitle('Por liga')}
      <Pills
        variant="outline"
        value={league}
        onChange={setLeague}
        options={LEAGUE_CODES.map(code => ({ value: code, label: code }))}
        className="-mx-4 mb-3 px-4"
        label="Liga"
      />
      {action(`matches-${league}`, 'Atualizar jogos', buildEndpoint('/matches', { league, update: 'true' }))}
      {action(`standings-${league}`, 'Recalcular classificação', buildEndpoint('/standings', { league, update: 'true' }))}
      {action(`stats-${league}`, 'Atualizar artilharia e assistências', buildEndpoint('/league/stats', { league, update: 'true' }))}
      {action(`teams-${league}`, 'Atualizar times', buildEndpoint('/teams', { league, update: 'true' }))}
      {action(`players-${league}`, 'Atualizar elencos', buildEndpoint('/players', { league, force_update: 'true' }))}
      {action(`force-sync-${league}`, 'Completar detalhes ESPN dos jogos passados', buildEndpoint('/admin/force-sync', { league }))}

      {sectionTitle('Elenco de um time (ESPN)')}
      <input
        inputMode="numeric"
        placeholder="ID do time"
        value={teamId}
        onChange={e => setTeamId(e.target.value.replace(/\D/g, ''))}
        className={`${inputClass} mb-2.5`}
      />
      {action(
        `team-espn-${league}`,
        `Atualizar elenco (${league})`,
        buildEndpoint('/team/players_espn', { teamID: teamId.trim(), league }),
        !teamId.trim(),
      )}

      <button
        type="button"
        onClick={logoutAdmin}
        className="mx-auto mt-8 flex items-center gap-2 rounded-xl border border-red-900 px-6 py-3 text-sm font-bold text-red-400"
      >
        <LogOut size={18} />
        Sair
      </button>
    </div>
  );
}

// Tela escondida (7 toques no logo da home)
export function AdminScreen() {
  const isAdmin = useIsAdmin();
  return (
    <div className="pb-[calc(40px+env(safe-area-inset-bottom))]">
      <TopBar
        title="Administração"
        right={
          <Link href="/servidor/" aria-label="Servidor da API" className="rounded-full p-2 text-muted active:bg-white/10">
            <Server size={22} />
          </Link>
        }
      />
      <div className="px-4 pt-4">{isAdmin ? <AdminPanel /> : <LoginForm />}</div>
    </div>
  );
}
