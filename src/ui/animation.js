import { MOTION_MEDIUM_MS } from '../lib/config.js';

export function animateNumber(element, nextValue, formatter, reducedMotion) {
  const previousValue = Number(element.dataset.value || 0);
  element.dataset.value = String(nextValue);

  if (reducedMotion) {
    element.textContent = formatter(nextValue);
    return;
  }

  const start = performance.now();
  const duration = 500;
  const delta = nextValue - previousValue;

  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = formatter(previousValue + delta * eased);
    if (progress < 1) {
      window.requestAnimationFrame(frame);
    }
  }

  window.requestAnimationFrame(frame);
}

export function settleAnimationClass(node, className, reducedMotion) {
  if (reducedMotion) {
    node.classList.remove(className);
    return;
  }

  window.setTimeout(() => node.classList.remove(className), MOTION_MEDIUM_MS);
}

export function highlightChangedTargets(targets, reducedMotion) {
  targets.forEach((target) => {
    target.classList.add('is-highlighted');
    window.setTimeout(() => target.classList.remove('is-highlighted'), reducedMotion ? 0 : 1200);
  });

  const behavior = reducedMotion ? 'auto' : 'smooth';
  targets[0].scrollIntoView({ behavior, block: 'nearest' });
}
