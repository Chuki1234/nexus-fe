import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { PublicProfile } from '../../../../../shared';
import { ProfilePopover } from './profile-popover';

const PERSON: PublicProfile = {
  id: 'u1',
  username: 'ducpham',
  displayName: 'Đức Phạm',
  avatarUrl: null,
  bannerUrl: null,
  statusMessage: 'Đang học Rust',
  bio: 'Sinh viên năm cuối.',
  location: 'Hà Nội',
  links: [{ label: 'GitHub', url: 'https://github.com/ducpham' }],
  accentColor: null,
  createdAt: '2026-03-15T00:00:00.000Z',
  isSelf: false,
};

function setup(profile: PublicProfile): HTMLElement {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideRouter([])],
  });
  const fixture = TestBed.createComponent(ProfilePopover);
  fixture.componentRef.setInput('profile', profile);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ProfilePopover', () => {
  it('hiện tên, username, trạng thái và ngày tham gia', () => {
    const text = setup(PERSON).textContent ?? '';

    expect(text).toContain('Đức Phạm');
    expect(text).toContain('ducpham');
    expect(text).toContain('Đang học Rust');
    expect(text).toContain('Tháng 3, 2026');
  });

  it('người khác thì hiện nút Nhắn tin', () => {
    expect(setup(PERSON).textContent).toContain('Nhắn tin');
  });

  it('chính chủ thì đổi thành đường sang hồ sơ đầy đủ, không mời tự nhắn tin', () => {
    const text = setup({ ...PERSON, isSelf: true }).textContent ?? '';

    expect(text).toContain('Xem hồ sơ đầy đủ');
    expect(text).not.toContain('Nhắn tin');
  });

  it('liên kết mở tab mới và có rel an toàn', () => {
    const link = setup(PERSON).querySelector('a[href="https://github.com/ducpham"]');

    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toContain('noopener');
  });
});
