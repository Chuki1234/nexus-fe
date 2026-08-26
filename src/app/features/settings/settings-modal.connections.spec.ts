import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProfilesApiService } from '../../core/api/profiles-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileService } from '../../core/profile/profile.service';
import type { OwnProfile } from '../../../shared';
import { ConnectedAppsService } from '../profile/connected-apps.service';
import { ProfileStore } from '../profile/profile-store';
import { SettingsModal } from './settings-modal';
import { UserSettingsService } from './services/user-settings.service';

const PROFILE: OwnProfile = {
  id: 'u1', username: 'testduoc', displayName: 'testduoc',
  avatarUrl: null, bannerUrl: null, statusMessage: null, bio: null, location: null,
  links: [{ label: 'YouTube', url: 'https://www.youtube.com/@ipostforfun6356' }],
  games: [],
  mutualFriends: [], mutualServers: [],
  accentColor: null, createdAt: '2026-08-01T00:00:00.000Z', isSelf: true, birthdate: '2001-11-03',
};

function setup(update: (payload: unknown) => Promise<OwnProfile> = () => Promise.resolve(PROFILE)) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: AuthService, useValue: { signOut: () => Promise.resolve(), user: () => null } },
      { provide: ProfileService, useValue: { current: () => PROFILE, reset: () => undefined } },
      {
        provide: ProfilesApiService,
        useValue: { getOwn: () => Promise.resolve(PROFILE), update },
      },
    ],
  });

  TestBed.inject(ProfileStore).set(PROFILE);
  TestBed.inject(UserSettingsService).openUserSettings('connections');

  const fixture = TestBed.createComponent(SettingsModal);
  return { fixture, apps: TestBed.inject(ConnectedAppsService), settings: TestBed.inject(UserSettingsService) };
}

describe('SettingsModal → tab Ứng dụng đã kết nối', () => {
  it('dựng đủ thước hạn mức, danh sách đang gắn và lưới nền tảng', async () => {
    const { fixture } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ứng Dụng Đã Kết Nối');
    expect(text).toContain('chỗ còn trống');
    expect(text).toContain('Đang gắn trên hồ sơ (1)');
    expect(text).toContain('Đề xuất cho bạn');
    expect(text).toContain('Zalo');
  });

  /**
   * Đây chính là lỗi người dùng gặp: bấm một nền tảng ở nhóm "Đề xuất" (trên
   * đầu danh sách hơn hai chục nền tảng) thì ô nhập PHẢI hiện ra ngay, không
   * phải cuộn xuống cuối trang mới thấy. Ô nhập giờ là popup neo đáy khung cài
   * đặt, dựng từ SettingsModal — không còn render tại chỗ bấm trong tab nữa.
   */
  it('bấm một nền tảng mở popup nhập tên tài khoản, neo ở đáy khung', async () => {
    const { fixture, apps } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('#connect-handle')).toBeNull();

    const zaloButton = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (btn) => btn.textContent?.includes('Zalo'),
    ) as HTMLButtonElement;
    expect(zaloButton).toBeTruthy();
    zaloButton.click();
    fixture.detectChanges();

    expect(apps.pending()).toEqual(expect.objectContaining({ id: 'zalo' }));

    const input = (fixture.nativeElement as HTMLElement).querySelector(
      '#connect-handle',
    ) as HTMLInputElement | null;
    expect(input).toBeTruthy();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Tên tài khoản Zalo của bạn');
    expect(root.textContent).toContain('Gắn vào hồ sơ');
  });

  it('điền tên tài khoản rồi bấm Gắn vào hồ sơ là lưu thật qua API', async () => {
    const sent: unknown[] = [];
    const { fixture, apps } = setup((payload) => {
      sent.push(payload);
      return Promise.resolve(PROFILE);
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    apps.startConnect(
      apps.recommended().find((p) => p.id === 'zalo')!,
    );
    apps.handle.set('0912345678');
    fixture.detectChanges();

    const form = (fixture.nativeElement as HTMLElement).querySelector('#connect-handle')!.closest('form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(sent).toEqual([
      {
        links: [
          { label: 'YouTube', url: 'https://www.youtube.com/@ipostforfun6356' },
          { label: 'Zalo', url: 'https://zalo.me/0912345678' },
        ],
      },
    ]);
    // Lưu xong đóng popup lại — không để ô nhập trống nằm lại trên màn hình.
    expect(apps.pending()).toBeNull();
  });

  it('Hủy đóng popup và không gọi API', async () => {
    const { fixture, apps } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    apps.startCustom();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('#custom-label')).toBeTruthy();

    const cancelBtn = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (btn) => btn.textContent?.trim() === 'Hủy',
    ) as HTMLButtonElement;
    cancelBtn.click();
    fixture.detectChanges();

    expect(apps.pending()).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('#custom-label')).toBeNull();
  });

  it('rời khỏi tab Ứng dụng đã kết nối thì ẩn popup dù chưa hủy', async () => {
    const { fixture, apps, settings } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    apps.startConnect(apps.recommended().find((p) => p.id === 'facebook')!);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('#connect-handle')).toBeTruthy();

    settings.setTab('profile');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('#connect-handle')).toBeNull();
  });

  it('đóng khung cài đặt thì bỏ luôn popup đang mở', async () => {
    const { fixture, apps, settings } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    apps.startCustom();
    expect(apps.pending()).toBe('custom');

    settings.close();

    expect(apps.pending()).toBeNull();
  });
});
