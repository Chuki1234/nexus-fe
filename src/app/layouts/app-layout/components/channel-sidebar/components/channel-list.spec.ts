import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter, Router } from '@angular/router';
import { ChannelSummary, ShellData } from '../../../../../core/api/shell-data';
import { ChannelList } from './channel-list';
import { CreateChannelDialog } from './create-channel-dialog/create-channel-dialog';

describe('ChannelList', () => {
  let shellData: ShellData;
  let mockDialog: { open: ReturnType<typeof vi.fn> };

  const mount = async (serverId: string, enableDemo = false) => {
    mockDialog = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ChannelList],
      providers: [
        provideRouter([]),
        ShellData,
        { provide: MatDialog, useValue: mockDialog },
      ],
    }).compileComponents();

    shellData = TestBed.inject(ShellData);
    if (enableDemo) {
      shellData.setDemoEnabled(true);
    }

    const fixture = TestBed.createComponent(ChannelList);
    (fixture.componentRef as ComponentRef<ChannelList>).setInput('serverId', serverId);
    fixture.detectChanges();
    return fixture;
  };

  it('không dựng kênh giả khi tài khoản mới chưa có server', async () => {
    const fixture = await mount('server-chua-tai');

    expect(fixture.nativeElement.textContent).toContain('chưa có kênh nào');
    expect(fixture.nativeElement.querySelectorAll('a').length).toBe(0);
    expect(fixture.nativeElement.textContent).not.toContain('Kênh chữ');
    expect(fixture.nativeElement.textContent).not.toContain('Kênh thoại');
  });

  it('hiển thị danh sách kênh theo nhóm với nút + tạo kênh khi server có dữ liệu', async () => {
    const fixture = await mount('lofi', true);

    expect(fixture.nativeElement.textContent).toContain('Kênh chữ');
    expect(fixture.nativeElement.textContent).toContain('Kênh thoại');

    const addButtons = fixture.nativeElement.querySelectorAll('.add-channel-btn');
    expect(addButtons.length).toBe(2);
    expect(addButtons[0].getAttribute('aria-label')).toContain('Kênh chữ');
    expect(addButtons[1].getAttribute('aria-label')).toContain('Kênh thoại');
  });

  it('thu gọn và mở rộng nhóm kênh khi click vào header', async () => {
    const fixture = await mount('lofi', true);

    const textGroupHeader = fixture.nativeElement.querySelector(
      '.channel-group-header button',
    ) as HTMLButtonElement;
    expect(textGroupHeader.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('#channel-group-text')).toBeTruthy();

    // Click để thu gọn
    textGroupHeader.click();
    fixture.detectChanges();

    expect(textGroupHeader.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('#channel-group-text')).toBeNull();

    // Click lại để mở rộng
    textGroupHeader.click();
    fixture.detectChanges();

    expect(textGroupHeader.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('#channel-group-text')).toBeTruthy();
  });

  it('bấm nút + trên header mở CreateChannelDialog với đúng defaultType', async () => {
    const fixture = await mount('lofi', true);

    const addButtons = fixture.nativeElement.querySelectorAll(
      '.add-channel-btn',
    ) as NodeListOf<HTMLButtonElement>;

    // Bấm + ở Kênh chữ
    addButtons[0].click();
    fixture.detectChanges();

    expect(mockDialog.open).toHaveBeenCalledWith(
      CreateChannelDialog,
      expect.objectContaining({
        data: expect.objectContaining({
          serverId: 'lofi',
          defaultType: 'text',
        }),
      }),
    );

    // Bấm + ở Kênh thoại
    addButtons[1].click();
    fixture.detectChanges();

    expect(mockDialog.open).toHaveBeenCalledWith(
      CreateChannelDialog,
      expect.objectContaining({
        data: expect.objectContaining({
          serverId: 'lofi',
          defaultType: 'voice',
        }),
      }),
    );
  });

  it('hiển thị đầy đủ action buttons tương ứng trên hàng kênh chữ và kênh thoại', async () => {
    const fixture = await mount('lofi', true);

    // Kênh chữ (chung): có 2 action buttons (Mời, Cài đặt)
    const textChannelRow = fixture.nativeElement.querySelector('a[href="/channels/lofi/chung"]');
    expect(textChannelRow).toBeTruthy();
    const textActions = textChannelRow.querySelectorAll('.channel-action-btn');
    expect(textActions.length).toBe(2);
    expect(textActions[0].getAttribute('aria-label')).toContain('Tạo lời mời vào kênh chung');
    expect(textActions[1].getAttribute('aria-label')).toContain('Chỉnh sửa kênh chung');

    // Kênh thoại (phong-hop): có 3 action buttons (Mở chat, Mời, Cài đặt)
    const voiceChannelRow = fixture.nativeElement.querySelector('a[href="/channels/lofi/phong-hop"]');
    expect(voiceChannelRow).toBeTruthy();
    const voiceActions = voiceChannelRow.querySelectorAll('.channel-action-btn');
    expect(voiceActions.length).toBe(3);
    expect(voiceActions[0].getAttribute('aria-label')).toContain('Mở trò chuyện của kênh thoại Phòng họp');
    expect(voiceActions[1].getAttribute('aria-label')).toContain('Tạo lời mời vào kênh Phòng họp');
    expect(voiceActions[2].getAttribute('aria-label')).toContain('Chỉnh sửa kênh Phòng họp');
  });

  it('click vào action button gọi stopPropagation và preventDefault để không điều hướng nhầm', async () => {
    const fixture = await mount('lofi', true);

    const inviteBtn = fixture.nativeElement.querySelector(
      '.channel-action-btn[aria-label*="Tạo lời mời"]',
    ) as HTMLButtonElement;

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    inviteBtn.dispatchEvent(event);
    fixture.detectChanges();

    expect(stopPropagationSpy).toHaveBeenCalled();
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('khi thu gọn nhóm thì kênh người dùng đang mở vẫn được hiển thị (giữ active channel)', async () => {
    mockDialog = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ChannelList],
      providers: [
        provideRouter([
          { path: 'channels/:serverId/:channelId', component: ChannelList },
        ]),
        ShellData,
        { provide: MatDialog, useValue: mockDialog },
      ],
    }).compileComponents();

    shellData = TestBed.inject(ShellData);
    shellData.setDemoEnabled(true);

    const fixture = TestBed.createComponent(ChannelList);
    (fixture.componentRef as ComponentRef<ChannelList>).setInput('serverId', 'lofi');

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/channels/lofi/chung');
    fixture.detectChanges();

    const textGroupHeader = fixture.nativeElement.querySelector(
      '.channel-group-header button',
    ) as HTMLButtonElement;

    // Thu gọn nhóm Kênh chữ
    textGroupHeader.click();
    fixture.detectChanges();

    expect(fixture.componentInstance['isGroupCollapsed']('text')).toBe(true);
    // Danh sách vẫn còn và chứa đúng 1 kênh đang mở (chung)
    const textGroupList = fixture.nativeElement.querySelector('#channel-group-text');
    expect(textGroupList).toBeTruthy();
    const rows = textGroupList.querySelectorAll('.channel-row');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('chung');
  });

  it('chuột phải vào tiêu đề nhóm kích hoạt Category Context Menu', async () => {
    const fixture = await mount('lofi', true);

    const groupHeader = fixture.nativeElement.querySelector('.channel-group-header') as HTMLElement;
    expect(groupHeader).toBeTruthy();

    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 150,
      clientY: 200,
    });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

    groupHeader.dispatchEvent(event);
    fixture.detectChanges();

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
    expect(fixture.componentInstance['selectedGroup']()?.type).toBe('text');
    expect(fixture.componentInstance['contextMenuPosition']()).toEqual({ x: 150, y: 200 });
  });

  it('chuột phải vào hàng kênh kích hoạt Channel Context Menu', async () => {
    const fixture = await mount('lofi', true);

    const channelRow = fixture.nativeElement.querySelector('.channel-row') as HTMLElement;
    expect(channelRow).toBeTruthy();

    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 220,
      clientY: 310,
    });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

    channelRow.dispatchEvent(event);
    fixture.detectChanges();

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
    expect(fixture.componentInstance['selectedChannel']()?.id).toBe('chung');
    expect(fixture.componentInstance['contextMenuPosition']()).toEqual({ x: 220, y: 310 });
  });

  it('collapseAllGroups thu gọn toàn bộ các nhóm kênh', async () => {
    const fixture = await mount('lofi', true);

    expect(fixture.componentInstance['isGroupCollapsed']('text')).toBe(false);
    expect(fixture.componentInstance['isGroupCollapsed']('voice')).toBe(false);

    fixture.componentInstance['collapseAllGroups']();
    fixture.detectChanges();

    expect(fixture.componentInstance['isGroupCollapsed']('text')).toBe(true);
    expect(fixture.componentInstance['isGroupCollapsed']('voice')).toBe(true);
  });

  it('copyChannelLink sao chép liên kết kênh vào clipboard', async () => {
    const fixture = await mount('lofi', true);
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: writeTextSpy } });

    const channel: ChannelSummary = {
      id: 'chung',
      name: 'chung',
      type: 'text' as const,
      topic: null,
      unread: false,
      mentionCount: 0,
    };
    fixture.componentInstance['copyChannelLink'](channel);

    expect(writeTextSpy).toHaveBeenCalledWith(
      expect.stringContaining('/channels/lofi/chung'),
    );
  });

  it('createChannelOfSameType mở dialog tạo kênh với đúng loại kênh', async () => {
    const fixture = await mount('lofi', true);

    const voiceChannel: ChannelSummary = {
      id: 'phong-hop',
      name: 'Phòng họp',
      type: 'voice' as const,
      topic: null,
      unread: false,
      mentionCount: 0,
    };
    fixture.componentInstance['createChannelOfSameType'](voiceChannel);

    expect(mockDialog.open).toHaveBeenCalledWith(
      CreateChannelDialog,
      expect.objectContaining({
        data: expect.objectContaining({
          serverId: 'lofi',
          defaultType: 'voice',
        }),
      }),
    );
  });
});



