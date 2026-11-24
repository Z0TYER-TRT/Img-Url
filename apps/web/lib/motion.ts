import { animate } from 'animejs';

/** Motion answers an action here; it never plays on its own. */
export function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** A new row arriving in a list. */
export function popIn(element: Element | null | undefined) {
  if (!element || reducedMotion()) return;
  animate(element, {
    opacity: [0, 1],
    translateY: [7, 0],
    duration: 300,
    ease: 'outQuad',
  });
}

/** Confirmation pulse for something the person just copied. */
export function pulse(element: Element | null | undefined) {
  if (!element || reducedMotion()) return;
  animate(element, { scale: [1, 1.012, 1], duration: 380, ease: 'inOutQuad' });
}

/** A tile leaving the sheet. Calls back when it is gone. */
export function collapse(element: Element | null | undefined, done: () => void) {
  if (!element || reducedMotion()) {
    done();
    return;
  }
  animate(element, {
    opacity: [1, 0],
    scale: [1, 0.965],
    duration: 200,
    ease: 'inQuad',
    onComplete: done,
  });
}
