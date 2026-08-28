import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';
import { ChatLinkEmbed } from './chat-link-embed';
import { ProfileLookupService } from '../../../../../core/profile/profile-lookup.service';
import { ServersApiService } from '../../../../../core/api/servers-api.service';
import { ProfileDialogService } from '../../../../profile/profile-dialog.service';
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
  let dialogMock: { open: ReturnType<typeof vi.fn> };

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
    (ChatLinkEmbed as unknown as { serverCache: Map<string, unknown> }).serverCache.clear();
    lookupMock = { lookup: vi.fn() };
    serversMock = { getInvitePreview: vi.fn(), getServerPreview: vi.fn() };
    dialogMock = { open: vi.fn() };
    TestBed.configureTestingModule({
      imports: [ChatLinkEmbed],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ProfileLookupService, useValue: lookupMock },
        { provide: ServersApiService, useValue: serversMock },
        { provide: ProfileDialogService, useValue: dialogMock },
      ],
    });
  });

  describe('hồ sơ người dùng', () => {
    it('link /u/:username → render card, KHÔNG có nút; bấm tên → mở dialog', async () => {
      lookupMock.lookup.mockResolvedValue(makeProfile('mon'));
      await setup(`${ORIGIN}/u/mon`);

      expect(lookupMock.lookup).toHaveBeenCalledWith('mon');
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('app-profile-preview-card')).toBeTruthy();
      // Không còn nút "Xem hồ sơ"
      expect(el.querySelector('a.nexus-embed-action')).toBeNull();

      // Bấm vào tên (button trong card) → gọi ProfileDialogService.open
      const nameBtn = el.querySelector('app-profile-preview-card button') as HTMLButtonElement | null;
      expect(nameBtn?.textContent).toContain('Mon Nguyen');
      nameBtn!.click();
      expect(dialogMock.open).toHaveBeenCalledWith('mon');
    });

    it('lookup null → không render card', async () => {
      lookupMock.lookup.mockResolvedValue(null);
      await setup(`${ORIGIN}/u/ghost`);
      expect(fixture.nativeElement.querySelector('app-profile-preview-card')).toBeNull();
    });
  });

  describe('lời mời máy chủ /invite/:code', () => {
    it('invite hợp lệ → card + nút "Tham gia" (/invite/:code) + tên link /invite/:code', async () => {
      serversMock.getInvitePreview.mockResolvedValue(makeInvite());
      await setup(`${ORIGIN}/invite/abcd1234`);

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Nexus HQ');
      const join = el.querySelector('a.nexus-embed-action') as HTMLAnchorElement | null;
      expect(join?.getAttribute('href')).toBe('/invite/abcd1234');
      expect(join?.textContent).toContain('Tham gia');
      // Tên server là link điều hướng
      const nameLink = el.querySelector('a[href="/invite/abcd1234"].hover\\:underline') as HTMLAnchorElement | null;
      expect(nameLink?.textContent).toContain('Nexus HQ');
    });

    it('invite hết hạn → không có nút Tham gia, hiện lý do', async () => {
      serversMock.getInvitePreview.mockResolvedValue(
        makeInvite({ status: 'expired', isExpired: true }),
      );
      await setup(`${ORIGIN}/invite/abcd1234`);

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Lời mời đã hết hạn');
      expect(el.querySelector('a.nexus-embed-action')).toBeNull();
    });
  });

  describe('giới thiệu máy chủ /channels/:serverId', () => {
    it('card giàu: tên link, online·member, founding date, mô tả, tag; KHÔNG nút', async () => {
      serversMock.getServerPreview.mockResolvedValue({
        serverId: SERVER_ID,
        name: 'Gaming Zone',
        iconUrl: null,
        bannerUrl: null,
        memberCount: 5,
        description: 'Server đồ án Nexus',
        tags: ['Gaming', 'Học tập'],
        createdAt: '2026-01-15T00:00:00.000Z',
        onlineCount: 3,
      });
      await setup(`${ORIGIN}/channels/${SERVER_ID}`);

      const el: HTMLElement = fixture.nativeElement;
      const nameLink = el.querySelector(`a[href="/channels/${SERVER_ID}"]`) as HTMLAnchorElement | null;
      expect(nameLink?.textContent).toContain('Gaming Zone');
      expect(el.textContent).toContain('3 Trực tuyến');
      expect(el.textContent).toContain('5 thành viên');
      expect(el.textContent).toContain('Thành lập từ tháng 1 2026');
      expect(el.textContent).toContain('Server đồ án Nexus');
      expect(el.textContent).toContain('Gaming');
      expect(el.textContent).toContain('Học tập');
      // introduction không có nút "Tham gia"/"Xem server"
      expect(el.querySelector('a.nexus-embed-action')).toBeNull();
    });

    it('mô tả rỗng → placeholder "Chưa có mô tả cho máy chủ này."', async () => {
      serversMock.getServerPreview.mockResolvedValue({
        serverId: SERVER_ID,
        name: 'Empty Desc',
        iconUrl: null,
        bannerUrl: null,
        memberCount: 1,
        description: null,
        tags: [],
        createdAt: '2026-01-15T00:00:00.000Z',
        onlineCount: 0,
      });
      await setup(`${ORIGIN}/channels/${SERVER_ID}`);
      expect(fixture.nativeElement.textContent).toContain('Chưa có mô tả cho máy chủ này.');
    });
  });

  describe('loại trừ', () => {
    it('link ngoài → không tra API, không render', async () => {
      await setup('https://youtube.com/u/mon');
      expect(lookupMock.lookup).not.toHaveBeenCalled();
      expect(serversMock.getInvitePreview).not.toHaveBeenCalled();
      expect(serversMock.getServerPreview).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('app-profile-preview-card')).toBeNull();
    });
  });
});
