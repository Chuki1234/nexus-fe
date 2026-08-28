import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';
import { ChatLinkEmbed } from './chat-link-embed';
import { ProfileLookupService } from '../../../../../core/profile/profile-lookup.service';
import { Profile } from '../../../../../core/profile/profile.models';

// Component không truyền origin nên resolveInternalLink dùng location.origin thật
// của môi trường test — lấy đúng nó để URL "nội bộ" khớp same-origin.
const ORIGIN = globalThis.location?.origin ?? 'http://localhost';

function makeProfile(username: string): Profile {
  return {
    id: 'p-1',
    username,
    displayName: 'Mon Nguyen',
    avatarUrl: null,
    bannerUrl: null,
    statusMessage: 'Đang code Nexus',
    bio: null,
    location: null,
    links: [],
    accentColor: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    isSelf: false,
  } as Profile;
}

describe('ChatLinkEmbed', () => {
  let fixture: ComponentFixture<ChatLinkEmbed>;
  let lookupMock: { lookup: ReturnType<typeof vi.fn> };

  function setup(url: string): Promise<void> {
    fixture = TestBed.createComponent(ChatLinkEmbed);
    fixture.componentRef.setInput('url', url);
    fixture.detectChanges();
    return fixture.whenStable().then(() => fixture.detectChanges());
  }

  beforeEach(() => {
    lookupMock = { lookup: vi.fn() };
    TestBed.configureTestingModule({
      imports: [ChatLinkEmbed],
      providers: [
        provideRouter([]),
        // Card thật dùng TranslatePipe → cần TranslateStore/Service khi render.
        provideTranslateService(),
        { provide: ProfileLookupService, useValue: lookupMock },
      ],
    });
  });

  it('link hồ sơ nội bộ → tra lookup và render app-profile-preview-card', async () => {
    lookupMock.lookup.mockResolvedValue(makeProfile('mon'));

    await setup(`${ORIGIN}/u/mon`);

    expect(lookupMock.lookup).toHaveBeenCalledWith('mon');
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-profile-preview-card')).toBeTruthy();
    // Có nút "Xem hồ sơ" trỏ tới /u/:username
    const action = el.querySelector('a.nexus-embed-action') as HTMLAnchorElement | null;
    expect(action?.getAttribute('href')).toBe('/u/mon');
  });

  it('lookup trả null (không có hồ sơ / không quyền xem) → không render card', async () => {
    lookupMock.lookup.mockResolvedValue(null);

    await setup(`${ORIGIN}/u/ghost`);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-profile-preview-card')).toBeNull();
  });

  it('link server nội bộ (chưa xử lý ở Phase 3) → không tra lookup, không render', async () => {
    await setup(`${ORIGIN}/channels/11111111-2222-4333-8444-555555555555`);

    expect(lookupMock.lookup).not.toHaveBeenCalled();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-profile-preview-card')).toBeNull();
  });

  it('link ngoài → không tra lookup, không render', async () => {
    await setup('https://youtube.com/u/mon');

    expect(lookupMock.lookup).not.toHaveBeenCalled();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-profile-preview-card')).toBeNull();
  });
});
