import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { PublicProfile } from '../../../../../shared';
import { ProfileCard } from './profile-card';

const PERSON: PublicProfile = {
  id: 'u1',
  username: 'ducpham',
  displayName: 'Đức Phạm',
  avatarUrl: null,
  bannerUrl: null,
  statusMessage: 'Đang dựng Nexus',
  bio: 'Sinh viên năm ba.',
  location: 'Hà Nội',
  links: [{ label: 'GitHub', url: 'https://github.com/ducpham' }],
  accentColor: null,
  createdAt: '2026-03-15T00:00:00.000Z',
  isSelf: false,
};

describe('ProfileCard', () => {
  let fixture: ComponentFixture<ProfileCard>;

  function setup(profile: PublicProfile): HTMLElement {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
    fixture = TestBed.createComponent(ProfileCard);
    fixture.componentRef.setInput('profile', profile);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('hiện tên, username, dòng trạng thái và nơi ở', () => {
    const el = setup(PERSON);
    const text = el.textContent ?? '';

    expect(text).toContain('Đức Phạm');
    expect(text).toContain('ducpham');
    expect(text).toContain('Đang dựng Nexus');
    expect(text).toContain('Hà Nội');
  });

  it('người khác xem thì thấy nút Nhắn tin, không thấy nút sửa hồ sơ', () => {
    const el = setup(PERSON);

    expect(el.textContent).toContain('Nhắn tin');
    expect(el.textContent).not.toContain('Chỉnh sửa hồ sơ');
  });

  it('chính chủ xem thì thấy nút sửa hồ sơ thay cho Nhắn tin', () => {
    const el = setup({ ...PERSON, isSelf: true });

    expect(el.textContent).toContain('Chỉnh sửa hồ sơ');
    expect(el.textContent).not.toContain('Nhắn tin');
  });

  it('bio trống thì lời nhắn khác nhau giữa chính chủ và người ngoài', () => {
    expect(setup({ ...PERSON, bio: null, isSelf: true }).textContent).toContain(
      'Bạn chưa viết gì về mình',
    );

    TestBed.resetTestingModule();
    expect(setup({ ...PERSON, bio: null, isSelf: false }).textContent).toContain(
      'Người này chưa viết phần giới thiệu',
    );
  });

  it('liên kết hiện nhãn và địa chỉ đã rút gọn', () => {
    const el = setup(PERSON);
    const link = el.querySelector('a[href="https://github.com/ducpham"]');

    expect(link).not.toBeNull();
    expect(link?.textContent).toContain('GitHub');
    expect(link?.textContent).toContain('github.com/ducpham');
  });
});
