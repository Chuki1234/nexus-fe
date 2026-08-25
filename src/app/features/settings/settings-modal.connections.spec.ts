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
  id: 'u1',
  username: 'testduoc',
  displayName: 'testduoc',
  avatarUrl: null,
  bannerUrl: null,
  statusMessage: null,
  bio: null,
  location: null,
  links: [{ label: 'YouTube', url: 'https://www.youtube.com/@ipostforfun6356' }],
  accentColor: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  isSelf: true,
  birthdate: '2001-11-03',
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

  it('bấm một nền tảng chuyển trạng thái pending của ConnectedAppsService', async () => {
    const { fixture, apps } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const zaloButton = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (btn) => btn.textContent?.includes('Zalo'),
    ) as HTMLButtonElement;
    expect(zaloButton).toBeTruthy();
    zaloButton.click();
    fixture.detectChanges();

    expect(apps.pending()).toEqual(expect.objectContaining({ id: 'zalo' }));
  });

  it('thêm nền tảng custom qua ConnectedAppsService lưu thành công', async () => {
    const sent: unknown[] = [];
    const { apps } = setup((payload) => {
      sent.push(payload);
      return Promise.resolve(PROFILE);
    });

    apps.startCustom();
    apps.customLabel.set('Portfolio');
    apps.customUrl.set('https://minhtai.dev');
    await apps.confirmCustom();

    expect(sent).toEqual([
      {
        links: [
          { label: 'YouTube', url: 'https://www.youtube.com/@ipostforfun6356' },
          { label: 'Portfolio', url: 'https://minhtai.dev' },
        ],
      },
    ]);
  });
});
