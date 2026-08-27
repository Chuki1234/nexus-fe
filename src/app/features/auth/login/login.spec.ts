import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { LoginPage } from './login';

class AuthServiceStub {
  signIn = vi.fn().mockResolvedValue({});
  signInWithGoogle = vi.fn().mockResolvedValue(undefined);
  fastLoginTotp = vi.fn().mockResolvedValue({});
  blockedGoogleAttempt = vi.fn().mockReturnValue(null);
}

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let auth: AuthServiceStub;

  const setInput = (id: string, value: string) => {
    const input = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  const submit = async () => {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    auth = new AuthServiceStub();
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
  });

  it('links the desktop mascot back to the public landing page', () => {
    const mascotLink = fixture.nativeElement.querySelector(
      '.brand-mascot-link',
    ) as HTMLAnchorElement;

    expect(mascotLink.getAttribute('href')).toBe('/');
    expect(mascotLink.getAttribute('aria-label')).toBe('Về trang giới thiệu Nexus');
  });

  it('does not call the backend when the form is empty', async () => {
    await submit();

    expect(auth.signIn).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#identifier-error')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#password-error')).toBeTruthy();
  });

  it('accepts a username, not just an email', async () => {
    setInput('identifier', 'monnguyen');
    setInput('password', 'matkhau123');
    await submit();

    expect(auth.signIn).toHaveBeenCalledWith({
      identifier: 'monnguyen',
      password: 'matkhau123',
    });
  });

  it('signs in and navigates to returnUrl on success', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    setInput('identifier', 'ban@vidu.com');
    setInput('password', 'matkhau123');
    await submit();

    expect(auth.signIn).toHaveBeenCalledWith({
      identifier: 'ban@vidu.com',
      password: 'matkhau123',
    });
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('shows one generic message and clears the password when credentials are wrong', async () => {
    auth.signIn.mockRejectedValue(
      new HttpErrorResponse({ status: 401, error: { message: 'bất kỳ' } }),
    );

    setInput('identifier', 'ban@vidu.com');
    setInput('password', 'sai-mat-khau');
    await submit();

    const alert = fixture.nativeElement.querySelector('#login-error');
    expect(alert.textContent).toContain('Email/tên đăng nhập hoặc mật khẩu không đúng');
    expect((fixture.nativeElement.querySelector('#password') as HTMLInputElement).value).toBe('');
  });

  it('does not stack a field error on top of the wrong-credentials banner', async () => {
    // Sau khi đăng nhập sai, ô mật khẩu bị reset. Không được hiện thêm "Vui lòng
    // nhập mật khẩu" chồng lên banner — banner đã nói rõ lý do rồi.
    auth.signIn.mockRejectedValue(
      new HttpErrorResponse({ status: 401, error: { message: 'bất kỳ' } }),
    );

    setInput('identifier', 'ban@vidu.com');
    setInput('password', 'sai-mat-khau');
    await submit();

    expect(fixture.nativeElement.querySelector('#login-error')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#password-error')).toBeFalsy();
  });

  it('does not reveal whether the account exists', async () => {
    // Hai nguyên nhân khác hẳn nhau phải ra đúng một câu, nếu không thì người
    // ngoài dò được email/tên đăng nhập nào đã có người dùng.
    const messageFor = async (status: number) => {
      auth.signIn.mockRejectedValue(new HttpErrorResponse({ status }));
      setInput('identifier', 'ban@vidu.com');
      setInput('password', 'sai-mat-khau');
      await submit();
      return fixture.nativeElement.querySelector('#login-error').textContent.trim();
    };

    expect(await messageFor(401)).toBe(await messageFor(403));
  });

  it('tells the user to wait when rate limited', async () => {
    auth.signIn.mockRejectedValue(new HttpErrorResponse({ status: 429 }));

    setInput('identifier', 'ban@vidu.com');
    setInput('password', 'matkhau123');
    await submit();

    expect(fixture.nativeElement.querySelector('#login-error').textContent).toContain(
      'quá nhiều lần',
    );
  });

  it('toggles password visibility', () => {
    const password = fixture.nativeElement.querySelector('#password') as HTMLInputElement;
    const toggle = fixture.nativeElement.querySelector(
      'button[aria-controls="password"]',
    ) as HTMLButtonElement;

    expect(password.type).toBe('password');

    toggle.click();
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('#password') as HTMLInputElement).type).toBe(
      'text',
    );
  });
});
