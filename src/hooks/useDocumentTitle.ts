import { useEffect } from 'react';

// Título da aba do navegador com o nome do time/liga/jogo
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    if (title) document.title = `${title} · FutStats`;
  }, [title]);
}
