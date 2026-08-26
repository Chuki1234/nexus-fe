import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProfilesApiService } from '../../../../core/api/profiles-api.service';
import { ProfileService } from '../../../../core/profile/profile.service';
import type { OwnProfile } from '../../../../../shared';
import { ProfileStore } from '../../../profile/profile-store';
import { UserSettingsService } from '../../services/user-settings.service';
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
  games: [],
  mutualFriends: [],
  mutualServers: [],
  accentColor: null,
  createdAt: '2026-03-15T00:00:00.000Z',
  isSelf: true,
  birthdate: '2001-11-03',
};

function setup(profile: OwnProfile = PROFILE) {
  URL.createObjectURL ??= () => 'blob:test';
  URL.revokeObjectURL ??= () => undefined;

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      {
        provide: ProfilesApiService,
        useValue: {
          getOwn: () => Promise.resolve(profile),
          update: () => Promise.resolve(profile),
        },
      },
      { provide: ProfileService, useValue: { current: () => null } },
    ],
  });

  const store = TestBed.inject(ProfileStore);
  store.set(profile);

  // Các ô sửa đọc từ UserSettingsService, và service đó chỉ nạp hồ sơ thật vào
  // form khi khung cài đặt được mở. Không gọi thì mọi ô đều rỗng và bài test
  // hoá ra chỉ đang kiểm tra giá trị mặc định.
  const settings = TestBed.inject(UserSettingsService);
  settings.initProfileDraft();

  const fixture = TestBed.createComponent(ProfileTab);
  fixture.detectChanges();

  return { fixture, store, settings };
}

function root(fixture: { nativeElement: unknown }): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

/** Ảnh trong thẻ "Xem trước thẻ hồ sơ" — thẻ nằm ở cột giữa. */
function previewImageSources(fixture: { nativeElement: unknown }): string[] {
  return [...root(fixture).querySelectorAll('img')].map((img) => img.getAttribute('src') ?? '');
}

/** Nút chuyển tab trong bộ chuyển đổi trên cùng. */
function switcher(fixture: { nativeElement: unknown }, label: string): HTMLButtonElement {
  const button = [...root(fixture).querySelectorAll('button')].find((b) =>
    b.textContent?.includes(label),
  );
  if (!button) throw new Error(`Không thấy nút chuyển tab "${label}".`);
  return button as HTMLButtonElement;
}

describe('ProfileTab', () => {
  /**
   * `await whenStable()` là bắt buộc: `ngModel` ghi giá trị xuống DOM trong một
   * microtask, nên ngay sau `detectChanges()` đồng bộ thì ô vẫn còn rỗng.
   */
  it('nạp hồ sơ thật vào các ô sửa, không để giá trị mẫu', async () => {
    const { fixture } = setup();
    await fixture.whenStable();
    fixture.detectChanges();

    const displayName = root(fixture).querySelector<HTMLInputElement>('#p-display-name');
    const birthdate = root(fixture).querySelector<HTMLInputElement>('#p-birthdate');

    expect(displayName?.value).toBe('Test Duoc');
    expect(birthdate?.value).toBe('2001-11-03');
  });

  it('tab Hồ Sơ Chính có đủ ô sửa hồ sơ', () => {
    const { fixture } = setup();
    const el = root(fixture);

    expect(el.querySelector('#p-display-name')).toBeTruthy();
    expect(el.querySelector('#p-birthdate')).toBeTruthy();
    expect(el.querySelector('#p-status')).toBeTruthy();
    expect(el.querySelector('#p-bio')).toBeTruthy();
    // Ảnh đại diện và ảnh bìa chọn bằng <input type="file"> ẩn sau nhãn.
    expect(el.querySelector('#profile-tab-avatar-file')).toBeTruthy();
    expect(el.querySelector('#profile-tab-banner-file')).toBeTruthy();
  });

  /**
   * Thẻ tự gắn nhãn "Thời gian thực" nên phải đổi theo ô đang gõ NGAY, chứ
   * không chờ bấm Lưu — nếu không thì cái tên "xem trước" là nói dối.
   */
  it('thẻ xem trước đổi theo ô đang gõ, chưa cần bấm Lưu', () => {
    const { fixture, settings } = setup();

    expect(root(fixture).textContent).toContain('Test Duoc');

    settings.editDisplayName.set('Tên Vừa Gõ');
    settings.editBio.set('Giới thiệu vừa gõ.');
    fixture.detectChanges();

    expect(root(fixture).textContent).toContain('Tên Vừa Gõ');
    expect(root(fixture).textContent).toContain('Giới thiệu vừa gõ.');
  });

  it('thẻ xem trước hiện ảnh ĐANG CHỜ LƯU, không phải ảnh cũ đã lưu', () => {
    const { fixture, settings } = setup();

    expect(previewImageSources(fixture)).toContain('https://x/saved-banner.webp');

    settings.stageBannerFile(
      new File([new Uint8Array([1])], 'b.png', { type: 'image/png' }),
      'blob:pending-banner',
    );
    fixture.detectChanges();

    const sources = previewImageSources(fixture);
    expect(sources).not.toContain('https://x/saved-banner.webp');
    expect(sources).toContain('blob:pending-banner');
  });

  /**
   * Thẻ tự gắn nhãn "Thời gian thực" nhưng từng bỏ hẳn mục Liên kết: gắn YouTube
   * ở tab Ứng dụng đã kết nối xong quay lại đây thấy y hệt lúc chưa gắn.
   */
  it('thẻ xem trước hiện các liên kết đã gắn', () => {
    const { fixture, store } = setup();

    expect(root(fixture).textContent).not.toContain('Liên kết');

    store.set({
      ...PROFILE,
      links: [{ label: 'YouTube', url: 'https://www.youtube.com/@ipostforfun6356' }],
    });
    fixture.detectChanges();

    expect(root(fixture).textContent).toContain('Liên kết');
    expect(root(fixture).textContent).toContain('YouTube');
  });

  /** Ngày sinh phải đi ra tới thẻ hồ sơ, không chỉ nằm trong ô nhập. */
  it('thẻ xem trước hiện ngày sinh theo định dạng tiếng Việt', () => {
    const { fixture } = setup();

    expect(root(fixture).textContent).toContain('3 Tháng 11, 2001');
  });

  /**
   * Ô ngày sinh còn rỗng là trạng thái CÓ THẬT: mở khung cài đặt trước khi hồ
   * sơ tải xong thì form chưa được nạp. Lúc đó thẻ xem trước phải bỏ trống mục
   * này, không được hiện "NaN Tháng NaN".
   */
  it('ngày sinh còn rỗng thì thẻ xem trước bỏ trống mục đó', () => {
    const { fixture, settings } = setup();

    settings.editBirthdate.set('');
    fixture.detectChanges();

    // Đối chiếu ngày ĐÃ ĐỊNH DẠNG, không đối chiếu chữ "Ngày sinh": chữ đó còn
    // nằm ở nhãn ô nhập và câu hướng dẫn bên cột trái nên luôn có mặt.
    expect(root(fixture).textContent).not.toContain('3 Tháng 11, 2001');
    expect(root(fixture).textContent).not.toContain('NaN');
  });
});
