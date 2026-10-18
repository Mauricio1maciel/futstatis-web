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
};

// Escudo, logo ou foto com <img loading="lazy"> (o export estático não otimiza imagens) e um
// círculo no lugar quando não há imagem ou ela não carrega
export function Crest({ src, size = 24, alt = '', className = '', person = false }: Props) {
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
        {person && <User size={Math.round(size * 0.55)} className="text-faint" />}
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
