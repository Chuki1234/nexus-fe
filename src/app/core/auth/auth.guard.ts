import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * There is no session during prerender, so both guards let the server render
 * and defer the real decision to the browser. Data access stays protected by
 * Supabase row-level security regardless of what renders.
 *
 * Every `inject()` runs before the first `await` — outside an injection
 * context afterwards, injection throws.
 */

/** Blocks a protected page and remembers where the user was heading. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!isBrowser) {
    return true;
  }
  await auth.whenReady();

  return (
    auth.isAuthenticated() ||
    router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })
  );
};

/** Keeps an already signed-in user off the login page. */
export const guestGuard: CanActivateFn = async () => {
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!isBrowser) {
    return true;
  }
  await auth.whenReady();

  return auth.isAuthenticated() ? router.createUrlTree(['/']) : true;
};
