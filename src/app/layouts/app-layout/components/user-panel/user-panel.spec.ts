import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { ProfileService } from '../../../../core/profile/profile.service';
import { UserPanel } from './user-panel';

class AuthStub {
  signOut = () => Promise.resolve();
}

describe('UserPanel', () => {
  let profile: { current: () => unknown; reset: () => void };

  const mount = async () => {
    await TestBed.configureTestingModule({
      imports: [UserPanel],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: new AuthStub() },
        { provide: ProfileService, useValue: profile },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(UserPanel);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    profile = {
      current: () => ({ id: 'u1', username: 'minhtai', displayName: 'Minh Tài' }),
      reset: () => undefined,
    };
  });

  it('hiện tên hiển thị của người đang đăng nhập', async () => {
    const fixture = await mount();

    expect(fixture.nativeElement.textContent).toContain('Minh Tài');
  });

  it('chưa có tên hiển thị thì rơi về tên đăng nhập', async () => {
    profile.current = () => ({ id: 'u1', username: 'minhtai', displayName: null });
    const fixture = await mount();

    expect(fixture.nativeElement.textContent).toContain('minhtai');
  });

  it('chưa tải được hồ sơ vẫn không để trống chỗ tên', async () => {
    profile.current = () => null;
    const fixture = await mount();

    expect(fixture.nativeElement.textContent).toContain('Bạn');
  });

  it('nút mic và loa đổi trạng thái tại chỗ', async () => {
    const fixture = await mount();
    const mic = fixture.nativeElement.querySelectorAll('[aria-pressed]')[0] as HTMLButtonElement;

    expect(mic.getAttribute('aria-pressed')).toBe('false');
    mic.click();
    fixture.detectChanges();
    expect(mic.getAttribute('aria-pressed')).toBe('true');
  });
});
