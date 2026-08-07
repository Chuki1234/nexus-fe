import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CallbackPage } from './callback.page';

class AuthServiceStub {
  readonly authenticated = signal(false);
  isAuthenticated = () => this.authenticated();
}

describe('CallbackPage', () => {
  let auth: AuthServiceStub;

  const mount = async () => {
    auth = new AuthServiceStub();
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
});
