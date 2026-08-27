import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import type { PresenceSyncPayload, PresenceUpdatedPayload } from '../../../shared/socket-events';
import { ChatSocketService } from '../realtime/chat-socket.service';
import { PresenceService } from './presence.service';

describe('PresenceService (Frontend Canonical Presence Store)', () => {
  let service: PresenceService;
  let mockPresenceUpdated$: Subject<PresenceUpdatedPayload>;
  let mockPresenceSync$: Subject<PresenceSyncPayload>;
  let mockChatSocketService: any;

  beforeEach(() => {
    mockPresenceUpdated$ = new Subject<PresenceUpdatedPayload>();
    mockPresenceSync$ = new Subject<PresenceSyncPayload>();

    mockChatSocketService = {
      connectionStatus: signal<'disconnected' | 'connected'>('disconnected'),
      presenceUpdated$: mockPresenceUpdated$.asObservable(),
      presenceSync$: mockPresenceSync$.asObservable(),
      getPresenceSnapshot: vi.fn().mockResolvedValue({
        presences: {
          'user-alice': { userId: 'user-alice', status: 'online', lastSeenAt: null },
          'user-bob': { userId: 'user-bob', status: 'idle', lastSeenAt: null },
        },
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        PresenceService,
        { provide: ChatSocketService, useValue: mockChatSocketService },
      ],
    });

    service = TestBed.inject(PresenceService);
  });

  it('trả về offline cho user chưa có trong store hoặc userId null/undefined', () => {
    expect(service.getPresence('user-unknown')()).toBe('offline');
    expect(service.getPresence(null)()).toBe('offline');
    expect(service.getPresence(undefined)()).toBe('offline');
    expect(service.getPresenceLabel('user-unknown')()).toBe('Ngoại tuyến');
  });

  it('cập nhật reactive signal ngay lập tức khi nhận event presenceUpdated$', () => {
    const bobPresence = service.getPresence('user-bob');
    const bobLabel = service.getPresenceLabel('user-bob');

    expect(bobPresence()).toBe('offline');
    expect(bobLabel()).toBe('Ngoại tuyến');

    // Bob online
    mockPresenceUpdated$.next({
      userId: 'user-bob',
      status: 'online',
      lastSeenAt: null,
    });

    expect(bobPresence()).toBe('online');
    expect(bobLabel()).toBe('Trực tuyến');

    // Bob chuyển dnd
    mockPresenceUpdated$.next({
      userId: 'user-bob',
      status: 'dnd',
      lastSeenAt: null,
    });

    expect(bobPresence()).toBe('dnd');
    expect(bobLabel()).toBe('Không làm phiền');

    // Bob disconnect kèm lastSeenAt (5 phút 2 giây trước)
    mockPresenceUpdated$.next({
      userId: 'user-bob',
      status: 'offline',
      lastSeenAt: new Date(Date.now() - (5 * 60 + 2) * 1000).toISOString(),
    });

    expect(bobPresence()).toBe('offline');
    expect(service.getLastSeenLabel('user-bob')()).toBe('Hoạt động 5 phút trước');
  });

  it('đồng bộ toàn bộ snapshot ban đầu khi nhận presenceSync$', () => {
    const alicePresence = service.getPresence('user-alice');
    const charliePresence = service.getPresence('user-charlie');

    mockPresenceSync$.next({
      presences: {
        'user-alice': { userId: 'user-alice', status: 'online', lastSeenAt: null },
        'user-charlie': { userId: 'user-charlie', status: 'idle', lastSeenAt: null },
      },
    });

    expect(alicePresence()).toBe('online');
    expect(charliePresence()).toBe('idle');
  });

  it('snapshot mới thay thế snapshot cũ để user biến mất trở thành offline', () => {
    service.setPresence('user-stale', 'idle');
    expect(service.resolvePresence('user-stale')).toBe('idle');

    mockPresenceSync$.next({
      presences: {
        'user-alice': { userId: 'user-alice', status: 'online', lastSeenAt: null },
      },
    });

    expect(service.resolvePresence('user-alice')).toBe('online');
    expect(service.resolvePresence('user-stale')).toBe('offline');
  });

  it('tự refresh canonical snapshot khi socket kết nối lại', async () => {
    mockChatSocketService.connectionStatus.set('connected');
    TestBed.flushEffects();
    await Promise.resolve();

    expect(mockChatSocketService.getPresenceSnapshot).toHaveBeenCalled();
  });

  it('refreshSnapshot gọi getPresenceSnapshot từ socket và cập nhật store', async () => {
    await service.refreshSnapshot();

    expect(mockChatSocketService.getPresenceSnapshot).toHaveBeenCalled();
    expect(service.getPresence('user-alice')()).toBe('online');
    expect(service.getPresence('user-bob')()).toBe('idle');
  });

  it('getPresenceDto trả về đối tượng UserPresenceDto đầy đủ', () => {
    service.setPresence('user-alice', 'online', null);
    const dto = service.getPresenceDto('user-alice')();
    expect(dto).toEqual({
      userId: 'user-alice',
      status: 'online',
      lastSeenAt: null,
    });
  });

  it('clear xóa sạch dữ liệu presence trong store khi logout', () => {
    service.setPresence('user-alice', 'online');
    expect(service.getPresence('user-alice')()).toBe('online');

    service.clear();
    expect(service.getPresence('user-alice')()).toBe('offline');
  });
});
