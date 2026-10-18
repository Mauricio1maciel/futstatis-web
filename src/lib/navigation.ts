// Voltar/avançar do navegador deve devolver a tela como estava (abas, filtros, lista e rolagem).
// O <NavigationTracker /> marca quando a navegação veio do botão voltar (popstate); as telas
// restauram o estado guardado em memória só nesse caso. Link novo abre a tela do zero, como no app.

let popPending = false;
let navigatedInApp = false;

/** Já houve navegação dentro do site? (o "voltar" do cabeçalho só usa o histórico nesse caso) */
export const hasInAppHistory = () => navigatedInApp;

export const markInAppNavigation = () => {
  navigatedInApp = true;
};

export const markPopNavigation = () => {
  popPending = true;
};

export const clearPopNavigation = () => {
  popPending = false;
};

/** A tela que está montando agora veio do voltar/avançar? */
export const isPopNavigation = () => popPending;

// ---------------- Estado das telas (só em memória, some ao recarregar a página) ----------------

const MAX_SCREENS = 60;
const screenState = new Map<string, unknown>();

export function rememberValue(key: string, value: unknown) {
  screenState.delete(key);
  screenState.set(key, value);
  // Mantém as mais recentes
  while (screenState.size > MAX_SCREENS * 12) {
    const oldest = screenState.keys().next().value;
    if (oldest === undefined) break;
    screenState.delete(oldest);
  }
}

export const hasRememberedValue = (key: string) => screenState.has(key);

export const recallValue = <T>(key: string) => screenState.get(key) as T;

// ---------------- Posição de rolagem por tela ----------------

const scrollPositions = new Map<string, number>();
// Ao sair da tela (clique num link ou voltar), para de gravar: a rolagem para o topo da próxima
// tela não pode sobrescrever a posição da tela que ficou para trás
let scrollFrozen = false;
let unfreezeTimer: ReturnType<typeof setTimeout> | undefined;

export const freezeScrollMemory = () => {
  scrollFrozen = true;
  // Segurança: link para a própria tela não monta tela nova
  clearTimeout(unfreezeTimer);
  unfreezeTimer = setTimeout(() => {
    scrollFrozen = false;
  }, 2500);
};

export const unfreezeScrollMemory = () => {
  clearTimeout(unfreezeTimer);
  scrollFrozen = false;
};

export function saveScrollPosition(key: string, y: number) {
  if (!scrollFrozen) scrollPositions.set(key, y);
}

export const getScrollPosition = (key: string) => scrollPositions.get(key);

// ---------------- Ouvintes do navegador ----------------
// Registrados na carga do módulo e na fase de captura: no React 19 a tela do "voltar" é montada
// de forma síncrona dentro do popstate tratado pelo Next, então a marca precisa vir antes dele

function onPopState() {
  markPopNavigation();
  freezeScrollMemory();
}

// Clique num link interno: a posição da tela atual fica guardada como estava
function onDocumentClick(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
  const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
  if (anchor && anchor.origin === window.location.origin && !anchor.target) freezeScrollMemory();
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', onPopState, true);
  document.addEventListener('click', onDocumentClick, true);
  // A rolagem de cada tela é devolvida por useScrollRestoration, depois que o conteúdo aparece
  if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
}
