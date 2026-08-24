import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfilesApiService } from '../../../../core/api/profiles-api.service';
import type { PublicProfile } from '../../../../../shared';
import { ProfileAvatar } from './profile-avatar';

const MAI: PublicProfile = {
  id: 'u1',
  username: 'maitran',
  displayName: 'Mai Trần',
  avatarUrl: 'https://cdn.example/mai.webp',
  bannerUrl: null,
  statusMessage: null,
  bio: null,
  location: null,
  links: [],
  accentColor: null,
  createdAt: '2026-03-15T00:00:00.000Z',
  isSelf: false,
};

async function setup(
  username: string,
  profile: PublicProfile | null,
  clickable = true,
): Promise<ComponentFixture<ProfileAvatar>> {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      {
        provide: ProfilesApiService,
        useValue: {
          getByUsername: () => (profile ? Promise.resolve(profile) : Promise.reject(new Error('404'))),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(ProfileAvatar);
  fixture.componentRef.setInput('username', username);
  fixture.componentRef.setInput('name', 'Mai Trần');
  fixture.componentRef.setInput('clickable', clickable);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('ProfileAvatar', () => {
  it('tra được ảnh thật thì dùng ảnh, không dùng chữ cái', async () => {
    const fixture = await setup('maitran', MAI);
    const img = (fixture.nativeElement as HTMLElement).querySelector('img');

    expect(img?.getAttribute('src')).toBe('https://cdn.example/mai.webp');
  });

  it('không có hồ sơ thì rơi về chữ cái đầu, không để trống', async () => {
    const fixture = await setup('khongco', null);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('M');
  });

  it('mặc định bấm được để mở hồ sơ', async () => {
    const fixture = await setup('maitran', MAI);
    const trigger = (fixture.nativeElement as HTMLElement).querySelector('[role="button"]');

    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute('aria-label')).toContain('Mai Trần');
  });

  it('tắt clickable thì không còn là nút — dùng cho avatar chỉ để trang trí', async () => {
    const fixture = await setup('maitran', MAI, false);

    expect((fixture.nativeElement as HTMLElement).querySelector('[role="button"]')).toBeNull();
  });
});
