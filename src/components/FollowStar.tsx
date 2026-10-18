'use client';

import { Bell, BellRing, Star } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { FEATURES } from '@/lib/features';
import {
  getFollows,
  getKinds,
  isFollowing,
  KIND_LABELS,
  loadFollows,
  saveKinds,
  subscribeFollows,
  toggleFollow,
  type FollowTarget,
} from '@/lib/follows';

let loadedOnce = false;

function useFollows() {
  const state = useSyncExternalStore(subscribeFollows, getFollows, getFollows);
  useEffect(() => {
    if (!loadedOnce) {
      loadedOnce = true;
      loadFollows();
    }
  }, []);
  return state;
}

type Props = { target: FollowTarget; size?: number; className?: string; name?: string };

// Estrela de seguir + sino dos tipos de aviso. Escondidos enquanto a web não tem push (FEATURES.push)
export function FollowStar(props: Props) {
  if (!FEATURES.push) return null;
  return <FollowControls {...props} />;
}

function FollowControls({ target, size = 22, className = '', name = '' }: Props) {
  const follows = useFollows();
  const following = isFollowing(follows, target);
  const custom = getKinds(follows, target);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <span className={`inline-flex items-center ${className}`}>
      {following && target.type !== 'match' && (
        <button type="button" aria-label="Escolher avisos" onClick={() => setSheetOpen(true)} className="rounded-full p-2">
          {custom ? <BellRing size={size - 2} className="fill-gold-2 text-gold-2" /> : <Bell size={size - 2} className="text-white" />}
        </button>
      )}
      <button
        type="button"
        aria-label={following ? 'Deixar de seguir' : 'Seguir'}
        aria-pressed={following}
        onClick={() => toggleFollow(target)}
        className="rounded-full p-2"
      >
        <Star size={size} className={following ? 'fill-gold-2 text-gold-2' : 'text-white'} />
      </button>
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={`Avisos · ${name}`}>
        <KindsForm
          available={follows.availableKinds}
          initial={custom ?? follows.availableKinds}
          onSave={async kinds => {
            if (await saveKinds(target, kinds)) setSheetOpen(false);
          }}
        />
      </BottomSheet>
    </span>
  );
}

function KindsForm({ available, initial, onSave }: { available: string[]; initial: string[]; onSave: (kinds: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>(initial);
  const toggle = (kind: string) => setSelected(prev => (prev.includes(kind) ? prev.filter(k => k !== kind) : [...prev, kind]));
  return (
    <div className="px-3">
      {available.map(kind => (
        <label key={kind} className="flex items-center gap-3 rounded-xl px-2 py-3">
          <input type="checkbox" checked={selected.includes(kind)} onChange={() => toggle(kind)} className="h-5 w-5 accent-accent" />
          <span className="text-[15px] text-ink">{KIND_LABELS[kind] || kind}</span>
        </label>
      ))}
      <button
        type="button"
        onClick={() => onSave(selected)}
        className={`mt-3 w-full rounded-xl py-3.5 text-base font-bold ${selected.length ? 'bg-accent text-white' : 'border border-live text-live'}`}
      >
        {selected.length ? 'Salvar' : 'Deixar de seguir'}
      </button>
    </div>
  );
}
