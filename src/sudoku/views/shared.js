// sudoku/views/shared.js — shared UI bits for the Sudoku app: rocket mascot,
// top bar, tier chips. (Reuses platform ui helpers.)

import { h } from '../../platform/ui/dom.js';
import { isMuted, setMuted, play } from '../../platform/sound.js';
import { canInstall, triggerInstall } from '../../platform/pwa.js';
import { toast } from '../../platform/ui/toast.js';

export const ROCKET_SVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Rocket Astro, the coach">
  <circle cx="50" cy="50" r="46" fill="#FFD166" stroke="#1E2A5A" stroke-width="3"/>
  <path d="M50 20 C68 32 70 52 62 72 L50 66 L38 72 C30 52 32 32 50 20 Z" fill="#FF6B35" stroke="#1E2A5A" stroke-width="3"/>
  <circle cx="50" cy="46" r="13" fill="#FFF8EC" stroke="#1E2A5A" stroke-width="3"/>
  <circle cx="55" cy="43" r="3.2" fill="#1E2A5A"/>
  <path d="M36 78 L40 68 M64 78 L60 68" stroke="#1E2A5A" stroke-width="3" stroke-linecap="round"/>
  <path d="M44 86 L50 80 L56 86 Z" fill="#3B82F6" stroke="#1E2A5A" stroke-width="3" stroke-linejoin="round"/>
</svg>`;

export function rocketMark(className = 'app-mark') {
  const wrap = h('span', { class: className, 'aria-hidden': 'true' });
  wrap.innerHTML = ROCKET_SVG;
  return wrap;
}

export function rocketHero() {
  const wrap = h('div', { class: 'rocket', 'aria-hidden': 'true' });
  wrap.innerHTML = ROCKET_SVG;
  return wrap;
}

export function tierChip(tier) {
  return h('span', { class: 'tier-chip', style: { background: tier.color } }, tier.name);
}

const SPEAKER_ON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const SPEAKER_OFF = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9l6 6M22 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

let installBound = false;

/** renders the fixed top bar (title + sound + install) */
export function buildTopbar(title) {
  const bar = document.getElementById('topbar');
  bar.hidden = false;
  const existing = bar.querySelectorAll('.topbar-fill, .tb-action, .tb-title');
  existing.forEach((n) => n.remove());

  bar.appendChild(rocketMark());
  const titleEl = h('span', { class: 'title tb-title' }, title);
  bar.appendChild(titleEl);

  const installBtn = h('button', {
    class: 'icon-btn tb-action',
    'aria-label': 'Install this app on your phone',
    hidden: true,
    onClick: () => triggerInstall().then(() => toast('App is being installed!', 'green')).catch(() => {}),
  }, '⇩');
  bar.appendChild(installBtn);

  const soundBtn = h('button', {
    class: 'icon-btn tb-action',
    'aria-label': isMuted() ? 'Turn sound on' : 'Turn sound off',
    onClick: () => {
      setMuted(!isMuted());
      play('tap');
      soundBtn.setAttribute('aria-label', isMuted() ? 'Turn sound on' : 'Turn sound off');
      soundBtn.innerHTML = isMuted() ? SPEAKER_OFF : SPEAKER_ON;
    },
  });
  soundBtn.innerHTML = isMuted() ? SPEAKER_OFF : SPEAKER_ON;
  bar.appendChild(soundBtn);

  if (!installBound) {
    installBound = true;
    document.addEventListener('pwa:installable', () => {
      document.querySelectorAll('.tb-action[hidden]').forEach((b) => { b.hidden = false; });
    });
  }
  if (canInstall()) installBtn.hidden = false;
  return bar;
}