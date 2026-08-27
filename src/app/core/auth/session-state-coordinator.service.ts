import { effect, inject, Injectable, DestroyRef } from '@angular/core';
import { AuthService } from './auth.service';
import { FriendsStore } from '../../features/dashboard/friends/services/friends-store';
import { ChatSocketService } from '../realtime/chat-socket.service';
import { PresenceService } from '../presence/presence.service';

/**
 * SessionStateCoordinator lắng nghe trạng thái phiên đăng nhập của người dùng
 * và kết nối các luồng realtime socket vào FriendsStore.
 * Khi user đăng xuất (session = null) hoặc chuyển đổi tài khoản, tự động dọn sạch
 * toàn bộ in-memory store của FriendsStore (bảo vệ session isolation, ngăn rò rỉ dữ liệu).
 *
 * Tuyệt đối không inject FriendsStore vào AuthService để tránh Angular Circular Dependency.
 */
@Injectable({
  providedIn: 'root',
})
export class SessionStateCoordinator {
  private readonly auth = inject(AuthService);
  private readonly friendsStore = inject(FriendsStore);
  private readonly chatSocket = inject(ChatSocketService);
  private readonly presenceService = inject(PresenceService);
  private readonly destroyRef = inject(DestroyRef);
  private previousUserId: string | null = null;

  constructor() {
    effect(() => {
      const user = this.auth.user();
      const currentUserId = user?.id ?? null;

      if (!currentUserId) {
        // User đã đăng xuất
        if (this.previousUserId !== null) {
          this.friendsStore.clear();
          this.presenceService.clear();
          this.previousUserId = null;
        }
      } else if (currentUserId !== this.previousUserId) {
        // Chuyển đổi sang tài khoản khác
        if (this.previousUserId !== null) {
          this.friendsStore.clear();
          this.presenceService.clear();
        }
        this.previousUserId = currentUserId;
      }
    });

    // Kết nối sự kiện Realtime Socket với FriendsStore
    const blockCreatedSub = this.chatSocket.userBlockCreated$.subscribe((blockedUser) => {
      this.friendsStore.handleUserBlockCreated(blockedUser);
    });

    const blockRemovedSub = this.chatSocket.userBlockRemoved$.subscribe((payload) => {
      this.friendsStore.handleUserBlockRemoved(payload);
    });

    const relInvalidatedSub = this.chatSocket.relationshipInvalidated$.subscribe((payload) => {
      this.friendsStore.handleRelationshipInvalidated(payload);
    });

    this.destroyRef.onDestroy(() => {
      blockCreatedSub.unsubscribe();
      blockRemovedSub.unsubscribe();
      relInvalidatedSub.unsubscribe();
    });
  }
}
