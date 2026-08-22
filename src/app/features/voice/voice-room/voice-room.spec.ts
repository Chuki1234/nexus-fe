import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChannelSummary } from '../../../core/api/shell-data';
import { ShellData } from '../../../core/api/shell-data';
import { VoiceConnectionStatus, VoiceParticipantModel, VoiceRoomService } from '../services/voice-room.service';
import { VoiceRoom } from './voice-room';

describe('VoiceRoom', () => {
  let component: VoiceRoom;
  let fixture: ComponentFixture<VoiceRoom>;
  let mockConnectionStatus: ReturnType<typeof signal<VoiceConnectionStatus>>;
  let mockCurrentChannelId: ReturnType<typeof signal<string | null>>;
  let mockVoiceRoomService: {
    connectionStatus: ReturnType<typeof signal<VoiceConnectionStatus>>;
    currentChannelId: ReturnType<typeof signal<string | null>>;
    formattedDuration: ReturnType<typeof signal<string>>;
    errorMessage: ReturnType<typeof signal<string | null>>;
    allParticipants: ReturnType<typeof signal<VoiceParticipantModel[]>>;
    screenShareParticipant: ReturnType<typeof signal<VoiceParticipantModel | undefined>>;
    isMicMuted: ReturnType<typeof signal<boolean>>;
    isCameraOn: ReturnType<typeof signal<boolean>>;
    isScreenSharing: ReturnType<typeof signal<boolean>>;
    isChatDrawerOpen: ReturnType<typeof signal<boolean>>;
    toggleChatDrawer: ReturnType<typeof vi.fn>;
    openChatDrawer: ReturnType<typeof vi.fn>;
    closeChatDrawer: ReturnType<typeof vi.fn>;
    joinRoom: ReturnType<typeof vi.fn>;
    leaveRoom: ReturnType<typeof vi.fn>;
    openPrejoin: ReturnType<typeof vi.fn>;
    closePrejoin: ReturnType<typeof vi.fn>;
  };
  let mockDialog: { open: ReturnType<typeof vi.fn> };
  let mockShellData: { servers: ReturnType<typeof signal<Array<{ id: string; name: string }>>> };

  const mockChannel: ChannelSummary = {
    id: 'chn-voice-1',
    name: 'Kênh thoại 1',
    type: 'voice',
    topic: null,
    unread: false,
    mentionCount: 0,
  };

  beforeEach(async () => {
    mockConnectionStatus = signal<VoiceConnectionStatus>('idle');
    mockCurrentChannelId = signal<string | null>(null);

    const isChatDrawerOpen = signal(false);
    mockVoiceRoomService = {
      connectionStatus: mockConnectionStatus,
      currentChannelId: mockCurrentChannelId,
      formattedDuration: signal('00:00'),
      errorMessage: signal(null),
      allParticipants: signal([]),
      screenShareParticipant: signal(undefined),
      isMicMuted: signal(false),
      isCameraOn: signal(false),
      isScreenSharing: signal(false),
      isChatDrawerOpen,
      toggleChatDrawer: vi.fn(() => isChatDrawerOpen.update((v) => !v)),
      openChatDrawer: vi.fn(() => isChatDrawerOpen.set(true)),
      closeChatDrawer: vi.fn(() => isChatDrawerOpen.set(false)),
      joinRoom: vi.fn(),
      leaveRoom: vi.fn(),
      openPrejoin: vi.fn(),
      closePrejoin: vi.fn(),
    };

    mockDialog = { open: vi.fn() };
    mockShellData = { servers: signal([{ id: 'srv-1', name: 'Test Server' }]) };

    await TestBed.configureTestingModule({
      imports: [VoiceRoom],
      providers: [
        { provide: VoiceRoomService, useValue: mockVoiceRoomService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: ShellData, useValue: mockShellData },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParams: {} },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VoiceRoom);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('channel', mockChannel);
    fixture.componentRef.setInput('serverId', 'srv-1');
    fixture.detectChanges();
  });

  it('phải được tạo thành công và hiển thị Unjoined Empty State ban đầu', () => {
    expect(component).toBeDefined();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Kênh thoại 1');
    expect(el.textContent).toContain('Tham Gia Thoại');
    expect(el.textContent).toContain('Xem thiết bị');
  });

  it('bật/tắt chat drawer khi gọi toggleChat', () => {
    expect(component.isChatOpen()).toBe(false);
    component['toggleChat']();
    expect(component.isChatOpen()).toBe(true);
    component['toggleChat']();
    expect(component.isChatOpen()).toBe(false);
  });

  it('gọi joinRoom khi bấm Tham Gia Thoại', () => {
    const joinBtn = fixture.nativeElement.querySelector('button[mat-flat-button]');
    joinBtn?.click();
    expect(mockVoiceRoomService.joinRoom).toHaveBeenCalledWith('srv-1', 'chn-voice-1', 'Kênh thoại 1', undefined);
  });

  it('gọi openPrejoin khi bấm Xem thiết bị', () => {
    const previewBtn = fixture.nativeElement.querySelector('button[mat-stroked-button]');
    previewBtn?.click();
    expect(mockVoiceRoomService.openPrejoin).toHaveBeenCalledWith('srv-1', 'chn-voice-1', 'Kênh thoại 1');
  });
});
