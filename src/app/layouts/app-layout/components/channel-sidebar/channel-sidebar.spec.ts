import { signal } from '@angular/core';
import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { ProfileService } from '../../../../core/profile/profile.service';
import { ServerCapabilitiesService } from '../../../../core/servers/server-capabilities.service';
import { ServersStore } from '../../../../core/servers/servers.store';
import { ConversationsApiService } from '../../../../core/api/conversations-api.service';
import { UserSettingsService } from '../../../../features/settings/services/user-settings.service';
import { CommandCenterService } from '../../services/command-center.service';
import { ChannelSidebar } from './channel-sidebar';
import { CreateChannelDialog } from './components/create-channel-dialog/create-channel-dialog';

class AuthStub {
  user = signal(null);
  session = signal(null);
  accessToken = () => null;
  signOut = () => Promise.resolve();
}
class ProfileStub {
  current = () => null;
  reset = () => undefined;
}

interface MockMatDialog {
  open: ReturnType<typeof vi.fn>;
  openDialogs: unknown[];
  afterOpened: Subject<unknown>;
  afterAllClosed: Subject<unknown>;
  _getAfterOpened?: () => Subject<unknown>;
  _getAfterAllClosed?: () => Subject<unknown>;
}

describe('ChannelSidebar', () => {
  let mockDialog: MockMatDialog;
  let mockSettingsService: {
    canAccessServerSettings: ReturnType<typeof vi.fn>;
    canManageOverview: ReturnType<typeof vi.fn>;
    canManageRoles: ReturnType<typeof vi.fn>;
    canManageMembers: ReturnType<typeof vi.fn>;
    canManageSafety: ReturnType<typeof vi.fn>;
    canViewAuditLog: ReturnType<typeof vi.fn>;
    openServerSettings: ReturnType<typeof vi.fn>;
  };
  let mockCapabilitiesService: {
    capabilitiesMap: ReturnType<typeof signal<Map<string, any>>>;
    load: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
  };
  let mockConversationsApi: {
    listConversations: ReturnType<typeof vi.fn>;
    getOrCreateDm: ReturnType<typeof vi.fn>;
  };

  const mount = async (serverId: string | null) => {
    mockDialog = {
      open: vi.fn().mockReturnValue({
        afterClosed: () => of(null),
        afterOpened: () => of(null),
        componentInstance: {},
      }),
      openDialogs: [] as unknown[],
      afterOpened: new Subject(),
      afterAllClosed: new Subject(),
      _getAfterOpened: () => new Subject(),
      _getAfterAllClosed: () => new Subject(),
    };
    mockSettingsService = {
      canAccessServerSettings: vi.fn().mockReturnValue(true),
      canManageOverview: vi.fn().mockReturnValue(true),
      canManageRoles: vi.fn().mockReturnValue(true),
      canManageMembers: vi.fn().mockReturnValue(true),
      canManageSafety: vi.fn().mockReturnValue(true),
      canViewAuditLog: vi.fn().mockReturnValue(true),
      openServerSettings: vi.fn(),
    };
    const defaultCaps = {
      isOwner: true,
      canInviteMembers: true,
      canManageServer: true,
      canManageChannels: true,
      canManageRoles: true,
    };
    mockCapabilitiesService = {
      capabilitiesMap: signal(new Map([['lofi', defaultCaps], ['server-1', defaultCaps]])),
      load: vi.fn().mockResolvedValue(defaultCaps),
      refresh: vi.fn().mockResolvedValue(defaultCaps),
      clear: vi.fn(),
    };
    mockConversationsApi = {
      listConversations: vi.fn().mockResolvedValue([
        {
          id: 'binh',
          recipient: {
            id: 'u-binh',
            username: 'binh',
            displayName: 'Bình',
            avatarUrl: null,
            presence: 'online',
            statusMessage: null,
          },
          unreadCount: 0,
        },
      ]),
      getOrCreateDm: vi.fn().mockResolvedValue({ id: 'binh' }),
    };

    await TestBed.configureTestingModule({
      imports: [ChannelSidebar],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: new AuthStub() },
        { provide: ProfileService, useValue: new ProfileStub() },
        { provide: MatDialog, useValue: mockDialog },
        { provide: UserSettingsService, useValue: mockSettingsService },
        { provide: ServerCapabilitiesService, useValue: mockCapabilitiesService },
        { provide: ConversationsApiService, useValue: mockConversationsApi },
      ],
    }).compileComponents();

    const serversStore = TestBed.inject(ServersStore);
    serversStore.serverList.set([
      { id: 'lofi', name: 'Lofi Study', iconUrl: null, unread: false, mentionCount: 0 },
      { id: 'itss', name: 'ITSS Lab', iconUrl: null, unread: false, mentionCount: 0 },
      { id: 'server-1', name: 'Máy chủ 1', iconUrl: null, unread: false, mentionCount: 0 },
    ]);
    serversStore.addChannel('lofi', {
      id: 'c-general',
      name: 'chung',
      type: 'text',
      topic: null,
      unread: false,
      mentionCount: 0,
    });

    const fixture = TestBed.createComponent(ChannelSidebar);
    (fixture.componentRef as ComponentRef<ChannelSidebar>).setInput('serverId', serverId);
    fixture.detectChanges();
    return fixture;
  };

  it('không có serverId thì hiện danh sách hộp thoại và nút tìm kiếm', async () => {
    const fixture = await mount(null);

    expect(fixture.nativeElement.querySelector('app-conversation-list')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-channel-list')).toBeFalsy();
    const searchBtn = fixture.nativeElement.querySelector('[data-action="sidebar-search"]') as HTMLButtonElement;
    expect(searchBtn).toBeTruthy();
    expect(searchBtn.getAttribute('aria-label')).toBe('Tìm người hoặc cuộc trò chuyện');
    expect(searchBtn.textContent).toContain('Tìm người hoặc cuộc trò chuyện');
    expect(fixture.nativeElement.querySelector('.channel-sidebar__header')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('nav')?.classList.contains('nexus-scrollbar')).toBe(
      true,
    );
    expect(fixture.nativeElement.classList.contains('min-w-0')).toBe(true);
    expect(fixture.nativeElement.classList.contains('flex-1')).toBe(true);
  });

  it('nhấn nút tìm kiếm trên sidebar gọi open của CommandCenterService', async () => {
    const fixture = await mount(null);
    const commandCenterService = TestBed.inject(CommandCenterService);
    const openSpy = vi.spyOn(commandCenterService, 'open');

    const searchBtn = fixture.nativeElement.querySelector('[data-action="sidebar-search"]') as HTMLButtonElement;
    searchBtn.click();
    fixture.detectChanges();

    expect(openSpy).toHaveBeenCalled();
  });

  it('có serverId chưa tồn tại thì vẫn giữ khung danh sách kênh an toàn', async () => {
    const fixture = await mount('server-chua-tai');

    expect(fixture.nativeElement.querySelector('app-channel-list')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-conversation-list')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('h2').textContent).toContain('Máy chủ');
    expect(fixture.nativeElement.textContent).toContain('chưa có kênh nào');
  });

  it('hiển thị header máy chủ với chevron và nút mời nhanh ở góc phải khi có serverId', async () => {
    const fixture = await mount('lofi');

    const header = fixture.nativeElement.querySelector('.channel-sidebar__server-header');
    expect(header).toBeTruthy();
    expect(header.textContent).toContain('Lofi Study');
    expect(header.querySelector('.server-header-chevron')).toBeTruthy();
    expect(header.querySelector('.server-header-invite-btn')).toBeTruthy();
  });

  it('gọi openServerSettings khi chọn Cài đặt máy chủ', async () => {
    const fixture = await mount('lofi');

    fixture.componentInstance['openServerSettings']('server-overview');

    expect(mockSettingsService.openServerSettings).toHaveBeenCalledWith(
      'server-overview',
      'lofi',
    );
  });

  it('gọi openCreateChannelDialog mở CreateChannelDialog khi chọn Tạo kênh', async () => {
    const fixture = await mount('lofi');
    const dialogSpy = vi.spyOn(fixture.componentInstance['dialog'], 'open');

    fixture.componentInstance['openCreateChannelDialog']();

    expect(dialogSpy).toHaveBeenCalledWith(
      CreateChannelDialog,
      expect.objectContaining({
        data: expect.objectContaining({
          serverId: 'lofi',
          serverName: 'Lofi Study',
          defaultType: 'text',
        }),
      }),
    );
  });

  it('toggleHideMutedChannels thay đổi trạng thái checkbox', async () => {
    const fixture = await mount('lofi');

    expect(fixture.componentInstance['hideMutedChannels']()).toBe(false);

    fixture.componentInstance['toggleHideMutedChannels']();
    expect(fixture.componentInstance['hideMutedChannels']()).toBe(true);

    fixture.componentInstance['toggleHideMutedChannels']();
    expect(fixture.componentInstance['hideMutedChannels']()).toBe(false);
  });

  it('có khối người dùng ở đáy khi đang ở khu tin nhắn riêng', async () => {
    const fixture = await mount(null);

    expect(fixture.nativeElement.querySelector('app-user-panel')).toBeTruthy();
  });

  it('có khối người dùng ở đáy khi đang mở server', async () => {
    const fixture = await mount('server-chua-tai');

    expect(fixture.nativeElement.querySelector('app-user-panel')).toBeTruthy();
  });

  it('gọi openDeleteServerDialog khi chọn Xóa máy chủ (Owner)', async () => {
    const fixture = await mount('lofi');
    const dialogSpy = vi.spyOn(fixture.componentInstance['dialog'], 'open');

    fixture.componentInstance['openDeleteServerDialog']();

    expect(dialogSpy).toHaveBeenCalled();
  });

  it('gọi openLeaveServerDialog khi chọn Rời khỏi máy chủ (Non-Owner)', async () => {
    const fixture = await mount('lofi');
    const dialogSpy = vi.spyOn(fixture.componentInstance['dialog'], 'open');

    fixture.componentInstance['openLeaveServerDialog']();

    expect(dialogSpy).toHaveBeenCalled();
  });

  describe('Channel Drag & Drop Integration', () => {
    it('render cdkDropListGroup và các cdkDropList cho từng nhóm kênh', async () => {
      const fixture = await mount('lofi');
      const dropGroup = fixture.nativeElement.querySelector('.channel-list-drop-group');
      expect(dropGroup).toBeTruthy();

      const dropLists = fixture.nativeElement.querySelectorAll('.channel-drop-list');
      expect(dropLists.length).toBeGreaterThan(0);
    });
  });
});
