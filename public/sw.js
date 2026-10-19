// Service worker só para as notificações (Web Push). Não guarda páginas em cache.
// Os endereços são relativos ao escopo: funciona na raiz (Vercel) e numa subpasta (GitHub Pages).
const BASE = new URL(self.registration.scope).pathname; // ex: "/" ou "/futstatis-web/"

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let msg = {};
  try {
    msg = event.data ? event.data.json() : {};
  } catch {
    msg = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(msg.title || 'FutStats', {
      body: msg.body,
      // jogo-<match_id>: o aviso novo de um jogo substitui o anterior
      tag: msg.tag,
      renotify: !!msg.tag,
      data: msg.data || {},
      icon: `${BASE}icons/icon-192.png`,
      badge: `${BASE}icons/icon-192.png`,
    }),
  );
});

// Mesmos campos do app: com espn_match_id abre o jogo; só com a liga, abre a liga; teste não abre nada
function urlFor(d) {
  const q = v => encodeURIComponent(v || '');
  if (d.type === 'test') return null;
  if (d.espn_match_id) {
    return `${BASE}jogo/?id=${q(d.espn_match_id)}&league=${q(d.league)}&date=${q(d.date)}&espn_home=${q(d.espn_home)}&espn_away=${q(d.espn_away)}&match_id=${q(d.match_id)}`;
  }
  if (d.league) return `${BASE}liga/?codigo=${q(d.league)}`;
  return BASE;
}

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = urlFor(event.notification.data || {});
  if (!url) return;
  event.waitUntil(
    (async () => {
      // Site já aberto: usa a mesma aba
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows.find(w => new URL(w.url).pathname.startsWith(BASE));
      if (open) {
        await open.focus();
        return open.navigate(url);
      }
      return self.clients.openWindow(url);
    })(),
  );
});
