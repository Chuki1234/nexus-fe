import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ConversationResponseDto,
  ConversationsApiService,
} from '../../../../core/api/conversations-api.service';
import {
  MessageResponseDto,
  MessagesApiService,
} from '../../../../core/api/messages-api.service';
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
    attachments: [
      {
        id: 'att-1',
        filename: 'animation.gif',
        mimeType: 'image/gif',
        sizeBytes: 2500000,
        width: 800,
        height: 600,
        signedUrl: 'https://...',
      },
    ],
    reactions: [],
    createdAt: '2026-08-23T14:00:00.000Z',
  };

  let mockConversationsApi: {
    listConversations: ReturnType<typeof vi.fn>;
  };
  let mockMessagesApi: {
    forwardMessage: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockConversationsApi = {
      listConversations: vi.fn().mockResolvedValue(mockConversations),
    };
    mockMessagesApi = {
      forwardMessage: vi.fn().mockResolvedValue({
        id: '200',
        conversationId: 'conv-2',
        isForwarded: true,
      }),
    };

    await TestBed.configureTestingModule({
      imports: [ForwardMessageModal],
      providers: [
        { provide: ConversationsApiService, useValue: mockConversationsApi },
        { provide: MessagesApiService, useValue: mockMessagesApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForwardMessageModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('message', mockSourceMessage);
    fixture.componentRef.setInput('currentConversationId', 'conv-1');
  });

  it('dựng modal, tải danh sách cuộc trò chuyện và lọc bỏ conversation hiện tại (conv-1)', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockConversationsApi.listConversations).toHaveBeenCalledTimes(1);
    // conv-1 bị loại bỏ vì là currentConversationId
    expect(component.conversations().length).toBe(2);
    expect(component.conversations().map((c) => c.id)).toEqual(['conv-2', 'conv-3']);
  });

  it('lọc danh sách cuộc trò chuyện theo từ khóa tìm kiếm (displayName hoặc username)', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.searchQuery.set('Bob');
    expect(component.filteredConversations.length).toBe(1);
    expect(component.filteredConversations[0].id).toBe('conv-2');

    component.searchQuery.set('charlie');
    expect(component.filteredConversations.length).toBe(1);
    expect(component.filteredConversations[0].id).toBe('conv-3');

    component.searchQuery.set('không tồn tại');
    expect(component.filteredConversations.length).toBe(0);
  });

  it('single-select: chọn cuộc trò chuyện đích và kích hoạt chuyển tiếp', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const forwardSuccessSpy = vi.fn();
    const closeSpy = vi.fn();
    component.forwardSuccess.subscribe(forwardSuccessSpy);
    component.close.subscribe(closeSpy);

    // Chọn conv-2
    component.selectConversation('conv-2');
    expect(component.selectedConversationId()).toBe('conv-2');

    // Submit
    await component.submitForward();

    expect(mockMessagesApi.forwardMessage).toHaveBeenCalledWith(
      'conv-1',
      '100',
      expect.objectContaining({
        targetConversationId: 'conv-2',
        clientNonce: expect.any(String),
      }),
    );

    expect(forwardSuccessSpy).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('hiển thị tóm tắt loại tệp đính kèm trong preview card (GIF, ảnh, tài liệu)', () => {
    const summary = component.getAttachmentSummary();
    expect(summary).toBe('1 GIF');
  });

  it('xử lý lỗi khi API forward thất bại và hiển thị thông báo lỗi', async () => {
    mockMessagesApi.forwardMessage.mockRejectedValueOnce(
      new Error('Không có quyền truy cập'),
    );

    fixture.detectChanges();
    await fixture.whenStable();

    component.selectConversation('conv-2');
    await component.submitForward();

    expect(component.errorMessage()).toContain('Không có quyền truy cập');
    expect(component.isSubmitting()).toBe(false);
  });

  it('nhấn phím Escape đóng modal khi không ở trạng thái submitting', () => {
    const closeSpy = vi.fn();
    component.close.subscribe(closeSpy);

    component.onEscape();

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
