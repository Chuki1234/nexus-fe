import { inject, Injectable, signal } from '@angular/core';
import type { ConversationSummary } from '../../../../core/api/shell-data';
import {
  formatFriendsApiError,
  FriendsApi,
  type FriendProfileResponse,
  type FriendRequestResponse,
  type FriendResponse,
} from './friends-api';

export interface FriendListPerson extends ConversationSummary {
  username?: string;
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
  private loaded = false;

  private readonly friendList = signal<FriendListPerson[]>([]);
  private readonly incomingList = signal<FriendRequestPerson[]>([]);
  private readonly outgoingList = signal<FriendRequestPerson[]>([]);
  private readonly loadingState = signal(false);
  private readonly sendingState = signal(false);
  private readonly busyIdsState = signal<ReadonlySet<string>>(new Set());
  private readonly errorState = signal<string | null>(null);
  private readonly feedbackState = signal<string | null>(null);

  readonly friends = this.friendList.asReadonly();
  readonly incomingRequests = this.incomingList.asReadonly();
  readonly outgoingRequests = this.outgoingList.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly sending = this.sendingState.asReadonly();
  readonly busyIds = this.busyIdsState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly feedback = this.feedbackState.asReadonly();

  async load(force = false): Promise<void> {
    if (this.loadingState() || (this.loaded && !force)) return;

    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const [friends, requests] = await Promise.all([
        this.api.listFriends(),
        this.api.listRequests(),
      ]);
      this.friendList.set(friends.map((friend) => this.toPerson(friend)));
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
      this.loaded = true;
    } catch (error) {
      this.errorState.set(formatFriendsApiError(error));
    } finally {
      this.loadingState.set(false);
    }
  }

  async sendRequest(username: string): Promise<boolean> {
    if (this.sendingState()) return false;

    this.sendingState.set(true);
    this.clearFeedback();

    try {
      const request = await this.api.sendRequest(username);
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
      this.errorState.set(formatFriendsApiError(error));
      return false;
    } finally {
      this.sendingState.set(false);
    }
  }

  async acceptRequest(userId: string): Promise<void> {
    if (this.busyIdsState().has(userId)) return;

    this.setBusy(userId, true);
    this.clearFeedback();

    try {
      const friend = await this.api.acceptRequest(userId);
      this.incomingList.update((current) =>
        current.filter((item) => item.id !== userId),
      );
      this.friendList.update((current) =>
        this.sortPeople([
          ...current.filter((item) => item.id !== userId),
          this.toPerson(friend),
        ]),
      );
      this.feedbackState.set(
        `Bạn và @${friend.username} đã trở thành bạn bè.`,
      );
    } catch (error) {
      this.errorState.set(formatFriendsApiError(error));
    } finally {
      this.setBusy(userId, false);
    }
  }

  async deleteRequest(
    userId: string,
    direction: 'incoming' | 'outgoing',
  ): Promise<void> {
    if (this.busyIdsState().has(userId)) return;

    this.setBusy(userId, true);
    this.clearFeedback();

    try {
      await this.api.deleteRequest(userId);
      const list = direction === 'incoming' ? this.incomingList : this.outgoingList;
      list.update((current) => current.filter((item) => item.id !== userId));
      this.feedbackState.set(
        direction === 'incoming'
          ? 'Đã từ chối lời mời kết bạn.'
          : 'Đã hủy lời mời kết bạn.',
      );
    } catch (error) {
      this.errorState.set(formatFriendsApiError(error));
    } finally {
      this.setBusy(userId, false);
    }
  }

  async removeFriend(userId: string): Promise<void> {
    if (this.busyIdsState().has(userId)) return;

    this.setBusy(userId, true);
    this.clearFeedback();

    try {
      await this.api.removeFriend(userId);
      this.friendList.update((current) =>
        current.filter((item) => item.id !== userId),
      );
      this.feedbackState.set('Đã xóa người dùng khỏi danh sách bạn bè.');
    } catch (error) {
      this.errorState.set(formatFriendsApiError(error));
    } finally {
      this.setBusy(userId, false);
    }
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
