import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import {
  ConversationResponseDto,
  ConversationsApiService,
} from '../../../../core/api/conversations-api.service';
import {
  MessageResponseDto,
  MessagesApiService,
} from '../../../../core/api/messages-api.service';
import { ServersApiService } from '../../../../core/api/servers-api.service';
import { ServersStore } from '../../../../core/servers/servers.store';
import { FriendsStore } from '../../friends/services/friends-store';
import { ForwardMessageModal } from './forward-message-modal';

describe('ForwardMessageModal', () => {
  let component: ForwardMessageModal;
  let fixture: ComponentFixture<ForwardMessageModal>;

  const mockConversations: ConversationResponseDto[] = [
    {
      id: 'conv-1',
      type: 'dm',
      name: null,
      iconUrl: null,
      recipient: {
        id: 'user-1',
        username: 'alice',
        displayName: 'Alice Nguyễn',
        avatarUrl: null,
        statusMessage: null,
        presence: 'online',
      },
      unreadCount: 0,
      createdAt: '2026-08-23T10:00:00.000Z',
    },
    {
      id: 'conv-2',
      type: 'dm',
      name: null,
      iconUrl: null,
      recipient: {
        id: 'user-2',
        username: 'bob',
        displayName: 'Bob Trần',
        avatarUrl: null,
        statusMessage: null,
        presence: 'offline',
      },
      unreadCount: 0,
      createdAt: '2026-08-23T11:00:00.000Z',
    },
    {
      id: 'conv-3',
      type: 'dm',
      name: null,
      iconUrl: null,
      recipient: {
        id: 'user-3',
        username: 'charlie',
        displayName: 'Charlie Lê',
        avatarUrl: null,
        statusMessage: null,
        presence: 'idle',
      },
      unreadCount: 0,
      createdAt: '2026-08-23T12:00:00.000Z',
    },
  ];

  const mockSourceMessage: MessageResponseDto = {
    id: '100',
    channelId: null,
    conversationId: 'conv-1',
    authorId: 'user-1',
    author: {
      id: 'user-1',
      username: 'alice',
      displayName: 'Alice Nguyễn',
      avatarUrl: null,
    },
    type: 'default',
    content: 'Nội dung tin nhắn cần forward',
    replyToId: null,
    clientNonce: 'nonce-1',
    editedAt: null,
    deletedAt: null,
    isForwarded: false,
    externalMedia: null,
    attachments: [
      {
        id: 'att-1',
        filename: 'animation.gif',
        mimeType: 'image/gif',
        sizeBytes: 2500000,
        width: 800,
        height: 600,
        signedUrl: 'https://example.com/animation.gif',
      },
    ],
    reactions: [],
    createdAt: '2026-08-23T14:00:00.000Z',
  };

  let mockConversationsApi: {
    listConversations: ReturnType<typeof vi.fn>;
    getOrCreateDm: ReturnType<typeof vi.fn>;
  };
  let mockMessagesApi: {
    forwardMessage: ReturnType<typeof vi.fn>;
    forwardChannelMessage: ReturnType<typeof vi.fn>;
  };
  let mockServersStore: {
    servers: ReturnType<typeof vi.fn>;
    channelsOf: ReturnType<typeof vi.fn>;
  };
  let mockServersApi: {
    listChannels: ReturnType<typeof vi.fn>;
  };
  let mockFriendsStore: {
    friends: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockConversationsApi = {
      listConversations: vi.fn().mockResolvedValue(mockConversations),
      getOrCreateDm: vi.fn().mockResolvedValue({ id: 'conv-new' }),
    };
    mockMessagesApi = {
      forwardMessage: vi.fn().mockResolvedValue({
        id: '200',
        conversationId: 'conv-2',
        isForwarded: true,
      }),
      forwardChannelMessage: vi.fn().mockResolvedValue({
        id: '201',
        channelId: 'chan-1',
        isForwarded: true,
      }),
    };
    mockServersStore = {
      servers: vi.fn().mockReturnValue([
        { id: 'srv-1', name: 'Gaming Zone', iconUrl: 'https://example.com/icon.png' },
      ]),
      channelsOf: vi.fn().mockReturnValue([
        { id: 'chan-1', serverId: 'srv-1', name: 'chung', type: 'text', topic: 'Kênh chat chung' },
        { id: 'chan-voice', serverId: 'srv-1', name: 'Thoại 1', type: 'voice' },
      ]),
    };
    mockServersApi = {
      listChannels: vi.fn().mockResolvedValue([]),
    };
    mockFriendsStore = {
      friends: vi.fn().mockReturnValue([]),
    };

    await TestBed.configureTestingModule({
      imports: [ForwardMessageModal],
      providers: [
        { provide: ConversationsApiService, useValue: mockConversationsApi },
        { provide: MessagesApiService, useValue: mockMessagesApi },
        { provide: ServersStore, useValue: mockServersStore },
        { provide: ServersApiService, useValue: mockServersApi },
        { provide: FriendsStore, useValue: mockFriendsStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForwardMessageModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('message', mockSourceMessage);
    fixture.componentRef.setInput('currentConversationId', 'conv-1');
  });

  it('dựng modal, tải danh sách bạn bè và server channels, loại bỏ conversation hiện tại (conv-1)', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockConversationsApi.listConversations).toHaveBeenCalledTimes(1);
    // conv-1 bị loại bỏ vì là currentConversationId
    expect(component.dmTargets().length).toBe(2);
    expect(component.dmTargets().map((c) => c.id)).toEqual(['conv-2', 'conv-3']);

    // Server group và channels
    expect(component.serverGroups().length).toBe(1);
    expect(component.serverGroups()[0].name).toBe('Gaming Zone');
    expect(component.serverGroups()[0].iconUrl).toBe('https://example.com/icon.png');
    // Loại kênh voice
    expect(component.serverGroups()[0].channels.length).toBe(1);
    expect(component.serverGroups()[0].channels[0].name).toBe('#chung');
  });

  it('lọc danh sách bạn bè và kênh theo từ khóa tìm kiếm', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.searchQuery.set('Bob');
    expect(component.filteredDmTargets().length).toBe(1);
    expect(component.filteredDmTargets()[0].id).toBe('conv-2');
    expect(component.filteredServerGroups().length).toBe(0);

    component.searchQuery.set('Gaming');
    expect(component.filteredDmTargets().length).toBe(0);
    expect(component.filteredServerGroups().length).toBe(1);
    expect(component.filteredServerGroups()[0].name).toBe('Gaming Zone');

    component.searchQuery.set('không tồn tại');
    expect(component.filteredDmTargets().length).toBe(0);
    expect(component.filteredServerGroups().length).toBe(0);
  });

  it('gửi tin nhắn trực tiếp tới bạn bè và đánh dấu đã gửi thành công', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const forwardSuccessSpy = vi.fn();
    component.forwardSuccess.subscribe(forwardSuccessSpy);

    const dmTarget = component.dmTargets().find((t) => t.id === 'conv-2')!;
    await component.sendToTarget(dmTarget);

    expect(mockMessagesApi.forwardMessage).toHaveBeenCalledWith(
      'conv-1',
      '100',
      expect.objectContaining({
        targetConversationId: 'conv-2',
        clientNonce: expect.any(String),
      }),
    );

    expect(component.isTargetSent('conv-2')).toBe(true);
    expect(forwardSuccessSpy).toHaveBeenCalled();
  });

  it('gửi tin nhắn vào kênh máy chủ hiển thị ảnh server và tên kênh', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const forwardSuccessSpy = vi.fn();
    component.forwardSuccess.subscribe(forwardSuccessSpy);

    const chanTarget = component.serverGroups()[0].channels[0];
    await component.sendToTarget(chanTarget);

    expect(mockMessagesApi.forwardMessage).toHaveBeenCalledWith(
      'conv-1',
      '100',
      expect.objectContaining({
        targetChannelId: 'chan-1',
        clientNonce: expect.any(String),
      }),
    );

    expect(component.isTargetSent('chan-1')).toBe(true);
    expect(forwardSuccessSpy).toHaveBeenCalled();
  });

  it('xử lý lỗi khi API forward thất bại và hiển thị thông báo lỗi', async () => {
    mockMessagesApi.forwardMessage.mockRejectedValueOnce(
      new Error('Không có quyền gửi tin nhắn vào kênh này'),
    );

    fixture.detectChanges();
    await fixture.whenStable();

    const dmTarget = component.dmTargets().find((t) => t.id === 'conv-2')!;
    await component.sendToTarget(dmTarget);

    expect(component.errorMessage()).toContain('Không có quyền gửi tin nhắn');
    expect(component.isTargetSent('conv-2')).toBe(false);
  });

  it('nhấn phím Escape đóng modal', () => {
    const closeSpy = vi.fn();
    component.close.subscribe(closeSpy);

    component.onEscape();

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
