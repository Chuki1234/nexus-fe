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
    expect(
      fixture.nativeElement.querySelector('button')?.classList.contains('nexus-interactive-row'),
    ).toBe(true);
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
    expect(mic.classList.contains('nexus-audio-toggle')).toBe(true);
    mic.click();
    fixture.detectChanges();
    expect(mic.getAttribute('aria-pressed')).toBe('true');
  });

  it('giữ ba control trong grid 36px để tên dài không tạo overflow ngang', async () => {
    profile.current = () => ({
      id: 'u1',
      username: 'minhtai',
      displayName: 'Nguyễn Minh Tài có tên hiển thị rất dài',
    });
    const fixture = await mount();
    const controls = Array.from(
      fixture.nativeElement.querySelectorAll('button.nexus-icon-control'),
    ) as HTMLButtonElement[];

    expect(fixture.nativeElement.classList.contains('overflow-hidden')).toBe(true);
    expect(controls).toHaveLength(3);
    expect(controls.every((control) => control.classList.contains('!size-9'))).toBe(true);
    expect(fixture.nativeElement.querySelector('button.overflow-hidden')).toBeTruthy();
  });

  it('để nút cài đặt làm integration seam và không dựng UI của team Settings', async () => {
    const fixture = await mount();
    const settings = fixture.nativeElement.querySelector(
      'button[aria-label="Cài đặt — do team Settings phụ trách"]',
    ) as HTMLButtonElement;

    expect(settings).toBeTruthy();
    expect(settings.disabled).toBe(true);
    expect(settings.textContent).toContain('settings');
    expect(settings.classList.contains('nexus-icon-control')).toBe(true);
    expect(fixture.nativeElement.ownerDocument.body.querySelector('.nexus-settings-dialog')).toBe(
      null,
    );
  });
});
