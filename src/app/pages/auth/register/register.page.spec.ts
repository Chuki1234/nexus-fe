import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { RegistrationService } from '../services/registration.service';
import { RegisterPage } from './register.page';

class RegistrationServiceStub {
  register = vi.fn().mockResolvedValue({ id: 'u1' });
}

class AuthServiceStub {
  signInWithPassword = vi.fn().mockResolvedValue({});
}

describe('RegisterPage', () => {
  let fixture: ComponentFixture<RegisterPage>;
  let registration: RegistrationServiceStub;
  let auth: AuthServiceStub;

  const setInput = (id: string, value: string) => {
    const input = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  const setSelect = (label: string, value: string) => {
    const select = fixture.nativeElement.querySelector(
      `select[aria-label="${label}"]`,
    ) as HTMLSelectElement;
    // Angular gắn value thật vào thuộc tính `value` của <option>, không phải chỉ số.
    select.selectedIndex = Array.from(select.options).findIndex((option) => option.value === value);
    select.dispatchEvent(new Event('change'));
  };

  /** Điền một form hợp lệ; truyền `overrides` để làm hỏng đúng một chỗ. */
  const fillValidForm = (overrides: Partial<Record<string, string>> = {}) => {
    setInput('email', overrides['email'] ?? 'ban@vidu.com');
    setInput('displayName', overrides['displayName'] ?? 'Bạn Của Tôi');
    setInput('username', overrides['username'] ?? 'ban_cua_toi');
    setInput('password', overrides['password'] ?? 'matkhau12345');
    setSelect('Ngày', overrides['day'] ?? '15');
    setSelect('Tháng', overrides['month'] ?? '6');
    setSelect('Năm', overrides['year'] ?? '2000');
  };

  const submit = async () => {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    registration = new RegistrationServiceStub();
    auth = new AuthServiceStub();

    await TestBed.configureTestingModule({
      imports: [RegisterPage],
      providers: [
        provideRouter([]),
        { provide: RegistrationService, useValue: registration },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterPage);
    fixture.detectChanges();
  });

  it('does not call the backend when the form is empty', async () => {
    await submit();

    expect(registration.register).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#email-error')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#username-error')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#password-error')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#birthdate-error')).toBeTruthy();
  });

  it('rejects a username with characters outside the allowed set', async () => {
    fillValidForm({ username: 'tên có dấu' });
    await submit();

    expect(registration.register).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#username-error').textContent).toContain('3–32');
  });

  it('rejects a password shorter than 8 characters', async () => {
    fillValidForm({ password: 'ngan' });
    await submit();

    expect(registration.register).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#password-error').textContent).toContain('8 ký tự');
  });

  it('rejects a day/month pair that does not exist', async () => {
    fillValidForm({ day: '31', month: '2' });
    await submit();

    expect(registration.register).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#birthdate-error').textContent).toContain(
      'không tồn tại',
    );
  });

  it('rejects a birthdate under the minimum age', async () => {
    fillValidForm({ year: String(new Date().getUTCFullYear() - 5) });
    await submit();

    expect(registration.register).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#birthdate-error').textContent).toContain(
      'chưa đủ tuổi',
    );
  });

  it('sends a lowercase username and an ISO birthdate, then signs in', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fillValidForm({ username: 'Ban_Cua_Toi' });
    await submit();

    expect(registration.register).toHaveBeenCalledWith({
      email: 'ban@vidu.com',
      username: 'ban_cua_toi',
      displayName: 'Bạn Của Tôi',
      password: 'matkhau12345',
      birthdate: '2000-06-15',
    });
    expect(auth.signInWithPassword).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('omits displayName when the field is left empty', async () => {
    fillValidForm({ displayName: '' });
    await submit();

    expect(registration.register).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: undefined }),
    );
  });

  it('shows the conflict message from the backend and clears the password', async () => {
    registration.register.mockRejectedValue(
      new HttpErrorResponse({
        status: 409,
        error: { statusCode: 409, message: 'Tên đăng nhập này đã có người dùng.' },
      }),
    );

    fillValidForm();
    await submit();

    expect(fixture.nativeElement.querySelector('#register-error').textContent).toContain(
      'đã có người dùng',
    );
    expect((fixture.nativeElement.querySelector('#password') as HTMLInputElement).value).toBe('');
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('still lands the user on /login when the account is created but sign-in fails', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    auth.signInWithPassword.mockRejectedValue(new Error('mạng hỏng'));

    fillValidForm();
    await submit();

    expect(navigate).toHaveBeenCalledWith('/login');
    expect(fixture.nativeElement.querySelector('#register-error')).toBeFalsy();
  });
});
