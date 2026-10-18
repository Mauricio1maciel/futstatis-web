'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { TopBar } from '@/components/ui/TopBar';
import { clearApiCache } from '@/lib/apiCache';
import { clearGuestToken, logoutAdmin } from '@/lib/auth';
import { DEFAULT_API_URL, getCustomBaseUrl, setCustomBaseUrl } from '@/lib/config';
import { showToast } from '@/lib/toast';

const isValidUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

// Tela escondida: troca a URL da API só neste navegador (ex: servidor de testes)
export function ServerScreen() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [current, setCurrent] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const custom = getCustomBaseUrl();
    setCurrent(custom || DEFAULT_API_URL);
    setUrl(custom || DEFAULT_API_URL);
  }, []);

  const apply = (value: string) => {
    setCustomBaseUrl(value);
    // Dados e tokens eram do outro servidor
    clearApiCache();
    clearGuestToken();
    logoutAdmin();
    showToast('Servidor alterado', value || DEFAULT_API_URL);
    router.push('/');
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = url.trim().replace(/\/+$/, '');
    if (!isValidUrl(value)) {
      setError('Informe uma URL completa, ex: http://192.168.1.14:5000');
      return;
    }
    apply(value);
  };

  return (
    <div>
      <TopBar title="Servidor da API" />
      <form onSubmit={submit} className="space-y-4 px-5 pt-4">
        <p className="text-sm text-muted">
          Em uso: <span className="break-all font-mono text-ink">{current}</span>
        </p>
        <input
          type="url"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={url}
          onChange={e => {
            setUrl(e.target.value);
            setError('');
          }}
          placeholder="URL (ex: http://100.x.x.x:5000)"
          className="w-full rounded-xl border border-line-2 bg-card-2 px-4 py-3.5 font-mono text-base text-ink outline-none focus:border-accent"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" className="w-full rounded-xl bg-accent py-3.5 text-base font-bold text-white">
          Salvar servidor
        </button>
        <button
          type="button"
          onClick={() => apply('')}
          className="w-full rounded-xl border border-line-2 py-3.5 text-sm font-bold text-ink-2"
        >
          Usar o padrão ({DEFAULT_API_URL})
        </button>
        <p className="text-xs leading-5 text-faint">
          Vale só para este navegador. Ao trocar, a cópia local dos dados e os tokens são apagados, e o modo admin é desligado.
        </p>
      </form>
    </div>
  );
}
