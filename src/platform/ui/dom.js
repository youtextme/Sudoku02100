// platform/ui/dom.js — minimal DOM helpers. Game-agnostic.
// Always textContent for text (never innerHTML with user data).

export function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  if (props) applyProps(node, props);
  appendChildren(node, children);
  return node;
}

function applyProps(node, props) {
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key === 'style' && typeof value === 'object') {
      Object.assign(node.style, value);
    } else if (key === 'dataset' && typeof value === 'object') {
      Object.assign(node.dataset, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value != null && value !== false) {
      if (value === true) node.setAttribute(key, '');
      else node.setAttribute(key, String(value));
    }
  }
}

function appendChildren(node, children) {
  const flat = children.flat(Infinity);
  for (const child of flat) {
    if (child == null || child === false) continue;
    if (child instanceof Node) node.appendChild(child);
    else if (typeof child === 'string' || typeof child === 'number') {
      node.appendChild(document.createTextNode(String(child)));
    } else {
      console.warn('[dom] skipped child', child);
    }
  }
}

export function el(tag, props, ...children) {
  return h(tag, props, ...children);
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

export function text(label) {
  return document.createTextNode(String(label));
}

export function onRoot(viewEl) {
  const host = document.getElementById('app');
  clear(host);
  host.appendChild(viewEl);
  return host;
}

export function scrollTop() {
  window.scrollTo(0, 0);
}