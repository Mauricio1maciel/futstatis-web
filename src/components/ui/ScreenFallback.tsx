import { SearchX } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from './Skeleton';
import { EmptyState } from './States';
import { TopBar } from './TopBar';

// Enquanto a tela lê o endereço (export estático): cabeçalho e blocos de carregamento
export function ScreenFallback() {
  return (
    <div>
      <TopBar />
      <div className="flex flex-col items-center gap-3 px-5 py-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
}

export function NotFoundState({ text = 'Endereço incompleto: faltou dizer o que abrir.' }: { text?: string }) {
  return (
    <div>
      <TopBar />
      <EmptyState
        icon={SearchX}
        title="Não encontrado"
        text={text}
        action={
          <Link href="/" className="text-sm font-bold text-accent">
            Ir para o início
          </Link>
        }
      />
    </div>
  );
}
