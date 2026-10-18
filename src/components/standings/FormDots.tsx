const FORM_COLORS: Record<string, string> = { V: 'bg-win', E: 'bg-draw', D: 'bg-loss' };
const FORM_NAMES: Record<string, string> = { V: 'vitória', E: 'empate', D: 'derrota' };

// Forma recente: "VVEDV", do mais antigo (esquerda) para o mais recente (direita).
// No começo da temporada vêm menos de 5 letras: desenha só as que vierem
export function FormDots({ form }: { form?: string }) {
  const letters = String(form || '')
    .toUpperCase()
    .split('')
    .filter(letter => FORM_COLORS[letter])
    .slice(-5);
  if (letters.length === 0) return null;
  return (
    <span className="flex items-center gap-0.5" role="img" aria-label={`Últimos jogos: ${letters.map(l => FORM_NAMES[l]).join(', ')}`}>
      {letters.map((letter, index) => (
        <span key={index} className={`h-1.75 w-1.75 rounded-full ${FORM_COLORS[letter]}`} />
      ))}
    </span>
  );
}
