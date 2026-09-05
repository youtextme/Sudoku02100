// platform/ui/confetti.js - dependency-free confetti burst. Game-agnostic.

import { h } from './dom.js';

const COLORS = ['#FF6B35', '#3B82F6', '#22C55E', '#F59E0B', '#EC4899', '#8B5CF6'];

export function confetti(count = 90) {
  const layer = h('div', { class: 'confetti-layer' });
  for (let i = 0; i < count; i++) {
    const piece = h('span', {
      class: 'confetti-piece',
      style: {
        left: `${(Math.random() * 100).toFixed(1)}vw`,
        background: COLORS[i % COLORS.length],
        animationDelay: `${(Math.random() * 0.4).toFixed(2)}s`,
        animationDuration: `${(1.4 + Math.random() * 1.2).toFixed(2)}s`,
      },
    });
    layer.appendChild(piece);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 3200);
}