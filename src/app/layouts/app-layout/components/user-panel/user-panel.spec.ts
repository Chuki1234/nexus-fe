import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProfilesApiService } from '../../../../core/api/profiles-api.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ProfileService } from '../../../../core/profile/profile.service';
import { ProfileStore } from '../../../../features/profile/profile-store';
import type { OwnProfile } from '../../../../../shared';
import { UserPanel } from './user-panel';

const OWN_PROFILE: OwnProfile = {
  id: 'u1',
  username: 'minhtai',
  displayName: 'Minh Tài',
  avatarUrl: 'https://x/avatar.webp',
  bannerUrl: null,
  statusMessage: null,
  bio: null,
  location: null,
  links: [],
  accentColor: null,
  createdAt: '2026-03-15T00:00:00.000Z',
  isSelf: true,
  birthdate: '2001-11-03',
};

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
        {
          provide: ProfilesApiService,
          useValue: { getOwn: () => Promise.resolve(OWN_PROFILE) },
        },
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

  it('giữ trạng thái menu-open trên khối danh tính để hover và active dùng chung tín hiệu', async () => {
    const fixture = await mount();
    const identity = fixture.nativeElement.querySelector(
      'button.user-panel__identity',
    ) as HTMLButtonElement;

    expect(identity.getAttribute('aria-expanded')).toBe('false');
    identity.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(identity.getAttribute('aria-expanded')).toBe('true');
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

  it('tách danh tính và control group để tên dài không tạo overflow ngang', async () => {
    profile.current = () => ({
      id: 'u1',
      username: 'minhtai',
      displayName: 'Nguyễn Minh Tài có tên hiển thị rất dài',
    });
    const fixture = await mount();
    const controls = Array.from(
      fixture.nativeElement.querySelectorAll('button.nexus-icon-control'),
    ) as HTMLButtonElement[];
    const identity = fixture.nativeElement.querySelector(
      'button.user-panel__identity',
    ) as HTMLButtonElement;
    const controlGroup = fixture.nativeElement.querySelector(
      '.user-panel__controls[role="group"]',
    ) as HTMLDivElement;

    expect(fixture.nativeElement.classList.contains('overflow-hidden')).toBe(true);
    expect(controls).toHaveLength(3);
    expect(controls.every((control) => control.classList.contains('user-panel__control'))).toBe(
      true,
    );
    expect(identity).toBeTruthy();
    expect(identity.textContent).toContain('Nguyễn Minh Tài');
    expect(controlGroup.getAttribute('aria-label')).toBe('Điều khiển âm thanh và ứng dụng');
  });

  /**
   * Bấm vào avatar của CHÍNH MÌNH trước đây chỉ ra một menu hai lệnh xoá tài
   * khoản / đăng xuất. Giờ phải là thẻ hồ sơ nhỏ, còn hai lệnh kia lùi xuống
   * làm hành động phụ trong thẻ.
   */
  it('bấm khối danh tính bung thẻ hồ sơ nhỏ, không phải menu', async () => {
    const fixture = await mount();
    TestBed.inject(ProfileStore).set(OWN_PROFILE);

    (fixture.nativeElement.querySelector('button.user-panel__identity') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // Thẻ nổi nằm trong overlay container của CDK, không nằm trong host.
    const card = document.querySelector('app-profile-popover');
    expect(card).toBeTruthy();
    expect(document.querySelector('.mat-mdc-menu-panel')).toBeNull();

    const text = card?.textContent ?? '';
    expect(text).toContain('Minh Tài');
    expect(text).toContain('@minhtai');
    expect(text).toContain('Xem hồ sơ đầy đủ');
  });

  /**
   * Cài đặt đã có nút bánh răng ngay cạnh; Đăng xuất và Xóa tài khoản nằm trong
   * màn Cài đặt. Nhắc lại ở thẻ hồ sơ chỉ làm nó trông như một menu thoát.
   */
  it('thẻ hồ sơ không nhắc lại cài đặt, đăng xuất hay xóa tài khoản', async () => {
    const fixture = await mount();
    TestBed.inject(ProfileStore).set(OWN_PROFILE);

    (fixture.nativeElement.querySelector('button.user-panel__identity') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = document.querySelector('app-profile-popover')?.textContent ?? '';
    expect(text).not.toContain('Đăng xuất');
    expect(text).not.toContain('Xóa tài khoản');
  });

  it('avatar ở thanh đáy dùng ảnh thật chứ không rơi về chữ cái', async () => {
    const fixture = await mount();
    TestBed.inject(ProfileStore).set(OWN_PROFILE);
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector(
      'button.user-panel__identity app-avatar img',
    ) as HTMLImageElement | null;
    expect(img?.getAttribute('src')).toBe('https://x/avatar.webp');
  });

  /**
   * Test này trước đây khẳng định nút cài đặt phải bị KHOÁ — nó là "integration
   * seam" giữ chỗ trong lúc team Settings chưa dựng xong UI. Giờ SettingsModal
   * đã có và đã được gắn vào app-layout, nên chỗ giữ chỗ đó thành nút thật.
   *
   * Vẫn kiểm rằng user-panel KHÔNG tự dựng UI cài đặt (chỉ gọi service) — đó
   * mới là ý nghĩa còn giá trị của test cũ.
   */
  it('nút cài đặt bấm được và không tự dựng UI của team Settings', async () => {
    const fixture = await mount();
    const settings = fixture.nativeElement.querySelector(
      'button.user-panel__control--settings',
    ) as HTMLButtonElement;

    expect(settings).toBeTruthy();
    expect(settings.disabled).toBe(false);
    expect(settings.textContent).toContain('settings');
    expect(settings.classList.contains('nexus-icon-control')).toBe(true);
    expect(fixture.nativeElement.querySelector('app-settings-modal')).toBe(null);
  });
});
