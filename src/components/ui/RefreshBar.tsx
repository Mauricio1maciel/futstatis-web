// Faixa fina no topo da lista enquanto um "atualizar" está em andamento (os dados antigos seguem na tela)
export function RefreshBar({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="relative h-0.5 w-full overflow-hidden bg-accent/20" role="progressbar" aria-label="Atualizando">
      <div className="absolute inset-y-0 w-1/3 animate-refresh bg-accent" />
    </div>
  );
}
