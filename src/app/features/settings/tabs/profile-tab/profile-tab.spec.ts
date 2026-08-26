import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProfilesApiService } from '../../../../core/api/profiles-api.service';
import { ProfileService } from '../../../../core/profile/profile.service';
import { UserSettingsService } from '../../services/user-settings.service';
import { ProfileTab } from './profile-tab';

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      UserSettingsService,
      { provide: ProfilesApiService, useValue: { getOwn: () => Promise.resolve(null) } },
      { provide: ProfileService, useValue: { current: () => null } },
    ],
  });

  const fixture = TestBed.createComponent(ProfileTab);
  const settingsService = TestBed.inject(UserSettingsService);
  settingsService.initProfileDraft('Minh Tài', 'minhtai', 'https://x/avatar.webp');
  fixture.detectChanges();

  return { fixture, settingsService };
}

describe('ProfileTab', () => {
  it('thẻ xem trước hiện tên hiển thị từ UserSettingsService', () => {
    const { fixture, settingsService } = setup();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Minh Tài');

    settingsService.editDisplayName.set('Tên Đã Đổi');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Tên Đã Đổi');
  });

  it('thẻ xem trước hiện trạng thái tùy chỉnh khi được nhập', () => {
    const { fixture, settingsService } = setup();

    settingsService.editCustomStatus.set('Đang tập trung code');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Đang tập trung code');
  });

  it('tab Hồ Sơ Chính có đủ các phần cấu hình hồ sơ', () => {
    const { fixture } = setup();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.textContent).toContain('ẢNH ĐẠI DIỆN');
    expect(root.textContent).toContain('TÊN HIỂN THỊ');
    expect(root.textContent).toContain('GIỚI THIỆU BẢN THÂN');
    expect(root.textContent).toContain('MÀU BANNER CHỦ ĐẠO');
  });

  it('chuyển đổi sang tab Hồ Sơ Theo Máy Chủ hiển thị danh sách máy chủ', () => {
    const { fixture } = setup();
    const root = fixture.nativeElement as HTMLElement;

    const serverTabBtn = [...root.querySelectorAll('button')].find(
      (b) => b.textContent?.includes('Hồ Sơ Theo Máy Chủ'),
    );
    serverTabBtn?.click();
    fixture.detectChanges();

    expect(root.textContent).toContain('Máy chủ:');
    expect(root.textContent).toContain('Nexus Developers Hub');
  });
});
