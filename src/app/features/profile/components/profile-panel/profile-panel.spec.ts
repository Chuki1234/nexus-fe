import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProfilesApiService } from '../../../../core/api/profiles-api.service';
import type { PublicProfile } from '../../../../../shared';
import { ProfilePanel } from './profile-panel';

const MAI: PublicProfile = {
  id: 'u1',
  username: 'maitran',
  displayName: 'Mai Trần',
  avatarUrl: null,
  bannerUrl: null,
  statusMessage: 'Đang xây một thứ gì đó',
  bio: 'Frontend engineer ở Đà Nẵng.',
  location: 'Đà Nẵng',
  links: [{ label: 'GitHub', url: 'https://github.com/maitran' }],
  accentColor: null,
  createdAt: '2026-03-15T00:00:00.000Z',
  isSelf: false,
};

const DUC: PublicProfile = { ...MAI, id: 'u2', username: 'ducpham', displayName: 'Đức Phạm' };

async function setup(
  username: string,
  getByUsername: (u: string) => Promise<PublicProfile>,
): Promise<ComponentFixture<ProfilePanel>> {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: ProfilesApiService, useValue: { getByUsername } },
    ],
  });
  const fixture = TestBed.createComponent(ProfilePanel);
  fixture.componentRef.setInput('username', username);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('ProfilePanel', () => {
  it('tra hồ sơ theo username rồi hiện đủ tên, tiểu sử, nơi ở, liên kết', async () => {
    const fixture = await setup('maitran', () => Promise.resolve(MAI));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Mai Trần');
    expect(text).toContain('maitran');
    expect(text).toContain('Frontend engineer ở Đà Nẵng.');
    expect(text).toContain('Đà Nẵng');
    expect(text).toContain('GitHub');
    expect(text).toContain('Tháng 3, 2026');
  });

  it('đổi sang người khác thì hiện hồ sơ mới', async () => {
    const fixture = await setup('maitran', (u) => Promise.resolve(u === 'maitran' ? MAI : DUC));
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Mai Trần');

    fixture.componentRef.setInput('username', 'ducpham');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Đức Phạm');
    expect(text).not.toContain('Mai Trần');
  });

  it('chưa có dữ liệu thì hiện khung xám chứ không phải cột trống', async () => {
    const fixture = await setup('khongco', () => Promise.reject(new Error('404')));

    expect((fixture.nativeElement as HTMLElement).querySelector('.animate-pulse')).not.toBeNull();
  });

  it('có đường sang trang hồ sơ đầy đủ', async () => {
    const fixture = await setup('maitran', () => Promise.resolve(MAI));
    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href="/u/maitran"]');

    expect(link).not.toBeNull();
    expect(link?.textContent).toContain('Xem hồ sơ đầy đủ');
  });
});
