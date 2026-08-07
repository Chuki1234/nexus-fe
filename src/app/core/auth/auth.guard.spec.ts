import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { ProfileService } from '../profile/profile.service';
import { AuthService } from './auth.service';

/** Stands in for Supabase so the guards can be driven from a known state. */
class AuthServiceStub {
  authenticated = false;
  whenReady = () => Promise.resolve();
  isAuthenticated = () => this.authenticated;
  user = () => (this.authenticated ? { email: 'ban@vidu.com' } : null);
  signOut = () => Promise.resolve();
}

/**
 * Đứng thay `ProfileService` để guard không gọi backend thật.
 *
 * Bắt buộc phải stub: `profileGuard` chạy ngay sau `authGuard` trên mọi trang cần
 * đăng nhập, nên thiếu nó thì mọi test "vào được trang X" đều bị đá sang
 * /complete-profile.
 */
class ProfileServiceStub {
  complete = true;
  ensureLoaded = () => Promise.resolve(this.complete);
  /** Shell dựng `UserPanel`, component đó đọc hồ sơ để hiện tên. */
  current = () => null;
  reset = () => undefined;
}

describe('route guards', () => {
  let auth: AuthServiceStub;
  let profile: ProfileServiceStub;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    auth = new AuthServiceStub();
    profile = new ProfileServiceStub();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: AuthService, useValue: auth },
        { provide: ProfileService, useValue: profile },
      ],
    });
    harness = await RouterTestingHarness.create();
  });

  /** '/' chuyển hướng sang Dashboard, nên returnUrl nhớ đích cuối chứ không phải '/'. */
  const DASHBOARD_RETURN_URL = '/login?returnUrl=%2Fchannels%2F@me';

  it('sends a guest landing on / to the login page', async () => {
    auth.authenticated = false;

    await harness.navigateByUrl('/');

    expect(TestBed.inject(Router).url).toBe(DASHBOARD_RETURN_URL);
  });

  it('funnels an unknown path through the wildcard to login', async () => {
    auth.authenticated = false;

    await harness.navigateByUrl('/khong-ton-tai');

    // Wildcard trỏ thẳng tới Dashboard, nên returnUrl là đích đó chứ không phải
    // đường dẫn người dùng gõ.
    expect(TestBed.inject(Router).url).toBe(DASHBOARD_RETURN_URL);
  });

  it('lets a signed-in user reach the dashboard', async () => {
    auth.authenticated = true;

    await harness.navigateByUrl('/');

    expect(TestBed.inject(Router).url).toBe('/channels/@me');
  });

  it('keeps a signed-in user off the login page', async () => {
    auth.authenticated = true;

    await harness.navigateByUrl('/login');

    expect(TestBed.inject(Router).url).toBe('/channels/@me');
  });

  it('does not bounce a guest away from the login page', async () => {
    auth.authenticated = false;

    await harness.navigateByUrl('/login');

    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('sends a signed-in user with no profile to the complete-profile page', async () => {
    auth.authenticated = true;
    profile.complete = false;

    await harness.navigateByUrl('/');

    expect(TestBed.inject(Router).url).toBe('/complete-profile?returnUrl=%2Fchannels%2F@me');
  });

  it('keeps a user who already has a profile off the complete-profile page', async () => {
    auth.authenticated = true;
    profile.complete = true;

    await harness.navigateByUrl('/complete-profile');

    expect(TestBed.inject(Router).url).toBe('/channels/@me');
  });

  it('sends a guest away from the complete-profile page', async () => {
    auth.authenticated = false;

    await harness.navigateByUrl('/complete-profile');

    expect(TestBed.inject(Router).url).toBe('/login');
  });
});
