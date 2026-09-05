// platform/sound.js - dependency-free WebAudio chimes. Game-agnostic.
// No audio files: everything is synthesized. Safe defaults: muted=false,
// but audio only ever starts after a user gesture.

import { appStore } from './store.js';

let ctx = null;
let muted = appStore.get('sound.muted', false);
let master = null;

export function isMuted() {
  return muted;
}

export function setMuted(m) {
  muted = !!m;
  appStore.set('sound.muted', muted);
  emitMaster();
}

function emitMaster() {
  if (ctx && master) {
    master.gain.setTargetAtTime(muted ? 0 : 0.5, ctx.currentTime, 0.01);
  }
}

function ensure() {
  if (!ctx) {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, start, dur, type = 'sine', vol = 0.5) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ctx.currentTime + start;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export function play(type) {
  ensure();
  if (!ctx) return;
  switch (type) {
    case 'place':
      tone(523, 0, 0.09, 'triangle', 0.4); // C5
      break;
    case 'correct':
      tone(523, 0, 0.08, 'triangle', 0.4);
      tone(659, 0.08, 0.08, 'triangle', 0.4);
      tone(784, 0.16, 0.12, 'triangle', 0.45);
      break;
    case 'win':
      tone(523, 0, 0.09, 'triangle');
      tone(659, 0.09, 0.09, 'triangle');
      tone(784, 0.18, 0.09, 'triangle');
      tone(1047, 0.27, 0.3, 'triangle', 0.5);
      break;
    case 'think':
      tone(392, 0, 0.12, 'sine', 0.3);
      break;
    case 'nudge':
      tone(330, 0, 0.1, 'sine', 0.25);
      tone(262, 0.11, 0.14, 'sine', 0.25);
      break;
    case 'tap':
      tone(700, 0, 0.04, 'sine', 0.15);
      break;
    default:
      break;
  }
}

export function warmUp() {
  ensure();
}