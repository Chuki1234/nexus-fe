import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Public — prerender so the first screen most visitors see paints instantly.
  {
    path: 'login',
    renderMode: RenderMode.Prerender,
  },
  // Public nhưng KHÔNG prerender: danh sách năm sinh dựng từ năm hiện tại, nên
  // bản prerender sẽ đông cứng theo lúc build và lệch với DOM phía client
  // (hydration mismatch) ngay khi sang năm mới.
  {
    path: 'register',
    renderMode: RenderMode.Client,
  },
  // Everything behind `authGuard`. Prerendering these would ship the signed-in
  // shell to every visitor and flash it before the guard redirects a guest.
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
