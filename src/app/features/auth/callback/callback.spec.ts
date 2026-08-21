import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CallbackPage } from './callback';

class AuthServiceStub {
  readonly authenticated = signal(false);
  isAuthenticated = () => this.authenticated();
  whenReady = vi.fn().mockResolvedValue(undefined);
  syncSession = vi.fn().mockResolvedValue(null);
  completeOAuthSignIn = vi.fn().mockResolvedValue({});
}

describe('CallbackPage', () => {
  let auth: AuthServiceStub;

  const mount = async (authenticated = false) => {
    auth = new AuthServiceStub();
    auth.authenticated.set(authenticated);
    await TestBed.configureTestingModule({
      imports: [CallbackPage],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
    const fixture = TestBed.createComponent(CallbackPage);
    fixture.detectChanges();
    return fixture;
  };

  it('báo đang xử lý trong lúc chờ Supabase đổi mã lấy phiên', async () => {
    const fixture = await mount();

    expect(fixture.nativeElement.textContent).toContain('Đang hoàn tất đăng nhập');
  });

  it('thông báo dùng aria-live để trình đọc màn hình đọc được', async () => {
    // Trang này không có gì để bấm; nếu không có vùng live thì người dùng dùng
    // trình đọc màn hình sẽ không biết chuyện gì đang xảy ra.
    const fixture = await mount();
    const status = fixture.nativeElement.querySelector('[role=status]') as HTMLElement;

    expect(status).toBeTruthy();
    expect(status.getAttribute('aria-live')).toBe('polite');
  });

  it('có phiên rồi thì điều hướng tiếp', async () => {
    const fixture = await mount();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    auth.authenticated.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('không bị đứng khi phiên đã có trước lúc callback được dựng', async () => {
    await expect(mount(true)).resolves.toBeTruthy();
  });

  it('chủ động đọc lại session nếu sự kiện OAuth đã xảy ra trước khi callback lắng nghe', async () => {
    auth = new AuthServiceStub();
    const fixture = await mount();
    await fixture.whenStable();

    expect(auth.whenReady).toHaveBeenCalledOnce();
    expect(auth.syncSession).toHaveBeenCalledOnce();
  });

  it('bắt được session hoàn tất muộn mà không cần refresh trang', async () => {
    vi.useFakeTimers();
    const fixture = await mount();
    auth.syncSession.mockImplementation(async () => {
      auth.authenticated.set(true);
      return {};
    });

    await vi.advanceTimersByTimeAsync(250);
    fixture.detectChanges();

    expect(auth.isAuthenticated()).toBe(true);
    vi.useRealTimers();
  });
});
