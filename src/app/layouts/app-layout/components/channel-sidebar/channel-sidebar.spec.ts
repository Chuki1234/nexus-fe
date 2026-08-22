import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { ShellData } from '../../../../core/api/shell-data';
import { AuthService } from '../../../../core/auth/auth.service';
import { ProfileService } from '../../../../core/profile/profile.service';
import { UserSettingsService } from '../../../../features/settings/services/user-settings.service';
import { ChannelSidebar } from './channel-sidebar';
import { CreateChannelDialog } from './components/create-channel-dialog/create-channel-dialog';

class AuthStub {
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

  const mount = async (serverId: string | null, shell: ShellData = new ShellData()) => {
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

    await TestBed.configureTestingModule({
      imports: [ChannelSidebar],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: new AuthStub() },
        { provide: ProfileService, useValue: new ProfileStub() },
        { provide: ShellData, useValue: shell },
        { provide: MatDialog, useValue: mockDialog },
        { provide: UserSettingsService, useValue: mockSettingsService },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ChannelSidebar);
    (fixture.componentRef as ComponentRef<ChannelSidebar>).setInput('serverId', serverId);
    fixture.detectChanges();
    return fixture;
  };

  it('không có serverId thì hiện danh sách hộp thoại và ô tìm kiếm', async () => {
    const fixture = await mount(null);

    expect(fixture.nativeElement.querySelector('app-conversation-list')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-channel-list')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('app-search-field')).toBeTruthy();
    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    expect(input.disabled).toBe(false);
    expect(input.placeholder).toBe('Tìm người hoặc cuộc trò chuyện');
    expect(fixture.nativeElement.querySelector('.channel-sidebar__header')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('nav')?.classList.contains('nexus-scrollbar')).toBe(
      true,
    );
    expect(fixture.nativeElement.classList.contains('min-w-0')).toBe(true);
    expect(fixture.nativeElement.classList.contains('flex-1')).toBe(true);
  });

  it('lọc người và DM ngay trong sidebar, không đẩy kết quả sang workspace', async () => {
    const shell = new ShellData();
    shell.setDemoEnabled(true);
    const fixture = await mount(null, shell);
    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;

    input.value = 'binh';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const results = fixture.nativeElement.querySelectorAll('[data-conversation-id]');
    expect(results).toHaveLength(1);
    expect(results[0].getAttribute('data-conversation-id')).toBe('binh');
    expect(fixture.nativeElement.textContent).toContain('Kết quả · 1');
    expect(fixture.nativeElement.querySelector('a[href="/channels/@me"]')).toBeTruthy();
  });

  it('có serverId chưa tồn tại thì vẫn giữ khung danh sách kênh an toàn', async () => {
    const fixture = await mount('server-chua-tai');

    expect(fixture.nativeElement.querySelector('app-channel-list')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-conversation-list')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('h2').textContent).toContain('Máy chủ');
    expect(fixture.nativeElement.textContent).toContain('chưa có kênh nào');
  });

  it('hiển thị header máy chủ với chevron và nút mời nhanh ở góc phải khi có serverId', async () => {
    const shell = new ShellData();
    shell.setDemoEnabled(true);
    const fixture = await mount('lofi', shell);

    const header = fixture.nativeElement.querySelector('.channel-sidebar__server-header');
    expect(header).toBeTruthy();
    expect(header.textContent).toContain('Lofi Study');
    expect(header.querySelector('.server-header-chevron')).toBeTruthy();
    expect(header.querySelector('.server-header-invite-btn')).toBeTruthy();
  });

  it('gọi openServerSettings khi chọn Cài đặt máy chủ', async () => {
    const shell = new ShellData();
    shell.setDemoEnabled(true);
    const fixture = await mount('lofi', shell);

    fixture.componentInstance['openServerSettings']('server-overview');

    expect(mockSettingsService.openServerSettings).toHaveBeenCalledWith(
      'server-overview',
      'lofi',
    );
  });

  it('gọi openCreateChannelDialog mở CreateChannelDialog khi chọn Tạo kênh', async () => {
    const shell = new ShellData();
    shell.setDemoEnabled(true);
    const fixture = await mount('lofi', shell);
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
    const shell = new ShellData();
    shell.setDemoEnabled(true);
    const fixture = await mount('lofi', shell);

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
});

