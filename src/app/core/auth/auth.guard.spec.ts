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
  /** Trang đăng nhập gọi hàm này lúc khởi tạo để biết có hiện nút Google không. */
  isProviderEnabled = () => Promise.resolve(false);
}

/**
 * Không stub lớp này thì `profileGuard` gọi thẳng Supabase với id lấy từ
 * `AuthServiceStub.user()` (không có `id`) — request thật đi ra mạng rồi hỏng,
 * và mọi test cho người đã đăng nhập trượt vì lý do chẳng liên quan gì tới guard.
 *
 * `hasProfile = true` là điều kiện mà các test dưới đây ngầm giả định: người dùng
 * đã đăng nhập VÀ đã có hồ sơ, nên guard phải cho đi tiếp.
 */
class ProfileServiceStub {
  hasProfile = true;
  ensureLoaded = () => Promise.resolve(this.hasProfile);
  refresh = () => Promise.resolve(this.hasProfile);
  markComplete = () => undefined;
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

  /** '/' chuyển hướng sang đây, nên mọi kỳ vọng bên dưới đều quy về nó. */
  const APP_HOME = '/channels/@me';
  // Viết thẳng chuỗi thay vì dựng bằng encodeURIComponent: bộ mã hoá URL của
  // Angular giữ nguyên '@' trong query (ký tự này hợp lệ ở đó), còn
  // encodeURIComponent đổi thành %40 — dựng bằng hàm sẽ ra một kỳ vọng sai.
  const LOGIN_WITH_RETURN = '/login?returnUrl=%2Fchannels%2F@me';

  it('sends a guest landing on / to the login page', async () => {
    auth.authenticated = false;

    await harness.navigateByUrl('/');

    // '/' redirect sang APP_HOME trước khi guard chạy, nên returnUrl là APP_HOME.
    expect(TestBed.inject(Router).url).toBe(LOGIN_WITH_RETURN);
  });

  it('funnels an unknown path through the wildcard to login', async () => {
    auth.authenticated = false;

    await harness.navigateByUrl('/chat');

    // Wildcard viết lại '/chat' thành APP_HOME trước khi guard chạy, nên returnUrl
    // là APP_HOME chứ không phải '/chat'. Khi có trang thật cho đường dẫn đó thì
    // nó khớp trước và URL của chính nó được nhớ lại.
    expect(TestBed.inject(Router).url).toBe(LOGIN_WITH_RETURN);
  });

  it('lets a signed-in user reach the app', async () => {
    auth.authenticated = true;

    await harness.navigateByUrl('/');

    expect(TestBed.inject(Router).url).toBe(APP_HOME);
  });

  it('keeps a signed-in user off the login page', async () => {
    auth.authenticated = true;

    await harness.navigateByUrl('/login');

    expect(TestBed.inject(Router).url).toBe(APP_HOME);
  });

  it('does not bounce a guest away from the login page', async () => {
    auth.authenticated = false;

    await harness.navigateByUrl('/login');

    expect(TestBed.inject(Router).url).toBe('/login');
  });
});
