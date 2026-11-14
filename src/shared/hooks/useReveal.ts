import { useEffect } from 'react';

/**
 * Reveals every `.reveal` element under `root` the first time it scrolls
 * into view, by setting `data-revealed`. The CSS does the animation; a
 * `--reveal-delay` style on the element staggers siblings.
 */
export function useReveal(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const items = node.querySelectorAll<HTMLElement>(
      '.reveal:not([data-revealed])',
    );
    if (typeof IntersectionObserver !== 'function') {
      items.forEach((el) => el.setAttribute('data-revealed', ''));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute('data-revealed', '');
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  });
}
