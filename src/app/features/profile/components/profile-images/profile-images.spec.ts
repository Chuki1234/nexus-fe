import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProfilesApiService } from '../../../../core/api/profiles-api.service';
import type { OwnProfile } from '../../../../../shared';
import { ProfileStore } from '../../profile-store';
import { ProfileImages } from './profile-images';

const PROFILE: OwnProfile = {
  id: 'u1',
  username: 'ducpham',
  displayName: 'Đức Phạm',
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

function setup(api: Partial<ProfilesApiService> = {}) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: ProfilesApiService, useValue: { getOwn: () => Promise.resolve(PROFILE), ...api } },
    ],
  });
  const fixture = TestBed.createComponent(ProfileImages);
  return { fixture, store: TestBed.inject(ProfileStore) };
}

describe('ProfileImages', () => {
  it('chưa có ảnh bìa thì mời tải lên, không hiện nút gỡ', () => {
    const { fixture, store } = setup();
    store.set(PROFILE);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Tải ảnh bìa');
    expect(text).not.toContain('Gỡ ảnh bìa');
  });

  it('có ảnh rồi thì đổi nhãn thành "Đổi" và hiện nút gỡ', () => {
    const { fixture, store } = setup();
    store.set({ ...PROFILE, avatarUrl: 'https://x/a.webp', bannerUrl: 'https://x/b.webp' });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Đổi ảnh bìa');
    expect(text).toContain('Gỡ ảnh bìa');
    expect(text).toContain('Gỡ ảnh');
  });

  it('ô chọn tệp nhận đúng các định dạng ảnh cho phép', () => {
    const { fixture, store } = setup();
    store.set(PROFILE);
    fixture.detectChanges();

    const input = (fixture.nativeElement as HTMLElement).querySelector('input[type="file"]');
    expect(input?.getAttribute('accept')).toContain('image/jpeg');
    expect(input?.getAttribute('accept')).toContain('image/webp');
  });
});
