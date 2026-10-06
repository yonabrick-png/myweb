import { scrollContainers } from 'animejs';

/**
 * anime.js keeps its scroll observers awake for 500 ms after each scroll event. If a single frame
 * takes longer than that (a shader compile on a slow phone, a GC pause), the wake window opens and
 * closes inside one tick and no observer runs, so scroll-linked state stays one step behind until
 * the next scroll. When scrolling settles, run every observer once so the page always lands on the
 * state that matches its scroll position.
 *
 * Uses the container's observer list (`_head` / `_next`), which is internal to anime.js 4.5; if a
 * later version renames it this becomes a no-op rather than an error.
 */
type Observer = { handleScroll(): void; _next: Observer | null };
type Container = { updateScrollCoords(): void; _head: Observer | null };

export function settleScrollObservers() {
  (scrollContainers as Map<unknown, Container>).forEach((container) => {
    if (typeof container.updateScrollCoords !== 'function') return;
    container.updateScrollCoords();
    for (let o = container._head; o; o = o._next) o.handleScroll?.();
  });
}

export function watchScrollSettle() {
  addEventListener('scrollend', settleScrollObservers, { passive: true });
}
