import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { SessionStateCoordinator } from './session-state-coordinator.service';
import { AuthService } from './auth.service';
import { FriendsStore } from '../../features/dashboard/friends/services/friends-store';
import { ChatSocketService } from '../realtime/chat-socket.service';

describe('SessionStateCoordinator', () => {
  let coordinator: SessionStateCoordinator;
  let userSignal: ReturnType<typeof signal<{ id: string; email: string } | null>>;
  let friendsStore: {
    clear: ReturnType<typeof vi.fn>;
    handleUserBlockCreated: ReturnType<typeof vi.fn>;
    handleUserBlockRemoved: ReturnType<typeof vi.fn>;
    handleRelationshipInvalidated: ReturnType<typeof vi.fn>;
  };
  let userBlockCreated$: Subject<any>;
  let userBlockRemoved$: Subject<any>;
  let relationshipInvalidated$: Subject<any>;

  beforeEach(() => {
    userSignal = signal<{ id: string; email: string } | null>({
      id: 'user-1',
      email: 'user1@example.com',
    });

    friendsStore = {
      clear: vi.fn(),
      handleUserBlockCreated: vi.fn(),
      handleUserBlockRemoved: vi.fn(),
      handleRelationshipInvalidated: vi.fn(),
    };

    userBlockCreated$ = new Subject();
    userBlockRemoved$ = new Subject();
    relationshipInvalidated$ = new Subject();

    TestBed.configureTestingModule({
      providers: [
        SessionStateCoordinator,
        {
          provide: AuthService,
          useValue: { user: userSignal },
        },
        {
          provide: FriendsStore,
          useValue: friendsStore,
        },
        {
          provide: ChatSocketService,
          useValue: {
            userBlockCreated$: userBlockCreated$.asObservable(),
            userBlockRemoved$: userBlockRemoved$.asObservable(),
            relationshipInvalidated$: relationshipInvalidated$.asObservable(),
          },
        },
      ],
    });

    coordinator = TestBed.inject(SessionStateCoordinator);
  });

  it('dọn sạch FriendsStore khi user đăng xuất', () => {
    TestBed.flushEffects();
    expect(friendsStore.clear).not.toHaveBeenCalled();

    // User logout
    userSignal.set(null);
    TestBed.flushEffects();

    expect(friendsStore.clear).toHaveBeenCalledTimes(1);
  });

  it('dọn sạch FriendsStore khi chuyển sang tài khoản khác', () => {
    TestBed.flushEffects();

    // Switch account
    userSignal.set({ id: 'user-2', email: 'user2@example.com' });
    TestBed.flushEffects();

    expect(friendsStore.clear).toHaveBeenCalledTimes(1);
  });

  it('chuyển tiếp realtime socket events sang FriendsStore', () => {
    const blockedDto = {
      id: 'target-1',
      username: 'target_1',
      displayName: 'Target 1',
      avatarUrl: null,
      blockedAt: '2026-08-22T00:00:00.000Z',
    };

    userBlockCreated$.next(blockedDto);
    expect(friendsStore.handleUserBlockCreated).toHaveBeenCalledWith(blockedDto);

    userBlockRemoved$.next({ userId: 'target-1' });
    expect(friendsStore.handleUserBlockRemoved).toHaveBeenCalledWith({
      userId: 'target-1',
    });

    relationshipInvalidated$.next({ userId: 'target-2' });
    expect(friendsStore.handleRelationshipInvalidated).toHaveBeenCalledWith({
      userId: 'target-2',
    });
  });
});
