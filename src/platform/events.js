// platform/events.js — tiny pub/sub. Game-agnostic.

const registry = new Map(); // topic -> Set<handler>

export function on(topic, handler) {
  if (!registry.has(topic)) registry.set(topic, new Set());
  registry.get(topic).add(handler);
  return () => off(topic, handler);
}

export function off(topic, handler) {
  registry.get(topic)?.delete(handler);
}

export function emit(topic, payload) {
  const set = registry.get(topic);
  if (!set) return;
  for (const h of [...set]) {
    try {
      h(payload);
    } catch (err) {
      // one broken handler must not kill the others
      console.error('[events] handler failed for', topic, err);
    }
  }
}