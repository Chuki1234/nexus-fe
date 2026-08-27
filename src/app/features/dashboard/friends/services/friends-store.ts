import { inject, Injectable, signal } from '@angular/core';
import type { ConversationSummary } from '../../../../core/conversations/conversation.models';
import type { BlockedUserDto } from '../../../../../shared';
import { ChatSocketService } from '../../../../core/realtime/chat-socket.service';
import {
  formatFriendsApiError,
  FriendsApi,
  type FriendProfileResponse,
  type FriendRequestResponse,
  type FriendResponse,
} from './friends-api';

export interface FriendListPerson extends ConversationSummary {
  // `username` kế thừa từ ConversationSummary — trước đây khai lại ở đây thành
  // `string | undefined`, giờ dùng chung một kiểu `string | null` cho cả hai.
  avatarUrl?: string | null;
}

export interface FriendRequestPerson extends FriendListPerson {
  requestedAt: string;
  direction: 'incoming' | 'outgoing';
}

@Injectable({
  providedIn: 'root',
})
export class FriendsStore {
  private readonly api = inject(FriendsApi);
  private readonly chatSocket = inject(ChatSocketService, { optional: true });
  private loaded = false;

  constructor() {
    // Realtime: có lời mời kết bạn mới ⇒ nạp lại để badge "chờ duyệt" cập nhật
    // ngay mà không cần mở lại trang bạn bè.
    this.chatSocket?.notificationNew$?.subscribe((notification) => {
      if (notification.type === 'friend_request') {
        void this.load(true);
      }
    });
  }

  private readonly friendList = signal<FriendListPerson[]>([]);
  private readonly incomingList = signal<FriendRequestPerson[]>([]);
  private readonly outgoingList = signal<FriendRequestPerson[]>([]);
  private readonly blockedList = signal<BlockedUserDto[]>([]);
  private readonly loadingState = signal(false);
  private readonly loadingBlockedState = signal(false);
  private readonly sendingState = signal(false);
  private readonly busyIdsState = signal<ReadonlySet<string>>(new Set());
  private readonly errorState = signal<string | null>(null);
  private readonly feedbackState = signal<string | null>(null);
  private readonly blockedHydrated = signal(false);
  private readonly sessionGeneration = signal(0);
  private readonly invalidatedRelationshipIdsState = signal<ReadonlySet<string>>(new Set());

  readonly friends = this.friendList.asReadonly();
  readonly incomingRequests = this.incomingList.asReadonly();
  readonly outgoingRequests = this.outgoingList.asReadonly();
  readonly blocked = this.blockedList.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly loadingBlocked = this.loadingBlockedState.asReadonly();
  readonly sending = this.sendingState.asReadonly();
  readonly busyIds = this.busyIdsState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly feedback = this.feedbackState.asReadonly();
  readonly invalidatedRelationshipIds = this.invalidatedRelationshipIdsState.asReadonly();

  isRelationshipInvalidated(userId: string): boolean {
    return this.invalidatedRelationshipIdsState().has(userId);
  }

  isBlocked(userId: string): boolean {
    return this.blockedList().some((item) => item.id === userId);
  }

  async load(force = false): Promise<void> {
    if (this.loadingState() || (this.loaded && !force)) return;

    const currentGen = this.sessionGeneration();
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const [friends, requests] = await Promise.all([
        this.api.listFriends(),
        this.api.listRequests(),
      ]);
      if (this.sessionGeneration() !== currentGen) return;

      const friendPersons = friends.map((friend) => this.toPerson(friend));
      this.friendList.set(friendPersons);
      this.incomingList.set(
        requests.incoming.map((request) =>
          this.toRequestPerson(request, 'incoming'),
        ),
      );
      this.outgoingList.set(
        requests.outgoing.map((request) =>
          this.toRequestPerson(request, 'outgoing'),
        ),
      );

      // Xóa các ID đã là bạn khỏi invalidatedRelationshipIds
      const friendIds = new Set(friendPersons.map((f) => f.id));
      this.invalidatedRelationshipIdsState.update((current) => {
        if (current.size === 0) return current;
        const next = new Set(Array.from(current).filter((id) => !friendIds.has(id)));
        return next.size === current.size ? current : next;
      });

      this.loaded = true;
    } catch (error) {
      if (this.sessionGeneration() === currentGen) {
        this.errorState.set(formatFriendsApiError(error));
      }
    } finally {
      if (this.sessionGeneration() === currentGen) {
        this.loadingState.set(false);
      }
    }
  }

  async sendRequest(username: string): Promise<boolean> {
    if (this.sendingState()) return false;

    const currentGen = this.sessionGeneration();
    this.sendingState.set(true);
    this.clearFeedback();

    try {
      const request = await this.api.sendRequest(username);
      if (this.sessionGeneration() !== currentGen) return false;

      const person = this.toRequestPerson(request, 'outgoing');
      this.outgoingList.update((current) => [
        ...current.filter((item) => item.id !== person.id),
        person,
      ]);
      this.feedbackState.set(
        `Đã gửi lời mời kết bạn tới @${request.username}.`,
      );
      return true;
    } catch (error) {
      if (this.sessionGeneration() === currentGen) {
        this.errorState.set(formatFriendsApiError(error));
      }
      return false;
    } finally {
      if (this.sessionGeneration() === currentGen) {
        this.sendingState.set(false);
      }
    }
  }

  async acceptRequest(userId: string): Promise<void> {
    if (this.busyIdsState().has(userId)) return;

    const currentGen = this.sessionGeneration();
    this.setBusy(userId, true);
    this.clearFeedback();

    try {
      const friend = await this.api.acceptRequest(userId);
      if (this.sessionGeneration() !== currentGen) return;

      this.incomingList.update((current) =>
        current.filter((item) => item.id !== userId),
      );
      this.friendList.update((current) =>
        this.sortPeople([
          ...current.filter((item) => item.id !== userId),
          this.toPerson(friend),
        ]),
      );
      // Xóa khỏi danh sách bị vô hiệu hóa nếu kết bạn lại thành công
      this.invalidatedRelationshipIdsState.update((current) => {
        const next = new Set(current);
        next.delete(userId);
        return next;
      });
      this.feedbackState.set(
        `Bạn và @${friend.username} đã trở thành bạn bè.`,
      );
    } catch (error) {
      if (this.sessionGeneration() === currentGen) {
        this.errorState.set(formatFriendsApiError(error));
      }
    } finally {
      if (this.sessionGeneration() === currentGen) {
        this.setBusy(userId, false);
      }
    }
  }

  async deleteRequest(
    userId: string,
    direction: 'incoming' | 'outgoing',
  ): Promise<void> {
    if (this.busyIdsState().has(userId)) return;

    const currentGen = this.sessionGeneration();
    this.setBusy(userId, true);
    this.clearFeedback();

    try {
      await this.api.deleteRequest(userId);
      if (this.sessionGeneration() !== currentGen) return;

      const list = direction === 'incoming' ? this.incomingList : this.outgoingList;
      list.update((current) => current.filter((item) => item.id !== userId));
      this.feedbackState.set(
        direction === 'incoming'
          ? 'Đã từ chối lời mời kết bạn.'
          : 'Đã hủy lời mời kết bạn.',
      );
    } catch (error) {
      if (this.sessionGeneration() === currentGen) {
        this.errorState.set(formatFriendsApiError(error));
      }
    } finally {
      if (this.sessionGeneration() === currentGen) {
        this.setBusy(userId, false);
      }
    }
  }

  async removeFriend(userId: string): Promise<void> {
    if (this.busyIdsState().has(userId)) return;

    const currentGen = this.sessionGeneration();
    this.setBusy(userId, true);
    this.clearFeedback();

    try {
      await this.api.removeFriend(userId);
      if (this.sessionGeneration() !== currentGen) return;

      this.friendList.update((current) =>
        current.filter((item) => item.id !== userId),
      );
      this.feedbackState.set('Đã xóa người dùng khỏi danh sách bạn bè.');
    } catch (error) {
      if (this.sessionGeneration() === currentGen) {
        this.errorState.set(formatFriendsApiError(error));
      }
    } finally {
      if (this.sessionGeneration() === currentGen) {
        this.setBusy(userId, false);
      }
    }
  }

  async loadBlocked(force = false): Promise<void> {
    if (this.loadingBlockedState() || (this.blockedHydrated() && !force)) return;

    const currentGen = this.sessionGeneration();
    this.loadingBlockedState.set(true);
    this.errorState.set(null);

    try {
      const blocked = await this.api.listBlocked();
      if (this.sessionGeneration() !== currentGen) {
        return; // Stale response from previous session
      }
      this.blockedList.set(blocked);
      this.blockedHydrated.set(true);
    } catch (error) {
      if (this.sessionGeneration() === currentGen) {
        this.errorState.set(formatFriendsApiError(error));
      }
    } finally {
      if (this.sessionGeneration() === currentGen) {
        this.loadingBlockedState.set(false);
      }
    }
  }

  async blockUser(userId: string): Promise<BlockedUserDto | null> {
    if (this.busyIdsState().has(userId)) return null;

    const currentGen = this.sessionGeneration();
    this.setBusy(userId, true);
    this.clearFeedback();

    // Lưu state cũ để rollback nếu API lỗi
    const previousFriend = this.friendList().find((f) => f.id === userId);
    const previousIncoming = this.incomingList().find((r) => r.id === userId);
    const previousOutgoing = this.outgoingList().find((r) => r.id === userId);

    // Optimistic Update: xóa khỏi friends/requests
    this.friendList.update((current) => current.filter((f) => f.id !== userId));
    this.incomingList.update((current) => current.filter((r) => r.id !== userId));
    this.outgoingList.update((current) => current.filter((r) => r.id !== userId));

    try {
      const blocked = await this.api.blockUser(userId);
      if (this.sessionGeneration() !== currentGen) return null;

      this.blockedList.update((current) => [
        ...current.filter((item) => item.id !== blocked.id),
        blocked,
      ]);
      const displayName = blocked.displayName || blocked.username;
      this.feedbackState.set(`Đã chặn @${displayName}.`);
      return blocked;
    } catch (error) {
      // Rollback nếu session generation vẫn khớp
      if (this.sessionGeneration() === currentGen) {
        if (previousFriend) {
          this.friendList.update((current) => this.sortPeople([...current, previousFriend]));
        }
        if (previousIncoming) {
          this.incomingList.update((current) => [...current, previousIncoming]);
        }
        if (previousOutgoing) {
          this.outgoingList.update((current) => [...current, previousOutgoing]);
        }
        this.errorState.set(formatFriendsApiError(error));
      }
      return null;
    } finally {
      if (this.sessionGeneration() === currentGen) {
        this.setBusy(userId, false);
      }
    }
  }

  async unblockUser(userId: string): Promise<boolean> {
    if (this.busyIdsState().has(userId)) return false;

    const currentGen = this.sessionGeneration();
    this.setBusy(userId, true);
    this.clearFeedback();

    const previousBlocked = this.blockedList().find((b) => b.id === userId);
    this.blockedList.update((current) => current.filter((item) => item.id !== userId));

    try {
      await this.api.unblockUser(userId);
      if (this.sessionGeneration() !== currentGen) return false;

      this.feedbackState.set('Đã bỏ chặn người dùng.');
      return true;
    } catch (error) {
      // Rollback nếu session generation vẫn khớp
      if (this.sessionGeneration() === currentGen) {
        if (previousBlocked) {
          this.blockedList.update((current) => [...current, previousBlocked]);
        }
        this.errorState.set(formatFriendsApiError(error));
      }
      return false;
    } finally {
      if (this.sessionGeneration() === currentGen) {
        this.setBusy(userId, false);
      }
    }
  }

  clear(): void {
    this.loaded = false;
    this.blockedHydrated.set(false);
    this.sessionGeneration.update((gen) => gen + 1);
    this.friendList.set([]);
    this.incomingList.set([]);
    this.outgoingList.set([]);
    this.blockedList.set([]);
    this.loadingState.set(false);
    this.loadingBlockedState.set(false);
    this.sendingState.set(false);
    this.busyIdsState.set(new Set());
    this.errorState.set(null);
    this.feedbackState.set(null);
    this.invalidatedRelationshipIdsState.set(new Set());
  }

  // ---------------------------------------------------------------------------
  // Realtime Socket Event Handlers
  // ---------------------------------------------------------------------------

  handleUserBlockCreated(blockedUser: BlockedUserDto): void {
    this.blockedList.update((current) => [
      ...current.filter((item) => item.id !== blockedUser.id),
      blockedUser,
    ]);
    this.friendList.update((current) => current.filter((item) => item.id !== blockedUser.id));
    this.incomingList.update((current) => current.filter((item) => item.id !== blockedUser.id));
    this.outgoingList.update((current) => current.filter((item) => item.id !== blockedUser.id));
  }

  handleUserBlockRemoved(payload: { userId: string }): void {
    this.blockedList.update((current) =>
      current.filter((item) => item.id !== payload.userId),
    );
  }

  handleRelationshipInvalidated(payload: { userId: string }): void {
    this.invalidatedRelationshipIdsState.update((current) => {
      const next = new Set(current);
      next.add(payload.userId);
      return next;
    });
    this.friendList.update((current) =>
      current.filter((item) => item.id !== payload.userId),
    );
    this.incomingList.update((current) =>
      current.filter((item) => item.id !== payload.userId),
    );
    this.outgoingList.update((current) =>
      current.filter((item) => item.id !== payload.userId),
    );
  }

  clearFeedback(): void {
    this.errorState.set(null);
    this.feedbackState.set(null);
  }

  private toPerson(profile: FriendResponse | FriendProfileResponse): FriendListPerson {
    return {
      id: profile.id,
      username: profile.username,
      name: profile.displayName?.trim() || profile.username,
      avatarUrl: profile.avatarUrl,
      statusMessage: profile.statusMessage,
      presence: profile.presence,
      unread: false,
    };
  }

  private toRequestPerson(
    request: FriendRequestResponse,
    direction: 'incoming' | 'outgoing',
  ): FriendRequestPerson {
    return {
      ...this.toPerson(request),
      requestedAt: request.requestedAt,
      direction,
    };
  }

  private sortPeople(people: FriendListPerson[]): FriendListPerson[] {
    return [...people].sort((first, second) =>
      first.name.localeCompare(second.name, 'vi'),
    );
  }

  private setBusy(userId: string, busy: boolean): void {
    this.busyIdsState.update((current) => {
      const next = new Set(current);
      if (busy) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return next;
    });
  }
}
