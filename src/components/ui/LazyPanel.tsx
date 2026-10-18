'use client';

import { useState, type ReactNode } from 'react';

// Aba que só monta quando é aberta pela primeira vez e depois fica guardada (escondida):
// voltar para ela não busca tudo de novo
export function LazyPanel({ active, children }: { active: boolean; children: ReactNode }) {
  const [mounted, setMounted] = useState(active);
  if (active && !mounted) setMounted(true);
  if (!mounted) return null;
  return <div hidden={!active}>{children}</div>;
}
