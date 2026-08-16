import { useRef, useEffect } from 'react';
import gsap from 'gsap';

/**
 * Reusable GSAP context hook.
 * Creates a gsap.context() scoped to the given ref on mount,
 * and reverts all animations on unmount to prevent memory leaks.
 *
 * Usage:
 *   const containerRef = useRef(null);
 *   const ctx = useGSAPContext(containerRef);
 *   useEffect(() => {
 *     ctx.current.add(() => { gsap.from('.card', { opacity: 0 }); });
 *   }, []);
 */
export function useGSAPContext(scopeRef) {
  const ctx = useRef(null);

  useEffect(() => {
    ctx.current = gsap.context(() => {}, scopeRef?.current || document.body);
    return () => {
      if (ctx.current) {
        ctx.current.revert();
      }
    };
  }, []);

  return ctx;
}
