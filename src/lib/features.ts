// Funções do app que ainda não existem na web.
// push: notificações (estrelas de seguir e sino de avisos). No app usam Expo; na web dependem de
// Web Push, que no iPhone só funciona com o site instalado na Tela de Início (iOS 16.4+), e de o
// backend aceitar o registro do navegador (hoje o POST /push/register só aceita android/ios).
// Para ligar: implementar registerWebPush em lib/follows.ts e trocar para true.
export const FEATURES = {
  push: false,
} as const;
