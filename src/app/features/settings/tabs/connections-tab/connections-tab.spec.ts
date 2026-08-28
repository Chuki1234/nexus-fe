import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProfilesApiService } from '../../../../core/api/profiles-api.service';
import type { OwnProfile } from '../../../../../shared';
import { ProfileStore } from '../../../profile/profile-store';
import { ConnectionsTab } from './connections-tab';

const PROFILE: OwnProfile = {
  id: 'u1',
  username: 'testduoc',
  displayName: 'Test Duoc',
  avatarUrl: null,
  bannerUrl: null,
  statusMessage: null,
  bio: null,
  location: null,
  links: [],
  games: [],
  mutualFriends: [],
  mutualServers: [],
  accentColor: null,
  createdAt: '2026-03-15T00:00:00.000Z',
  isSelf: true,
  birthdate: '2001-11-03',
};

describe('ConnectionsTab', () => {
  it('dựng được và hiện lưới nền tảng', () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: ProfilesApiService,
          useValue: { getOwn: () => Promise.resolve(PROFILE), update: () => Promise.resolve(PROFILE) },
        },
      ],
    });
    const fixture = TestBed.createComponent(ConnectionsTab);
    TestBed.inject(ProfileStore).set(PROFILE);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Đề xuất cho bạn');
    expect(root.textContent).toContain('Zalo');
    expect(root.querySelectorAll('button').length).toBeGreaterThan(10);
    expect(root.querySelector('img[src="/assets/platform-logos/zalo.svg"]')).not.toBeNull();
    expect(root.querySelector('img[src="/assets/platform-logos/facebook.svg"]')).not.toBeNull();
  });

  it('dựng được khi hồ sơ có sẵn liên kết nền tảng VÀ liên kết tự do', () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: ProfilesApiService,
          useValue: { getOwn: () => Promise.resolve(PROFILE), update: () => Promise.resolve(PROFILE) },
        },
      ],
    });
    const fixture = TestBed.createComponent(ConnectionsTab);
    TestBed.inject(ProfileStore).set({
      ...PROFILE,
      links: [
        { label: 'YouTube', url: 'https://www.youtube.com/@ipostforfun6356' },
        { label: 'Blog', url: 'https://blog.ca-nhan.vn/bai' },
      ],
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Đang gắn trên hồ sơ (2)');
    expect(root.textContent).toContain('chỗ còn trống');
    expect(root.textContent).toContain('Tự thêm');
    expect(root.querySelector('img[src="/assets/platform-logos/youtube.svg"]')).not.toBeNull();
  });

  it('dựng được khi hồ sơ CHƯA tải xong (profile null)', () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: ProfilesApiService,
          useValue: {
            getOwn: () => new Promise<OwnProfile>(() => undefined),
            update: () => Promise.resolve(PROFILE),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(ConnectionsTab);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Đang gắn trên hồ sơ (0)');
    expect(root.textContent).toContain('Đề xuất cho bạn');
  });
});
