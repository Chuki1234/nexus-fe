import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServersApiService } from '../api/servers-api.service';
import { AuthService } from '../auth/auth.service';
import { ChatSocketService } from '../realtime/chat-socket.service';
import { ServerRealtimeCoordinator } from './server-realtime-coordinator.service';
import { ServersStore } from './servers.store';

describe('ServerRealtimeCoordinator', () => {
  let coordinator: ServerRealtimeCoordinator;
  let serversStore: ServersStore;
  let router: Router;
  let snackBar: MatSnackBar;

  let channelsInvalidatedSubject: Subject<{ serverId: string }>;
  let serverDeletedSubject: Subject<{ serverId: string }>;
  let serverMemberLeftSubject: Subject<{ serverId: string; userId: string }>;
  let presenceSyncSubject: Subject<any>;

  let mockChatSocket: any;
  let mockServersApi: any;
  let mockAuth: any;
  let mockSnackBar: any;

  beforeEach(() => {
    channelsInvalidatedSubject = new Subject();
    serverDeletedSubject = new Subject();
    serverMemberLeftSubject = new Subject();
    presenceSyncSubject = new Subject();

    mockChatSocket = {
      channelsInvalidated$: channelsInvalidatedSubject,
      serverDeleted$: serverDeletedSubject,
      serverMemberLeft$: serverMemberLeftSubject,
      presenceSync$: presenceSyncSubject,
      joinServer: vi.fn().mockResolvedValue(undefined),
      leaveServer: vi.fn().mockResolvedValue(undefined),
    };

    mockServersApi = {
      listChannels: vi.fn().mockResolvedValue([
        { id: 'chan-text-1', name: 'chung', type: 'text' },
        { id: 'chan-voice-1', name: 'thoại', type: 'voice' },
      ]),
    };

    mockAuth = {
      user: vi.fn().mockReturnValue({ id: 'user-me' }),
    };

    mockSnackBar = {
      open: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ServerRealtimeCoordinator,
        ServersStore,
        { provide: ChatSocketService, useValue: mockChatSocket },
        { provide: ServersApiService, useValue: mockServersApi },
        { provide: AuthService, useValue: mockAuth },
        { provide: MatSnackBar, useValue: mockSnackBar },
      ],
    });

    coordinator = TestBed.inject(ServerRealtimeCoordinator);
    serversStore = TestBed.inject(ServersStore);
    router = TestBed.inject(Router);
    snackBar = TestBed.inject(MatSnackBar);
  });

  it('xử lý server:deleted khi user đang ở trong server đó: xóa khỏi store, gửi snackbar và chuyển về /channels/@me', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    serversStore.activeServerId.set('srv-1');
    serversStore.serverList.set([
      { id: 'srv-1', name: 'Server 1', iconUrl: null, unread: false, mentionCount: 0 },
    ]);

    serverDeletedSubject.next({ serverId: 'srv-1' });

    expect(mockChatSocket.leaveServer).toHaveBeenCalledWith('srv-1');
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      expect.stringContaining('đã bị xóa'),
      'Đóng',
      expect.any(Object),
    );
    expect(navigateSpy).toHaveBeenCalledWith(['/channels/@me']);
  });

  it('xử lý server:member-left khi chính user bị kick/rời khỏi: gửi snackbar và chuyển về /channels/@me', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    serversStore.activeServerId.set('srv-1');
    serversStore.serverList.set([
      { id: 'srv-1', name: 'Server 1', iconUrl: null, unread: false, mentionCount: 0 },
    ]);

    serverMemberLeftSubject.next({ serverId: 'srv-1', userId: 'user-me' });

    expect(mockChatSocket.leaveServer).toHaveBeenCalledWith('srv-1');
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      expect.stringContaining('không còn là thành viên'),
      'Đóng',
      expect.any(Object),
    );
    expect(navigateSpy).toHaveBeenCalledWith(['/channels/@me']);
  });

  it('xử lý channelsInvalidated$ khi kênh đang xem bị xóa: tự động chuyển hướng về kênh hợp lệ đầu tiên', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    serversStore.activeServerId.set('srv-1');
    serversStore.activeChannelId.set('chan-old-deleted');

    channelsInvalidatedSubject.next({ serverId: 'srv-1' });

    // Chờ async listChannels
    await new Promise((r) => setTimeout(r, 10));

    expect(mockServersApi.listChannels).toHaveBeenCalledWith('srv-1');
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      expect.stringContaining('Kênh bạn đang xem đã bị xóa'),
      'Đóng',
      expect.any(Object),
    );
    expect(navigateSpy).toHaveBeenCalledWith(['/channels', 'srv-1', 'chan-text-1']);
  });
});
