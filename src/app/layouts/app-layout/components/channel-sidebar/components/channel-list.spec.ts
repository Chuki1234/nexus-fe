import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { ComponentRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChannelSummary } from '../../../../../core/servers/server.models';
import { ServerCapabilitiesService } from '../../../../../core/servers/server-capabilities.service';
import { ServersStore } from '../../../../../core/servers/servers.store';
import { ServerVoiceStatesStore } from '../../../../../core/servers/server-voice-states.store';
import { VoiceRoomService } from '../../../../../features/voice/services/voice-room.service';
import { ChannelList } from './channel-list';
import { CreateChannelDialog } from './create-channel-dialog/create-channel-dialog';

describe('ChannelList', () => {
  let mockDialog: { open: ReturnType<typeof vi.fn> };
  let mockCapabilitiesService: {
    capabilitiesMap: ReturnType<typeof signal<Map<string, any>>>;
    load: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
  };

  const mount = async (
    serverId: string,
    hasChannels = false,
    caps: any = {
      isOwner: true,
      canInviteMembers: true,
      canManageServer: true,
      canManageChannels: true,
      canManageRoles: true,
    },
  ) => {
    mockDialog = { open: vi.fn() };
    mockCapabilitiesService = {
      capabilitiesMap: signal(
        new Map([
          [serverId, caps],
          [
            'lofi',
            caps,
          ],
        ]),
      ),
      load: vi.fn().mockResolvedValue(caps),
      refresh: vi.fn(),
      clear: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ChannelList],
      providers: [
        provideRouter([{ path: '**', component: ChannelList }]),
        { provide: MatDialog, useValue: mockDialog },
        { provide: ServerCapabilitiesService, useValue: mockCapabilitiesService },
      ],
    }).compileComponents();

    const serversStore = TestBed.inject(ServersStore);
    if (hasChannels) {
      serversStore.setChannels(serverId, [
        { id: 'chung', name: 'chung', type: 'text', topic: 'Kênh chung', unread: false, mentionCount: 0 },
        { id: 'nhac', name: 'nhạc', type: 'text', topic: null, unread: true, mentionCount: 0 },
        { id: 'phong-hop', name: 'Phòng họp', type: 'voice', topic: null, unread: false, mentionCount: 0 },
      ]);
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
    const textGroupListBefore = fixture.nativeElement.querySelector('#channel-group-cat-text');
    expect(textGroupListBefore).toBeTruthy();
    expect(textGroupListBefore.querySelectorAll('.channel-row').length).toBeGreaterThan(0);

    // Click để thu gọn
    textGroupHeader.click();
    fixture.detectChanges();

    expect(textGroupHeader.getAttribute('aria-expanded')).toBe('false');
    // Drop target container luôn được giữ trong DOM để nhận drop, nhưng các kênh con bị ẩn
    const textGroupListAfter = fixture.nativeElement.querySelector('#channel-group-cat-text');
    expect(textGroupListAfter).toBeTruthy();
    expect(textGroupListAfter.querySelectorAll('.channel-row').length).toBe(0);

    // Click lại để mở rộng
    textGroupHeader.click();
    fixture.detectChanges();

    expect(textGroupHeader.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('#channel-group-cat-text')?.querySelectorAll('.channel-row').length).toBeGreaterThan(0);
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

  it('khi thu gọn nhóm thì toàn bộ kênh con bị ẩn (không giữ active channel exception)', async () => {
    mockDialog = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ChannelList],
      providers: [
        provideRouter([
          { path: 'channels/:serverId/:channelId', component: ChannelList },
        ]),
        { provide: MatDialog, useValue: mockDialog },
      ],
    }).compileComponents();

    const serversStore = TestBed.inject(ServersStore);
    serversStore.setChannels('lofi', [
      { id: 'chung', name: 'chung', type: 'text', topic: 'Kênh chung', unread: false, mentionCount: 0 },
      { id: 'nhac', name: 'nhạc', type: 'text', topic: null, unread: true, mentionCount: 0 },
      { id: 'phong-hop', name: 'Phòng họp', type: 'voice', topic: null, unread: false, mentionCount: 0 },
    ]);

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

    expect(fixture.componentInstance['isGroupCollapsed']('cat-text')).toBe(true);
    // Danh sách drop-list vẫn còn nhưng ẩn toàn bộ kênh con để không làm lệch drop index
    const textGroupList = fixture.nativeElement.querySelector('#channel-group-cat-text');
    expect(textGroupList).toBeTruthy();
    const rows = textGroupList.querySelectorAll('.channel-row');
    expect(rows.length).toBe(0);
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
    expect(fixture.componentInstance['selectedGroup']()?.id).toBe('cat-text');
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

    expect(fixture.componentInstance['isGroupCollapsed']('cat-text')).toBe(false);
    expect(fixture.componentInstance['isGroupCollapsed']('cat-voice')).toBe(false);

    fixture.componentInstance['collapseAllGroups']();
    fixture.detectChanges();

    expect(fixture.componentInstance['isGroupCollapsed']('cat-text')).toBe(true);
    expect(fixture.componentInstance['isGroupCollapsed']('cat-voice')).toBe(true);
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

  it('onInvite mở InviteChannelDialog', async () => {
    const fixture = await mount('lofi', true);
    const channel: ChannelSummary = {
      id: 'chung',
      name: 'chung',
      type: 'text' as const,
      topic: null,
      unread: false,
      mentionCount: 0,
    };
    const mockEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as Event;
    fixture.componentInstance['onInvite'](mockEvent, channel);

    expect(mockDialog.open).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        data: expect.objectContaining({
          serverId: 'lofi',
          channelName: 'chung',
        }),
      }),
    );
  });

  it('onChannelSettings mở ChannelSettingsModal', async () => {
    const fixture = await mount('lofi', true);
    const channel: ChannelSummary = {
      id: 'chung',
      name: 'chung',
      type: 'text' as const,
      topic: null,
      unread: false,
      mentionCount: 0,
    };
    const mockEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as Event;
    fixture.componentInstance['onChannelSettings'](mockEvent, channel);

    expect(mockDialog.open).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        data: expect.objectContaining({
          serverId: 'lofi',
          channel,
        }),
      }),
    );
  });

  it('onOpenVoiceChat kích hoạt openChatDrawer và điều hướng sang kênh', async () => {
    const fixture = await mount('lofi', true);
    const channel: ChannelSummary = {
      id: 'phong-cho',
      name: 'Phòng chờ',
      type: 'voice' as const,
      topic: null,
      unread: false,
      mentionCount: 0,
    };
    const mockEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as Event;
    const voiceRoom = TestBed.inject(VoiceRoomService);
    const openChatSpy = vi.spyOn(voiceRoom, 'openChatDrawer');

    fixture.componentInstance['onOpenVoiceChat'](mockEvent, channel);

    expect(openChatSpy).toHaveBeenCalled();
  });

  it('ẩn hoàn toàn nút + tạo kênh khi user không có quyền canManageChannels', async () => {
    const fixture = await mount('lofi', true, {
      isOwner: false,
      canInviteMembers: true,
      canManageServer: false,
      canManageChannels: false,
      canManageRoles: false,
    });

    const addButtons = fixture.nativeElement.querySelectorAll('.add-channel-btn');
    expect(addButtons.length).toBe(0);
  });

  it('kênh thoại được tạo trong danh mục Kênh chữ (categoryId: cat-text) sẽ nằm trong Kênh chữ kèm icon volume_up', async () => {
    const fixture = await mount('lofi', false);
    const serversStore = TestBed.inject(ServersStore);

    serversStore.setChannels('lofi', [
      { id: 'c1', name: 'chat-chung', type: 'text', topic: null, unread: false, mentionCount: 0, categoryId: 'cat-text' },
      { id: 'c2', name: 'Thoại Trong Chữ', type: 'voice', topic: null, unread: false, mentionCount: 0, categoryId: 'cat-text' },
    ]);
    fixture.detectChanges();

    const textGroup = fixture.nativeElement.querySelector('#channel-group-cat-text');
    expect(textGroup).toBeTruthy();
    expect(textGroup.textContent).toContain('chat-chung');
    expect(textGroup.textContent).toContain('Thoại Trong Chữ');

    // Kiểm tra icon của kênh thoại trong nhóm text
    const voiceChannelIcon = textGroup.querySelector('a[href="/channels/lofi/c2"] mat-icon');
    expect(voiceChannelIcon.textContent.trim()).toBe('volume_up');
  });

  it('hỗ trợ danh mục tùy chỉnh do người dùng tạo và hiển thị cả text lẫn voice bên trong', async () => {
    const fixture = await mount('lofi', false);
    const serversStore = TestBed.inject(ServersStore);

    serversStore.setCategories('lofi', [
      { id: 'cat-hoc-tap', name: 'HỌC TẬP', isPrivate: false },
    ]);
    serversStore.setChannels('lofi', [
      { id: 'c1', name: 'tai-lieu', type: 'text', topic: null, unread: false, mentionCount: 0, categoryId: 'cat-hoc-tap' },
      { id: 'c2', name: 'Thảo Luận Nhóm', type: 'voice', topic: null, unread: false, mentionCount: 0, categoryId: 'cat-hoc-tap' },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('HỌC TẬP');
    const groupEl = fixture.nativeElement.querySelector('#channel-group-cat-hoc-tap');
    expect(groupEl.textContent).toContain('tai-lieu');
    expect(groupEl.textContent).toContain('Thảo Luận Nhóm');
  });

  it('hiển thị danh sách thành viên trong kênh voice khi người dùng đứng ngoài kênh kèm icon mic/cam và nút Xem Stream', async () => {
    const fixture = await mount('lofi', true);
    const voiceStatesStore = TestBed.inject(ServerVoiceStatesStore);

    voiceStatesStore.voiceStatesByServer.set({
      lofi: [
        {
          userId: 'user-streamer',
          channelId: 'phong-hop',
          serverId: 'lofi',
          name: 'Minh Tài Streamer',
          username: 'minhtai',
          displayName: 'Minh Tài Streamer',
          avatarUrl: null,
          isMuted: true,
          isCameraOn: true,
          isScreenSharing: true,
          joinedAt: '2026-08-25T14:00:00.000Z',
        },
      ],
    });
    fixture.detectChanges();

    const voiceChannelRow = fixture.nativeElement.querySelector('.voice-channel-members');
    expect(voiceChannelRow).toBeTruthy();
    expect(voiceChannelRow.textContent).toContain('Minh Tài Streamer');
    expect(voiceChannelRow.textContent).toContain('XEM');

    // Kiểm tra icon mic_off và videocam
    const micOffIcon = voiceChannelRow.querySelector('mat-icon');
    expect(micOffIcon).toBeTruthy();
  });

  it('hợp nhất Redis voice state với LiveKit để participant không biến mất khi vừa join', async () => {
    const fixture = await mount('lofi', true);
    const voiceStatesStore = TestBed.inject(ServerVoiceStatesStore);
    const voiceRoom = TestBed.inject(VoiceRoomService);

    voiceStatesStore.voiceStatesByServer.set({
      lofi: [{
        userId: 'mentor-id', channelId: 'phong-hop', serverId: 'lofi',
        name: 'Anh Mentor', username: 'mentor', displayName: 'Anh Mentor', avatarUrl: null,
        isMuted: false, isCameraOn: false, isScreenSharing: false,
        joinedAt: '2026-08-26T10:00:00.000Z',
      }],
    });
    voiceRoom.currentChannelId.set('phong-hop');
    voiceRoom.localParticipant.set({
      identity: 'local-id', name: 'Minh Tài', isLocal: true, isSpeaking: false,
      isMuted: false, isCameraOn: false, isScreenSharing: false,
      connectionQuality: 'excellent',
    });
    voiceRoom.remoteParticipants.set([]);

    const members = fixture.componentInstance['getVoiceChannelMembers']('phong-hop');
    expect(members.map((member) => member.userId)).toEqual(['mentor-id', 'local-id']);
  });

  it('onWatchStream: điều hướng và kết nối vào kênh khi bấm Xem Stream', async () => {
    const fixture = await mount('lofi', true);
    const voiceStatesStore = TestBed.inject(ServerVoiceStatesStore);
    const voiceRoom = TestBed.inject(VoiceRoomService);
    const router = TestBed.inject(Router);

    const joinRoomSpy = vi.spyOn(voiceRoom, 'joinRoom').mockResolvedValue(undefined);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    voiceStatesStore.voiceStatesByServer.set({
      lofi: [
        {
          userId: 'user-streamer',
          channelId: 'phong-hop',
          serverId: 'lofi',
          name: 'Streamer Pro',
          username: 'streamer',
          displayName: 'Streamer Pro',
          avatarUrl: null,
          isMuted: false,
          isCameraOn: true,
          isScreenSharing: true,
          joinedAt: '2026-08-25T14:00:00.000Z',
        },
      ],
    });
    fixture.detectChanges();

    const watchBtn = fixture.nativeElement.querySelector(
      '.voice-member-row button',
    ) as HTMLButtonElement;
    expect(watchBtn).toBeTruthy();

    watchBtn.click();
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(['/channels', 'lofi', 'phong-hop']);
    expect(joinRoomSpy).toHaveBeenCalledWith('lofi', 'phong-hop', 'Phòng họp');
  });

  it('kênh không thuộc danh mục nào có thể hiển thị ở ĐẦU TIÊN xen kẽ các danh mục', async () => {
    const fixture = await mount('custom-server', false);
    const serversStore = TestBed.inject(ServersStore);

    serversStore.setCategories('custom-server', [
      { id: 'cat-tai', name: 'tài' },
      { id: 'cat-gaming', name: 'gaming' },
    ]);

    serversStore.setChannels('custom-server', [
      { id: 'c-tai-1', name: 'tim-đồng-đội', type: 'text', topic: null, unread: false, mentionCount: 0, categoryId: 'cat-tai' },
      { id: 'c-top', name: 'kênh-mới-ở-top', type: 'text', topic: null, unread: false, mentionCount: 0, categoryId: null },
      { id: 'c-gaming-1', name: 'lol-gameplay', type: 'text', topic: null, unread: false, mentionCount: 0, categoryId: 'cat-gaming' },
    ]);

    // Kéo c-top lên vị trí đầu tiên của root (index 0)
    serversStore.moveChannel('custom-server', 'c-top', null, 0, 0);

    fixture.detectChanges();

    const groups = fixture.componentInstance['groups']();
    expect(groups.length).toBe(3);
    // Nhóm 1: root channel c-top ở đầu tiên
    expect(groups[0].id).toBe('c-top');
    expect(groups[0].channels.map((c) => c.id)).toEqual(['c-top']);

    // Nhóm 2 & 3: các danh mục
    expect(groups[1].id).toBe('cat-tai');
    expect(groups[2].id).toBe('cat-gaming');

    // Kiểm tra DOM: Kênh root render trước header danh mục 'tài'
    const textContent = fixture.nativeElement.textContent;
    const topChannelIndex = textContent.indexOf('kênh-mới-ở-top');
    const taiCatIndex = textContent.indexOf('tài');
    expect(topChannelIndex).toBeLessThan(taiCatIndex);
  });

  it('kéo thả sắp xếp danh mục (onCategoryDrop) và bảo toàn các kênh con của danh mục đó', async () => {
    const fixture = await mount('custom-server', false);
    const serversStore = TestBed.inject(ServersStore);

    serversStore.setCategories('custom-server', [
      { id: 'cat-1', name: 'Danh mục 1' },
      { id: 'cat-2', name: 'Danh mục 2' },
    ]);

    serversStore.setChannels('custom-server', [
      { id: 'c-1', name: 'kênh-1', type: 'text', topic: null, unread: false, mentionCount: 0, categoryId: 'cat-1' },
      { id: 'c-2', name: 'kênh-2', type: 'text', topic: null, unread: false, mentionCount: 0, categoryId: 'cat-2' },
    ]);

    fixture.detectChanges();

    // Kéo Danh mục 2 lên trước Danh mục 1
    fixture.componentInstance['onCategoryDrop']({
      previousIndex: 1,
      currentIndex: 0,
      item: { data: { kind: 'category', category: { id: 'cat-2', name: 'Danh mục 2' } } },
    } as any);

    fixture.detectChanges();

    const categories = serversStore.categoriesOf('custom-server');
    expect(categories[0].id).toBe('cat-2');
    expect(categories[1].id).toBe('cat-1');

    const groups = fixture.componentInstance['groups']();
    expect(groups[0].id).toBe('cat-2');
    expect(groups[0].channels.map((c) => c.name)).toEqual(['kênh-2']);
    expect(groups[1].id).toBe('cat-1');
    expect(groups[1].channels.map((c) => c.name)).toEqual(['kênh-1']);
  });

  describe('Channel Drag & Drop Hierarchy & Dwell Timer', () => {
    it('isRootEnterPredicate và isCategoryChildEnterPredicate phân tách đúng; CdkDrag directive nhận startDelay { touch: 150, mouse: 0 }', async () => {
      const fixture = await mount('custom-server', false);
      const serversStore = TestBed.inject(ServersStore);

      serversStore.setCategories('custom-server', [{ id: 'cat-study', name: 'Học tập' }]);
      serversStore.setChannels('custom-server', [
        { id: 'ch-a', name: 'Kênh A', type: 'text', topic: null, unread: false, mentionCount: 0, categoryId: 'cat-study' },
      ]);
      fixture.detectChanges();

      // Kiểm tra CdkDrag directive thực tế trên phần tử DOM
      const dragDebugEls = fixture.debugElement.queryAll(By.directive(CdkDrag));
      const channelDragEl = dragDebugEls.find((el) => el.nativeElement.classList.contains('channel-row'));
      expect(channelDragEl).toBeTruthy();
      const cdkDragDirective = channelDragEl?.injector.get(CdkDrag);
      expect(cdkDragDirective?.dragStartDelay).toEqual({ touch: 150, mouse: 0 });

      // Nested category lists must be hit-tested before the root list, whose
      // bounding box contains the entire sidebar and would otherwise intercept
      // every channel drag.
      const rootDropEl = fixture.debugElement.queryAll(By.directive(CdkDropList))
        .find((el) => el.nativeElement.id === 'channel-sidebar-root-list');
      const rootDropDirective = rootDropEl?.injector.get(CdkDropList);
      expect(rootDropDirective?.connectedTo).toEqual([
        'channel-group-cat-study',
        'category-header-drop-cat-study',
        'channel-sidebar-root-list',
      ]);

      const instance = fixture.componentInstance;
      const categoryDrag = { data: { kind: 'category', category: { id: 'cat-1' } } } as any;
      const channelDrag = { data: { kind: 'channel', channel: { id: 'ch-1' } } } as any;
      const voiceMemberDrag = { data: { userId: 'u-1', name: 'User 1' } } as any;

      // Root nhận cả category lẫn channel (kéo kênh ra cấp máy chủ), từ chối
      // voice member. Thứ tự connectedTo mới là thứ bảo vệ list con khỏi root.
      expect(instance['isRootEnterPredicate'](categoryDrag)).toBe(true);
      expect(instance['isRootEnterPredicate'](channelDrag)).toBe(true);
      expect(instance['isRootEnterPredicate'](voiceMemberDrag)).toBe(false);

      // Category con CHỈ chấp nhận channel, từ chối category và voice member
      expect(instance['isCategoryChildEnterPredicate'](categoryDrag)).toBe(false);
      expect(instance['isCategoryChildEnterPredicate'](channelDrag)).toBe(true);
      expect(instance['isCategoryChildEnterPredicate'](voiceMemberDrag)).toBe(false);
    });

    it('mọi channel cdkDrag phân giải đúng CdkDropList chứa nó (chặn hồi quy free-drag)', async () => {
      const fixture = await mount('custom-server', false);
      const serversStore = TestBed.inject(ServersStore);

      serversStore.setCategories('custom-server', [{ id: 'cat-study', name: 'Học tập' }]);
      serversStore.setChannels('custom-server', [
        { id: 'ch-a', name: 'Kênh A', type: 'text', topic: null, unread: false, mentionCount: 0, categoryId: 'cat-study' },
        { id: 'ch-b', name: 'Kênh B', type: 'text', topic: null, unread: false, mentionCount: 0, categoryId: 'cat-study' },
        { id: 'ch-free', name: 'Kênh gốc', type: 'text', topic: null, unread: false, mentionCount: 0, categoryId: 'cat-uncategorized' },
      ]);
      fixture.detectChanges();

      // Trước đây channel row được render qua *ngTemplateOutlet với template khai
      // báo ở gốc component. Embedded view phân giải DI tại NƠI KHAI BÁO, nên
      // CdkDrag nhận dropContainer = null và trở thành free-drag: không sort,
      // không phát cdkDropListDropped, thả xong nhảy về chỗ cũ.
      const channelDrags = fixture.debugElement
        .queryAll(By.directive(CdkDrag))
        .filter((el) => el.nativeElement.classList.contains('channel-row'));

      expect(channelDrags.length).toBe(3);

      const containerOf = (name: string) =>
        channelDrags
          .find((el) => el.nativeElement.textContent.includes(name))
          ?.injector.get(CdkDrag).dropContainer?.id;

      expect(containerOf('Kênh A')).toBe('channel-group-cat-study');
      expect(containerOf('Kênh B')).toBe('channel-group-cat-study');
      expect(containerOf('Kênh gốc')).toBe('channel-sidebar-root-list');

      for (const el of channelDrags) {
        expect(el.injector.get(CdkDrag).dropContainer).toBeTruthy();
      }
    });

    it('root từ chối nhận channel khi con trỏ đang ở trong cây con của category', async () => {
      const fixture = await mount('custom-server', false);
      const serversStore = TestBed.inject(ServersStore);

      serversStore.setCategories('custom-server', [{ id: 'cat-study', name: 'Học tập' }]);
      serversStore.setChannels('custom-server', [
        { id: 'ch-a', name: 'Kênh A', type: 'text', topic: null, unread: false, mentionCount: 0, categoryId: 'cat-study' },
      ]);
      fixture.detectChanges();

      const instance = fixture.componentInstance;
      const channelDrag = { data: { kind: 'channel', channel: { id: 'ch-a' } } } as any;

      // Chưa có toạ độ (pha kích hoạt receiver của CDK): phải chấp nhận, nếu
      // không DropListRef._startReceiving() sẽ không cache DOMRect và root
      // không bao giờ nhận được drop trong suốt thao tác kéo.
      expect(instance['isRootEnterPredicate'](channelDrag)).toBe(true);

      const elementFromPoint = vi
        .spyOn(document, 'elementFromPoint')
        .mockReturnValue(fixture.nativeElement.querySelector('#channel-group-cat-study'));
      instance['lastDragPointer'] = { x: 10, y: 10 };

      expect(instance['isRootEnterPredicate'](channelDrag)).toBe(false);

      elementFromPoint.mockReturnValue(fixture.nativeElement.querySelector('#channel-sidebar-root-list'));
      expect(instance['isRootEnterPredicate'](channelDrag)).toBe(true);

      elementFromPoint.mockRestore();
      instance['lastDragPointer'] = null;
    });

    it('onCategoryChildDrop sắp xếp kênh trong cùng category; placeholder child có class thụt lề', async () => {
      const fixture = await mount('custom-server', false);
      const serversStore = TestBed.inject(ServersStore);

      serversStore.setCategories('custom-server', [{ id: 'cat-study', name: 'Học tập' }]);
      serversStore.setChannels('custom-server', [
        { id: 'ch-a', name: 'Kênh A', type: 'text', topic: null, unread: false, mentionCount: 0, categoryId: 'cat-study' },
        { id: 'ch-b', name: 'Kênh B', type: 'text', topic: null, unread: false, mentionCount: 0, categoryId: 'cat-study' },
        { id: 'ch-c', name: 'Kênh C', type: 'text', topic: null, unread: false, mentionCount: 0, categoryId: 'cat-study' },
      ]);
      fixture.detectChanges();

      // Kéo ch-c từ index 2 lên index 0 trong cùng container
      const dropEvent = {
        previousIndex: 2,
        currentIndex: 0,
        container: { data: { categoryId: 'cat-study' } },
        previousContainer: { data: { categoryId: 'cat-study' } },
        item: { data: { kind: 'channel', channel: { id: 'ch-c', name: 'Kênh C' } } },
        dropPoint: { x: 5, y: 5 },
      } as any;
      dropEvent.previousContainer = dropEvent.container;

      fixture.componentInstance['onCategoryChildDrop'](dropEvent, 'cat-study');
      fixture.detectChanges();

      const layout = serversStore.getServerLayout('custom-server');
      expect(layout.categoryChannels['cat-study']).toEqual(['ch-c', 'ch-a', 'ch-b']);
    });

    it('thả trên Category Header đưa channel vào category; thả xuống root đưa channel ra cấp máy chủ', async () => {
      const fixture = await mount('custom-server', false);
      const serversStore = TestBed.inject(ServersStore);

      serversStore.setCategories('custom-server', [{ id: 'cat-study', name: 'Học tập' }]);
      serversStore.setChannels('custom-server', [
        { id: 'ch-a', name: 'Kênh A', type: 'text', topic: null, unread: false, mentionCount: 0, categoryId: null },
      ]);
      fixture.detectChanges();

      // Header drop target tồn tại trong DOM
      const headerDrop = fixture.nativeElement.querySelector('#category-header-drop-cat-study');
      expect(headerDrop).toBeTruthy();

      // Thả channel ch-a vào category header drop target
      const headerDropEvent = {
        previousIndex: 0,
        currentIndex: 0,
        container: { data: { kind: 'category-header', categoryId: 'cat-study' } },
        previousContainer: { data: { kind: 'root' } },
        item: { data: { id: 'ch-a', name: 'Kênh A', type: 'text' } },
        dropPoint: { x: 5, y: 5 },
      } as any;

      fixture.componentInstance['onCategoryHeaderDrop'](headerDropEvent, 'cat-study');
      fixture.detectChanges();

      const layoutAfterHeaderDrop = serversStore.getServerLayout('custom-server');
      expect(layoutAfterHeaderDrop.categoryChannels['cat-study']).toContain('ch-a');

      // Kéo từ category ra root list (container khác nhau => đổi cấp)
      const rootContainer = { data: { kind: 'root' } };
      const rootDropEvent = {
        previousIndex: 0,
        currentIndex: 0,
        container: rootContainer,
        previousContainer: { data: { kind: 'category', categoryId: 'cat-study' } },
        item: { data: { id: 'ch-a', name: 'Kênh A', type: 'text' } },
        dropPoint: { x: 5, y: 5 },
      } as any;

      fixture.componentInstance['onRootDrop'](rootDropEvent);
      fixture.detectChanges();

      const layoutAfterRootDrop = serversStore.getServerLayout('custom-server');
      expect(layoutAfterRootDrop.categoryChannels['cat-study']).not.toContain('ch-a');
      expect(layoutAfterRootDrop.rootItems[0]).toEqual({ kind: 'channel', id: 'ch-a' });
    });

    it('thả ra ngoài vùng sidebar thì rollback, không mutate layout', async () => {
      const fixture = await mount('custom-server', false);
      const serversStore = TestBed.inject(ServersStore);

      serversStore.setCategories('custom-server', [{ id: 'cat-study', name: 'Học tập' }]);
      serversStore.setChannels('custom-server', [
        { id: 'ch-a', name: 'Kênh A', type: 'text', topic: null, unread: false, mentionCount: 0, categoryId: 'cat-study' },
        { id: 'ch-b', name: 'Kênh B', type: 'text', topic: null, unread: false, mentionCount: 0, categoryId: 'cat-study' },
      ]);
      fixture.detectChanges();

      const before = serversStore.getServerLayout('custom-server');
      const hostRect = (fixture.nativeElement as HTMLElement).getBoundingClientRect();

      const container = { data: { kind: 'category', categoryId: 'cat-study' } };
      const outsideDrop = {
        previousIndex: 1,
        currentIndex: 0,
        container,
        previousContainer: container,
        item: { data: { id: 'ch-b', name: 'Kênh B', type: 'text' } },
        dropPoint: { x: hostRect.right + 500, y: hostRect.bottom + 500 },
      } as any;

      fixture.componentInstance['onCategoryChildDrop'](outsideDrop, 'cat-study');
      fixture.detectChanges();

      expect(serversStore.getServerLayout('custom-server').categoryChannels['cat-study']).toEqual(
        before.categoryChannels['cat-study'],
      );
    });

    it('trigger cdkDragStarted/cdkDragEnded qua template binding và Dwell Timer tự động mở rộng category', async () => {
      vi.useFakeTimers();
      const fixture = await mount('custom-server', false);
      const serversStore = TestBed.inject(ServersStore);

      serversStore.setCategories('custom-server', [{ id: 'cat-study', name: 'Học tập' }]);
      serversStore.setChannels('custom-server', [
        { id: 'ch-a', name: 'Kênh A', type: 'text', topic: null, unread: false, mentionCount: 0, categoryId: 'cat-study' },
      ]);
      fixture.detectChanges();

      // Lấy channel drag element khi đang mở
      let dragDebugEls = fixture.debugElement.queryAll(By.directive(CdkDrag));
      let channelDragEl = dragDebugEls.find((el) => el.nativeElement.classList.contains('channel-row'));
      expect(channelDragEl).toBeTruthy();

      // Trigger cdkDragStarted thật thông qua DebugElement template binding
      channelDragEl?.triggerEventHandler('cdkDragStarted', null);
      fixture.detectChanges();
      expect(fixture.componentInstance['isDraggingChannel']()).toBe(true);

      // Thu gọn category
      fixture.componentInstance['toggleGroup']('cat-study', true);
      fixture.detectChanges();
      expect(fixture.componentInstance['isGroupCollapsed']('cat-study')).toBe(true);

      // Hover vào category header qua drop entered event
      fixture.componentInstance['onCategoryHeaderDropEntered']('cat-study');
      expect(fixture.componentInstance['activeHoverCategoryId']()).toBe('cat-study');

      // Trước 600ms vẫn đóng
      vi.advanceTimersByTime(500);
      expect(fixture.componentInstance['isGroupCollapsed']('cat-study')).toBe(true);

      // Đến 600ms tự động mở
      vi.advanceTimersByTime(100);
      fixture.detectChanges();
      expect(fixture.componentInstance['isGroupCollapsed']('cat-study')).toBe(false);

      // Trigger cdkDragEnded thật thông qua DebugElement template binding
      dragDebugEls = fixture.debugElement.queryAll(By.directive(CdkDrag));
      channelDragEl = dragDebugEls.find((el) => el.nativeElement.classList.contains('channel-row'));
      expect(channelDragEl).toBeTruthy();

      channelDragEl?.triggerEventHandler('cdkDragEnded', null);
      fixture.detectChanges();
      expect(fixture.componentInstance['isDraggingChannel']()).toBe(false);
      expect(fixture.componentInstance['activeHoverCategoryId']()).toBeNull();

      vi.useRealTimers();
    });
  });
});

