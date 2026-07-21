import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Public — prerender so the first screen most visitors see paints instantly.
  {
    path: 'login',
    renderMode: RenderMode.Prerender,
  },
  // Everything behind `authGuard`. Prerendering these would ship the signed-in
  // shell to every visitor and flash it before the guard redirects a guest.
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
