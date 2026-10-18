// Gera os ícones do PWA: a TV amarela da marca (como no cabeçalho do app) com uma bola na tela.
// Uso: CHROME_PATH=/usr/bin/google-chrome node scripts/generate-icons.mjs
// (precisa do pacote playwright-core: npm i -D playwright-core)
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const OUT = new URL('../public/icons/', import.meta.url);

const pentagon = (cx, cy, r, rotationDeg) =>
  Array.from({ length: 5 }, (_, k) => {
    const a = ((rotationDeg + k * 72) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(3)},${(cy + r * Math.sin(a)).toFixed(3)}`;
  }).join(' ');

// Bola no centro da tela da TV (coordenadas de 24x24, como os ícones lucide)
const [CX, CY, R] = [12, 14.5, 4.9];
const INK = '#0b1120';
const vertexAngles = [-90, -18, 54, 126, 198];
const ball = `
  <clipPath id="ball"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath>
  <circle cx="${CX}" cy="${CY}" r="${R}" fill="#f8fafc"/>
  <g clip-path="url(#ball)" fill="${INK}" stroke="${INK}" stroke-width="0.45" stroke-linejoin="round">
    <polygon points="${pentagon(CX, CY, 1.75, -90)}"/>
    ${vertexAngles
      .map(angle => {
        const a = (angle * Math.PI) / 180;
        const [ox, oy] = [CX + 5.15 * Math.cos(a), CY + 5.15 * Math.sin(a)];
        const [sx, sy] = [CX + 1.75 * Math.cos(a), CY + 1.75 * Math.sin(a)];
        const [ex, ey] = [CX + 3.6 * Math.cos(a), CY + 3.6 * Math.sin(a)];
        return `<polygon points="${pentagon(ox, oy, 1.65, angle + 180)}"/><line x1="${sx.toFixed(3)}" y1="${sy.toFixed(3)}" x2="${ex.toFixed(3)}" y2="${ey.toFixed(3)}"/>`;
      })
      .join('\n    ')}
  </g>`;

const tv = `
  <rect x="2" y="7" width="20" height="15" rx="2.5" fill="none" stroke="#facc15" stroke-width="1.6"/>
  <polyline points="17 2 12 7 7 2" fill="none" stroke="#facc15" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;

const background = `
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="#17233d"/><stop offset="1" stop-color="#0b1120"/>
    </radialGradient>
  </defs>`;

// Favicon: cantos arredondados e o desenho maior (fica legível em 16-32 px)
const roundedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${background}
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <g transform="translate(46 46) scale(17.5)">${tv}${ball}
  </g>
</svg>
`;

// PWA e iPhone: quadrado cheio (o sistema arredonda) com o desenho na zona segura central
const fullBleedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${background}
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(96 96) scale(13.33)">${tv}${ball}
  </g>
</svg>`;

writeFileSync(new URL('icon.svg', OUT), roundedSvg);

const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
];

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome' });
const page = await browser.newPage();
for (const { file, size } of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0">${fullBleedSvg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  writeFileSync(new URL(file, OUT), await page.screenshot({ type: 'png' }));
  console.log('ok', file);
}
await browser.close();
