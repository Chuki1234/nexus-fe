import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { convertToParamMap, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ProfilesApiService } from '../../../core/api/profiles-api.service';
import type { PublicProfile } from '../../../../shared';
import { ProfileViewPage } from './view';

const PERSON: PublicProfile = {
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
  isSelf: false,
};

function setup(api: Partial<ProfilesApiService>) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      {
        provide: ProfilesApiService,
        // `ProfileCard` (được `ProfileViewPage` render) tự tải ghi chú riêng
        // của người xem khi hồ sơ không phải của chính mình.
        useValue: { getNote: () => Promise.resolve({ text: '' }), ...api },
      },
      {
        provide: ActivatedRoute,
        useValue: { paramMap: of(convertToParamMap({ username: 'ducpham' })) },
      },
    ],
  });
  return TestBed.createComponent(ProfileViewPage);
}

describe('ProfileViewPage', () => {
  it('tải hồ sơ theo username trên URL rồi hiện tên', async () => {
    const fixture = setup({ getByUsername: () => Promise.resolve(PERSON) });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Đức Phạm');
  });

  it('không tìm thấy người dùng thì hiện lỗi thay vì trang trống', async () => {
    const fixture = setup({
      getByUsername: () => Promise.reject({ status: 404, error: { message: 'Không tìm thấy.' } }),
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect(el.textContent).toContain('Không mở được hồ sơ');
  });

  /**
   * Hai nút "xem dạng cửa sổ nổi" và "chép liên kết" nằm TRONG thẻ hồ sơ, cạnh
   * nút hành động chính — không còn trên thanh header. Thanh header chỉ còn
   * link quay lại và ô tìm người, mỗi thứ một đầu.
   */
  it('chiếu nút hành động vào thẻ hồ sơ, header không còn nút nào', async () => {
    const fixture = setup({ getByUsername: () => Promise.resolve(PERSON) });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const header = el.querySelector('header')!;
    const card = el.querySelector('app-profile-card')!;

    expect(card.querySelector('[slot="action"]')).not.toBeNull();
    expect(header.querySelector('[slot="action"]')).toBeNull();
    expect(header.querySelectorAll('button').length).toBe(0);

    // Nhãn cho trình đọc màn hình: mat-icon đều `aria-hidden`, nên hai chuỗi
    // này là tên khả truy cập DUY NHẤT của hai nút.
    expect(el.textContent).toContain('Xem hồ sơ dạng cửa sổ nổi');
    expect(el.textContent).toContain('Sao chép liên kết hồ sơ');
  });
});
