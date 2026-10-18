'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { freezeScrollMemory, hasInAppHistory } from '@/lib/navigation';

// Voltar: usa o histórico quando a pessoa veio de outra tela do site; link aberto direto vai para a home
export function BackButton({ className = '' }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={() => {
        freezeScrollMemory();
        if (hasInAppHistory()) router.back();
        else router.push('/');
      }}
      className={`-ml-1 rounded-full p-2 text-white active:bg-white/10 ${className}`}
    >
      <ArrowLeft size={24} />
    </button>
  );
}

type Props = {
  title?: ReactNode;
  right?: ReactNode;
  back?: boolean;
  className?: string;
  children?: ReactNode;
};

// Cabeçalho fixo no topo, respeitando a área do relógio/notch do iPhone
export function TopBar({ title, right, back = true, className = '', children }: Props) {
  return (
    <header className={`sticky top-0 z-30 bg-screen/95 pt-safe backdrop-blur ${className}`}>
      <div className="flex h-14 items-center gap-1 px-3">
        {back && <BackButton />}
        <div className="min-w-0 flex-1 truncate text-[17px] font-bold text-white">{title}</div>
        {right && <div className="flex shrink-0 items-center">{right}</div>}
      </div>
      {children}
    </header>
  );
}

export function IconButton({
  label,
  onClick,
  children,
  disabled = false,
  className = '',
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full p-2 text-white active:bg-white/10 disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}
