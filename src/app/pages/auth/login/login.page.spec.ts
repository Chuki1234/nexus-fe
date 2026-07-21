import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthError } from '@supabase/supabase-js';
import { AuthService } from '../../../core/auth/auth.service';
import { LoginPage } from './login.page';

class AuthServiceStub {
  signInWithPassword = vi.fn().mockResolvedValue({});
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

  it('does not call Supabase when the form is empty', async () => {
    await submit();

    expect(auth.signInWithPassword).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#email-error')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#password-error')).toBeTruthy();
  });

  it('rejects a malformed email', async () => {
    setInput('email', 'khong-phai-email');
    setInput('password', 'matkhau123');
    await submit();

    expect(auth.signInWithPassword).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#email-error').textContent).toContain('định dạng');
  });

  it('rejects a password shorter than 6 characters', async () => {
    setInput('email', 'ban@vidu.com');
    setInput('password', '123');
    await submit();

    expect(auth.signInWithPassword).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#password-error').textContent).toContain('6 ký tự');
  });

  it('signs in and navigates to returnUrl on success', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    setInput('email', 'ban@vidu.com');
    setInput('password', 'matkhau123');
    await submit();

    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'ban@vidu.com',
      password: 'matkhau123',
    });
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('shows a readable message and clears the password when credentials are wrong', async () => {
    auth.signInWithPassword.mockRejectedValue(
      new AuthError('Invalid login credentials', 400, 'invalid_credentials'),
    );

    setInput('email', 'ban@vidu.com');
    setInput('password', 'sai-mat-khau');
    await submit();

    const alert = fixture.nativeElement.querySelector('#login-error');
    expect(alert.textContent).toContain('Email hoặc mật khẩu không đúng');
    expect((fixture.nativeElement.querySelector('#password') as HTMLInputElement).value).toBe('');
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
