'use client';

import { User } from 'lucide-react';
import { useState } from 'react';

const isValidImage = (url?: string | null) => !!url && url !== 'NOT_FOUND';

type Props = {
  src?: string | null;
  size?: number;
  alt?: string;
  className?: string;
  /** Foto de jogador: recorte redondo e ícone de pessoa quando não há foto */
  person?: boolean;
  /** Nome: sem imagem, mostra as iniciais (ex: "Pedro Henrique" -> "PH") */
  name?: string;
};

// "Gonzalo Plata" -> "GP"; "Pedro" -> "PE"
export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Escudo, logo ou foto com <img loading="lazy"> (o export estático não otimiza imagens) e um
// círculo no lugar quando não há imagem ou ela não carrega
export function Crest({ src, size = 24, alt = '', className = '', person = false, name }: Props) {
  const [failed, setFailed] = useState<string | null>(null);
  const showImage = isValidImage(src) && failed !== src;
  const box = { width: size, height: size };

  if (!showImage) {
    return (
      <span
        aria-hidden={!alt}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        style={box}
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-line-2 ${className}`}
      >
        {name && initialsOf(name) ? (
          <span className="font-bold leading-none text-ink-2" style={{ fontSize: Math.max(9, Math.round(size * 0.36)) }}>
            {initialsOf(name)}
          </span>
        ) : (
          person && <User size={Math.round(size * 0.55)} className="text-faint" />
        )}
      </span>
    );
  }

  return (
    <img
      src={src!}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      style={box}
      onError={() => setFailed(src!)}
      className={`shrink-0 ${person ? 'rounded-full bg-card-2 object-cover' : 'object-contain'} ${className}`}
    />
  );
}
