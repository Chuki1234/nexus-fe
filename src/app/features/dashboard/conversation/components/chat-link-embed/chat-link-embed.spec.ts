import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';
import { ChatLinkEmbed } from './chat-link-embed';
import { ProfileLookupService } from '../../../../../core/profile/profile-lookup.service';
import { ServersApiService } from '../../../../../core/api/servers-api.service';
import { Profile } from '../../../../../core/profile/profile.models';

// Component không truyền origin nên resolveInternalLink dùng location.origin thật
// của môi trường test — lấy đúng nó để URL "nội bộ" khớp same-origin.
const ORIGIN = globalThis.location?.origin ?? 'http://localhost';
const SERVER_ID = '11111111-2222-4333-8444-555555555555';

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

function makeInvite(overrides: Partial<any> = {}): any {
  return {
    code: 'abcd1234',
    serverId: SERVER_ID,
    serverName: 'Nexus HQ',
    serverIconUrl: null,
    memberCount: 42,
    expiresAt: null,
    maxUses: null,
    uses: 0,
    status: 'valid',
    isExpired: false,
    isMaxUsed: false,
    ...overrides,
  };
}

describe('ChatLinkEmbed', () => {
  let fixture: ComponentFixture<ChatLinkEmbed>;
  let lookupMock: { lookup: ReturnType<typeof vi.fn> };
  let serversMock: {
    getInvitePreview: ReturnType<typeof vi.fn>;
    getServerPreview: ReturnType<typeof vi.fn>;
  };

  async function setup(url: string): Promise<void> {
    fixture = TestBed.createComponent(ChatLinkEmbed);
    fixture.componentRef.setInput('url', url);
    fixture.detectChanges();
    // Macrotask để mọi chuỗi promise (lookup / getInvitePreview / getServerPreview)
    // resolve xong — nhánh server chain nhiều `.then` hơn nên whenStable chưa đủ.
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    // Xoá cache tĩnh để các test không nhiễm nhau qua serverCache.
    (ChatLinkEmbed as unknown as { serverCache: Map<string, unknown> }).serverCache.clear();
    lookupMock = { lookup: vi.fn() };
    serversMock = { getInvitePreview: vi.fn(), getServerPreview: vi.fn() };
    TestBed.configureTestingModule({
      imports: [ChatLinkEmbed],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ProfileLookupService, useValue: lookupMock },
        { provide: ServersApiService, useValue: serversMock },
      ],
    });
  });

  describe('hồ sơ người dùng', () => {
    it('link /u/:username → tra lookup và render app-profile-preview-card + nút', async () => {
      lookupMock.lookup.mockResolvedValue(makeProfile('mon'));
      await setup(`${ORIGIN}/u/mon`);

      expect(lookupMock.lookup).toHaveBeenCalledWith('mon');
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('app-profile-preview-card')).toBeTruthy();
      const action = el.querySelector('a.nexus-embed-action') as HTMLAnchorElement | null;
      expect(action?.getAttribute('href')).toBe('/u/mon');
    });

    it('lookup null → không render card', async () => {
      lookupMock.lookup.mockResolvedValue(null);
      await setup(`${ORIGIN}/u/ghost`);
      expect(fixture.nativeElement.querySelector('app-profile-preview-card')).toBeNull();
    });
  });

  describe('lời mời máy chủ /invite/:code', () => {
    it('invite hợp lệ → card server + nút "Tham gia" trỏ /invite/:code', async () => {
      serversMock.getInvitePreview.mockResolvedValue(makeInvite());
      await setup(`${ORIGIN}/invite/abcd1234`);

      expect(serversMock.getInvitePreview).toHaveBeenCalledWith('abcd1234');
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Nexus HQ');
      expect(el.textContent).toContain('42 thành viên');
      const action = el.querySelector('a.nexus-embed-action') as HTMLAnchorElement | null;
      expect(action?.getAttribute('href')).toBe('/invite/abcd1234');
      expect(action?.textContent).toContain('Tham gia');
    });

    it('invite hết hạn → chặn nút, không có link tham gia', async () => {
      serversMock.getInvitePreview.mockResolvedValue(
        makeInvite({ status: 'expired', isExpired: true }),
      );
      await setup(`${ORIGIN}/invite/abcd1234`);

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Lời mời đã hết hạn');
      expect(el.querySelector('a.nexus-embed-action')).toBeNull();
      expect(el.querySelector('button.nexus-embed-action[disabled]')).toBeTruthy();
    });

    it('getInvitePreview lỗi → không render card', async () => {
      serversMock.getInvitePreview.mockRejectedValue(new Error('404'));
      await setup(`${ORIGIN}/invite/nope1234`);
      expect(fixture.nativeElement.querySelector('.nexus-embed-action')).toBeNull();
    });
  });

  describe('giới thiệu máy chủ /channels/:serverId', () => {
    it('server tồn tại → card server + nút "Xem server" trỏ /channels/:serverId', async () => {
      serversMock.getServerPreview.mockResolvedValue({
        serverId: SERVER_ID,
        name: 'Gaming Zone',
        iconUrl: null,
        bannerUrl: null,
        memberCount: 5,
      });
      await setup(`${ORIGIN}/channels/${SERVER_ID}`);

      expect(serversMock.getServerPreview).toHaveBeenCalledWith(SERVER_ID);
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Gaming Zone');
      const action = el.querySelector('a.nexus-embed-action') as HTMLAnchorElement | null;
      expect(action?.getAttribute('href')).toBe(`/channels/${SERVER_ID}`);
      expect(action?.textContent).toContain('Xem server');
    });
  });

  describe('loại trừ', () => {
    it('link ngoài → không tra API, không render', async () => {
      await setup('https://youtube.com/u/mon');
      expect(lookupMock.lookup).not.toHaveBeenCalled();
      expect(serversMock.getInvitePreview).not.toHaveBeenCalled();
      expect(serversMock.getServerPreview).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('.nexus-embed-action')).toBeNull();
    });
  });
});
