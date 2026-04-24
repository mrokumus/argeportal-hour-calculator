import { PANEL_OPEN_TIMEOUT_MS } from '../config';

/**
 * Resolves when a matching element appears in the DOM.
 * Uses MutationObserver instead of polling with setInterval.
 */
export function waitForElement(
  selector: string,
  root: Node = document.body,
  timeoutMs: number = PANEL_OPEN_TIMEOUT_MS,
): Promise<Element> {
  return new Promise((resolve, reject) => {
    const existing = (root as Element).querySelector?.(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const timer = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for ${selector}`));
    }, timeoutMs);

    const observer = new MutationObserver(() => {
      const el = (root as Element).querySelector?.(selector);
      if (el) {
        clearTimeout(timer);
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(root, { childList: true, subtree: true });
  });
}
