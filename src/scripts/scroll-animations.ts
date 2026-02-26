/**
 * Scroll-triggered animations using IntersectionObserver.
 *
 * Supports: data-animate="fade-up" | "fade-in" | "slide-left" | "slide-right"
 * Stagger: data-animate-stagger on a parent staggers child animations.
 * Respects prefers-reduced-motion — all animations are disabled when the user
 * prefers reduced motion.
 */

function initScrollAnimations(): void {
  // Respect prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  if (prefersReducedMotion) {
    // Make all animated elements visible immediately
    document.querySelectorAll<HTMLElement>('[data-animate]').forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    return;
  }

  // Mark JS as ready so CSS hides elements for animation
  document.documentElement.classList.add('js-ready');

  // Set up stagger delays for groups
  document
    .querySelectorAll<HTMLElement>('[data-animate-stagger]')
    .forEach((parent) => {
      const children = parent.querySelectorAll<HTMLElement>('[data-animate]');
      children.forEach((child, index) => {
        child.style.transitionDelay = `${index * 100}ms`;
      });
    });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.add('animate-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -20px 0px',
    },
  );

  document.querySelectorAll<HTMLElement>('[data-animate]').forEach((el) => {
    observer.observe(el);
  });
}

// Run on initial load and on Astro page navigation
document.addEventListener('astro:page-load', initScrollAnimations);

// Fallback for non-Astro navigation
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScrollAnimations);
} else {
  initScrollAnimations();
}
