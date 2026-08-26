import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { ProfilesApiService } from '../../../../core/api/profiles-api.service';
import type { PublicProfile } from '../../../../../shared';
import { ProfileModal, type ProfileModalData } from './profile-modal';

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

function setup(data: ProfileModalData, api: Partial<ProfilesApiService> = {}) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: MatDialogRef, useValue: { close: () => {} } },
      {
        provide: ProfilesApiService,
        // `ProfileCard` tự tải ghi chú riêng của người xem khi hồ sơ không
        // phải của chính mình — mọi test ở đây đều `isSelf: false`, nên cho
        // sẵn stub, test nào cần kiểm hành vi khác cứ ghi đè qua `api`.
        useValue: { getNote: () => Promise.resolve({ text: '' }), ...api },
      },
    ],
  });
  return TestBed.createComponent(ProfileModal);
}

describe('ProfileModal', () => {
  it('dùng ngay hồ sơ được truyền vào, không gọi API lần hai', async () => {
    let called = false;
    const fixture = setup(
      { username: 'ducpham', profile: PERSON },
      {
        getByUsername: () => {
          called = true;
          return Promise.resolve(PERSON);
        },
      },
    );
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(called).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Đức Phạm');
  });

  it('chỉ có username thì tự tải hồ sơ về', async () => {
    const fixture = setup(
      { username: 'ducpham' },
      { getByUsername: () => Promise.resolve(PERSON) },
    );
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Đức Phạm');
  });

  it('luôn có nút đóng để thoát được bằng chuột', async () => {
    const fixture = setup({ username: 'ducpham', profile: PERSON });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Đóng hồ sơ');
  });

  /**
   * `ProfileCard` dùng chung với trang `/u/:username`. Trang đó chiếu thêm nút
   * "Xem dạng cửa sổ nổi" vào thẻ; cửa sổ này KHÔNG chiếu gì, vì mời người ta
   * mở cửa sổ nổi trong khi họ đang đứng sẵn trong cửa sổ nổi là vô nghĩa.
   *
   * Test này khoá lại điều đó: ai đó chuyển hai nút vào thẳng `ProfileCard`
   * (thay vì chiếu từ ngoài) sẽ làm test đỏ ngay.
   */
  it('KHÔNG hiện nút hành động riêng của trang hồ sơ', async () => {
    const fixture = setup({ username: 'ducpham', profile: PERSON });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[slot="action"]')).toBeNull();
    expect(el.textContent).not.toContain('Xem hồ sơ dạng cửa sổ nổi');
    expect(el.textContent).not.toContain('Sao chép liên kết hồ sơ');
  });
});
