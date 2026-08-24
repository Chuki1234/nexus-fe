import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProfilesApiService } from '../../../../core/api/profiles-api.service';
import { ProfileService } from '../../../../core/profile/profile.service';
import type { OwnProfile } from '../../../../../shared';
import { ProfilePendingImages } from '../../../profile/pending-images';
import { ProfileStore } from '../../../profile/profile-store';
import { ProfileTab } from './profile-tab';

const PROFILE: OwnProfile = {
  id: 'u1',
  username: 'testduoc',
  displayName: 'Test Duoc',
  avatarUrl: 'https://x/saved-avatar.webp',
  bannerUrl: 'https://x/saved-banner.webp',
  statusMessage: null,
  bio: null,
  location: null,
  links: [],
  accentColor: null,
  createdAt: '2026-03-15T00:00:00.000Z',
  isSelf: true,
  birthdate: '2001-11-03',
};

function setup() {
  URL.createObjectURL ??= () => 'blob:test';
  URL.revokeObjectURL ??= () => undefined;

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: ProfilesApiService, useValue: { getOwn: () => Promise.resolve(PROFILE) } },
      { provide: ProfileService, useValue: { current: () => null } },
    ],
  });

  const fixture = TestBed.createComponent(ProfileTab);
  const store = TestBed.inject(ProfileStore);
  store.set(PROFILE);
  fixture.detectChanges();

  return { fixture, store, staged: TestBed.inject(ProfilePendingImages) };
}

/** Ảnh trong thẻ "Xem trước thẻ hồ sơ" — thẻ nằm ở cột phải, dùng `app-avatar`. */
function previewImageSources(fixture: { nativeElement: unknown }): string[] {
  const root = fixture.nativeElement as HTMLElement;
  return [...root.querySelectorAll('img')].map((img) => img.getAttribute('src') ?? '');
}

describe('ProfileTab', () => {
  it('thẻ xem trước hiện ảnh ĐANG CHỜ LƯU, không phải ảnh cũ đã lưu', () => {
    const { fixture, staged } = setup();

    expect(previewImageSources(fixture)).toContain('https://x/saved-banner.webp');

    staged.stage('banner', new File([new Uint8Array([1])], 'b.png', { type: 'image/png' }));
    fixture.detectChanges();

    const sources = previewImageSources(fixture);
    expect(sources).not.toContain('https://x/saved-banner.webp');
    expect(sources.some((src) => src.startsWith('blob:'))).toBe(true);
  });

  /**
   * Thẻ tự gắn nhãn "Thời gian thực" nhưng từng bỏ hẳn mục Liên kết: gắn YouTube
   * ở tab Ứng dụng đã kết nối xong quay lại đây thấy y hệt lúc chưa gắn.
   */
  it('thẻ xem trước hiện các liên kết đã gắn', () => {
    const { fixture, store } = setup();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Liên kết');

    store.set({
      ...PROFILE,
      links: [{ label: 'YouTube', url: 'https://www.youtube.com/@ipostforfun6356' }],
    });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Liên kết');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('YouTube');
  });

  it('tab Hồ Sơ Chính có đủ ô sửa hồ sơ', () => {
    const { fixture } = setup();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('#profile-display-name')).toBeTruthy();
    expect(root.querySelector('app-profile-images')).toBeTruthy();
  });

  it('tab Hồ Sơ Theo Máy Chủ KHÔNG cho sửa hồ sơ chính', () => {
    const { fixture } = setup();
    const root = fixture.nativeElement as HTMLElement;

    // Nút chuyển tab thứ hai trong bộ chuyển đổi.
    const serverTab = [...root.querySelectorAll('button')].find(
      (b) => b.textContent?.includes('Hồ Sơ Theo Máy Chủ'),
    );
    serverTab?.click();
    fixture.detectChanges();

    // Đây là lỗi cũ: các ô này từng hiện ở tab máy chủ và ghi thẳng vào hồ sơ chính.
    expect(root.querySelector('app-profile-images')).toBeNull();
    expect(root.querySelector('#profile-display-name')).toBeNull();
    expect(root.querySelector('#profile-bio')).toBeNull();
    expect(root.textContent).toContain('Hồ sơ riêng cho từng máy chủ chưa dùng được');
  });
});
