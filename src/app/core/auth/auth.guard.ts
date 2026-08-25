import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ProfileService } from '../profile/profile.service';

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

/**
 * Trang landing công khai ở route gốc: khách xem landing, còn người đã đăng
 * nhập được đưa thẳng vào ứng dụng. Trong prerender chưa có phiên nên cứ render
 * landing; quyết định thật để lại cho trình duyệt.
 */
export const landingGuard: CanActivateFn = async () => {
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!isBrowser) {
    return true;
  }
  await auth.whenReady();

  return auth.isAuthenticated() ? router.createUrlTree(['/channels/@me']) : true;
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

/**
 * Đi sau `authGuard` trên các trang cần đăng nhập: người đã đăng nhập nhưng
 * chưa có hồ sơ (đăng nhập Google/SĐT lần đầu) bị đẩy sang trang hoàn tất hồ sơ.
 */
export const profileGuard: CanActivateFn = async (_route, state) => {
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const auth = inject(AuthService);
  const profile = inject(ProfileService);
  const router = inject(Router);

  if (!isBrowser) {
    return true;
  }
  await auth.whenReady();
  if (!auth.isAuthenticated()) {
    return true; // authGuard lo phần chưa đăng nhập.
  }

  return (
    (await profile.ensureLoaded()) ||
    router.createUrlTree(['/complete-profile'], {
      queryParams: { returnUrl: state.url },
    })
  );
};

/**
 * Bảo vệ chính trang hoàn tất hồ sơ: phải đăng nhập rồi, và nếu đã có hồ sơ thì
 * không cần vào đây nữa.
 */
export const completeProfileGuard: CanActivateFn = async () => {
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const auth = inject(AuthService);
  const profile = inject(ProfileService);
  const router = inject(Router);

  if (!isBrowser) {
    return true;
  }
  await auth.whenReady();
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  return (await profile.ensureLoaded()) ? router.createUrlTree(['/']) : true;
};
