// Bloco cinza pulsando: carregamento sem tela em branco
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded bg-line-2/70 ${className}`} />;
}
