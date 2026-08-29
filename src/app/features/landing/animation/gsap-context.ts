import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Đăng ký plugin GSAP một lần duy nhất (chỉ ở trình duyệt).
 *
 * ScrollTrigger đọc `window`/`document` nên tuyệt đối không gọi ở phía server.
 * Mọi nơi dùng animation của landing phải bọc trong `isPlatformBrowser` +
 * `afterNextRender` rồi mới gọi helper này.
 */
let registered = false;

export function registerGsap(): typeof gsap {
  if (!registered && typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }
  return gsap;
}

/** Người dùng bật "giảm chuyển động" — trả về true để tắt mọi animation trang trí. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export { gsap, ScrollTrigger };
