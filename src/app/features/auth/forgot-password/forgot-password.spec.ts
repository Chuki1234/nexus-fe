import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthError } from '@supabase/supabase-js';
import { AuthService } from '../../../core/auth/auth.service';
import { ForgotPasswordPage } from './forgot-password';

class AuthServiceStub {
  sendPasswordResetCode = vi.fn().mockResolvedValue(undefined);
  verifyPasswordResetCode = vi.fn().mockResolvedValue(undefined);
  updatePassword = vi.fn().mockResolvedValue(undefined);
}

describe('ForgotPasswordPage', () => {
  let fixture: ComponentFixture<ForgotPasswordPage>;
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

  const heading = () => fixture.nativeElement.querySelector('[data-step-heading]').textContent;

  /** Đi hết bước 1 rồi bước 2, dừng ở màn đặt mật khẩu mới. */
  const reachPasswordStep = async () => {
    setInput('email', 'ban@vidu.com');
    await submit();
    setInput('code', '123456');
    await submit();
  };

  beforeEach(async () => {
    auth = new AuthServiceStub();
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordPage],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordPage);
    fixture.detectChanges();
  });

  it('starts on the email step', () => {
    expect(heading()).toContain('Quên mật khẩu');
  });

  it('does not send anything for a malformed email', async () => {
    setInput('email', 'khong-phai-email');
    await submit();

    expect(auth.sendPasswordResetCode).not.toHaveBeenCalled();
    expect(heading()).toContain('Quên mật khẩu');
  });

  it('sends a lowercase email and moves to the code step', async () => {
    setInput('email', 'Ban@Vidu.com');
    await submit();

    expect(auth.sendPasswordResetCode).toHaveBeenCalledWith('ban@vidu.com');
    expect(heading()).toContain('Nhập mã xác thực');
  });

  it('still advances when the address has no account', async () => {
    // Dừng lại kèm thông báo lỗi ở đây sẽ tiết lộ email nào đã đăng ký.
    auth.sendPasswordResetCode.mockRejectedValue(
      new AuthError('User not found', 400, 'user_not_found'),
    );

    setInput('email', 'khong-ai@vidu.com');
    await submit();

    expect(heading()).toContain('Nhập mã xác thực');
    expect(fixture.nativeElement.querySelector('#forgot-password-error')).toBeFalsy();
  });

  it('stops on the email step when rate limited', async () => {
    auth.sendPasswordResetCode.mockRejectedValue(
      new AuthError('rate limited', 429, 'over_email_send_rate_limit'),
    );

    setInput('email', 'ban@vidu.com');
    await submit();

    expect(heading()).toContain('Quên mật khẩu');
    expect(fixture.nativeElement.querySelector('#forgot-password-error').textContent).toContain(
      'quá nhiều lần',
    );
  });

  it('rejects a code that is not six digits', async () => {
    setInput('email', 'ban@vidu.com');
    await submit();

    setInput('code', '123');
    await submit();

    expect(auth.verifyPasswordResetCode).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#code-error')).toBeTruthy();
  });

  it('verifies the code against the email captured in step one', async () => {
    await reachPasswordStep();

    expect(auth.verifyPasswordResetCode).toHaveBeenCalledWith('ban@vidu.com', '123456');
    expect(heading()).toContain('Đặt mật khẩu mới');
  });

  it('keeps the user on the code step when the code is wrong', async () => {
    auth.verifyPasswordResetCode.mockRejectedValue(new AuthError('expired', 400, 'otp_expired'));

    setInput('email', 'ban@vidu.com');
    await submit();
    setInput('code', '000000');
    await submit();

    expect(heading()).toContain('Nhập mã xác thực');
    expect(fixture.nativeElement.querySelector('#forgot-password-error').textContent).toContain(
      'hết hạn',
    );
    // Không hiện thêm lỗi field "Mã gồm đúng 6 chữ số" chồng lên banner.
    expect(fixture.nativeElement.querySelector('#code-error')).toBeFalsy();
  });

  it('xoá banner lỗi cũ khi bấm "Đổi email" quay lại bước nhập email', async () => {
    auth.verifyPasswordResetCode.mockRejectedValue(new AuthError('expired', 400, 'otp_expired'));
    setInput('email', 'ban@vidu.com');
    await submit();
    setInput('code', '000000');
    await submit();
    // Đang có banner lỗi ở bước mã.
    expect(fixture.nativeElement.querySelector('#forgot-password-error')).toBeTruthy();

    fixture.nativeElement
      .querySelectorAll('button[type="button"]')
      .forEach((b: HTMLButtonElement) => b.textContent?.includes('Đổi email') && b.click());
    fixture.detectChanges();

    expect(heading()).toContain('Quên mật khẩu');
    // Lỗi của bước mã không được dính lại sang bước email.
    expect(fixture.nativeElement.querySelector('#forgot-password-error')).toBeFalsy();
  });

  it('refuses to update when the two passwords differ', async () => {
    await reachPasswordStep();

    setInput('password', 'matkhaumoi123');
    setInput('confirm', 'khac-han');
    await submit();

    expect(auth.updatePassword).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#confirm-error').textContent).toContain(
      'chưa khớp',
    );
  });

  it('updates the password and lands the user in the app', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    await reachPasswordStep();

    setInput('password', 'matkhaumoi123');
    setInput('confirm', 'matkhaumoi123');
    await submit();

    expect(auth.updatePassword).toHaveBeenCalledWith('matkhaumoi123');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('lets the user go back and fix a mistyped email', async () => {
    setInput('email', 'go@nham.com');
    await submit();

    fixture.nativeElement
      .querySelectorAll('button[type="button"]')
      .forEach((button: HTMLButtonElement) => {
        if (button.textContent?.includes('Đổi email')) {
          button.click();
        }
      });
    fixture.detectChanges();

    expect(heading()).toContain('Quên mật khẩu');
  });
});
