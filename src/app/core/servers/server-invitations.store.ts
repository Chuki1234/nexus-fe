import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DirectServerInvitationDto } from '../../../shared/dto/server-invitations.dto';
import { ServersApiService } from '../api/servers-api.service';
import { ChatSocketService } from '../realtime/chat-socket.service';
import { ToastService } from '../toast/toast.service';
import { ServerCapabilitiesService } from './server-capabilities.service';
import { ServersStore } from './servers.store';

/**
 * Store quản lý tập trung danh sách lời mời trực tiếp tham gia máy chủ (Direct Server Invitations).
 * Sử dụng Angular Signals, đồng bộ qua REST API và Socket.IO realtime events.
 */
@Injectable({ providedIn: 'root' })
export class ServerInvitationsStore {
  private readonly serversApi = inject(ServersApiService);
  private readonly serversStore = inject(ServersStore);
  private readonly capabilitiesService = inject(ServerCapabilitiesService);
  private readonly chatSocketService = inject(ChatSocketService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  /** Danh sách các lời mời đang ở trạng thái pending và còn hạn */
  readonly pendingInvitations = signal<DirectServerInvitationDto[]>([]);

  /** Số lượng lời mời đang chờ xử lý */
  readonly pendingCount = computed(() => this.pendingInvitations().length);

  /** Trạng thái nạp dữ liệu */
  readonly isLoading = signal<boolean>(false);

  /** Lỗi nạp dữ liệu */
  readonly error = signal<string | null>(null);

  constructor() {
    // Lắng nghe sự kiện nhận lời mời trực tiếp mới từ socket
    this.chatSocketService?.invitationReceived$?.subscribe((payload) => {
      if (payload?.invitation) {
        this.addInvitation(payload.invitation);
        const inviter =
          payload.invitation.inviterDisplayName ||
          payload.invitation.inviterUsername ||
          'Một người bạn';
        this.toastService.show({
          message: `${inviter} đã mời bạn vào máy chủ "${payload.invitation.serverName}"`,
          action: 'Xem lời mời',
          onAction: () => {
            void this.router.navigate(['/channels/@me/server-invitations']);
          },
          type: 'info',
        });
      }
    });

    // Lắng nghe sự kiện cập nhật trạng thái lời mời (accepted, declined, revoked, expired)
    this.chatSocketService?.invitationUpdated$?.subscribe((payload) => {
      if (payload?.invitationId) {
        this.removeInvitation(payload.invitationId);
      }
    });
  }

  /**
   * Nạp danh sách lời mời trực tiếp từ Backend REST API.
   * Reconcile và lọc bỏ các lời mời đã hết hạn.
   */
  async hydrateInvitations(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const list = await this.serversApi.listPendingInvitations();
      const now = Date.now();
      const validList = (list || []).filter((inv) => {
        if (!inv.expiresAt) return true;
        return new Date(inv.expiresAt).getTime() > now;
      });

      this.pendingInvitations.set(validList);
    } catch (err: any) {
      console.warn('Lỗi nạp danh sách lời mời trực tiếp:', err);
      this.error.set(err?.message || 'Không thể nạp danh sách lời mời.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Chấp nhận lời mời trực tiếp qua REST:
   * 1. Gọi API accept.
   * 2. Gọi API canonical lấy danh sách servers/channels thật (`listMyServers`).
   * 3. Upsert server vào `ServersStore`.
   * 4. Refresh capabilities và join socket server room.
   * 5. Xóa card khỏi `pendingInvitations`.
   */
  async acceptInvitation(
    invitationId: string,
  ): Promise<{ success: boolean; serverId: string; alreadyMember: boolean }> {
    const res = await this.serversApi.acceptInvitation(invitationId);

    try {
      // Fetch canonical server data từ backend
      const myServers = await this.serversApi.listServers();
      const joinedServer = myServers.find((s: { id: string }) => s.id === res.serverId);

      if (joinedServer) {
        this.serversStore.upsertServerWithChannels(
          {
            id: joinedServer.id,
            name: joinedServer.name,
            iconUrl: joinedServer.iconUrl ?? null,
            unread: false,
            mentionCount: 0,
          },
          joinedServer.channels ?? [],
        );
      }

      await this.capabilitiesService.refresh(res.serverId);
      await this.chatSocketService.joinServer(res.serverId);
    } catch (fetchErr) {
      console.warn('Không thể fetch canonical server sau khi accept:', fetchErr);
    }

    this.removeInvitation(invitationId);
    return res;
  }

  /**
   * Từ chối lời mời trực tiếp qua REST:
   * 1. Gọi API decline.
   * 2. Xóa card khỏi `pendingInvitations`.
   */
  async declineInvitation(invitationId: string): Promise<{ success: boolean }> {
    const res = await this.serversApi.declineInvitation(invitationId);
    this.removeInvitation(invitationId);
    return res;
  }

  /**
   * Thêm một lời mời vào danh sách (chống trùng lặp id).
   */
  addInvitation(invitation: DirectServerInvitationDto): void {
    this.pendingInvitations.update((current) => {
      if (current.some((inv) => inv.id === invitation.id)) {
        return current;
      }
      return [invitation, ...current];
    });
  }

  /**
   * Xóa một lời mời khỏi danh sách pending theo id.
   */
  removeInvitation(invitationId: string): void {
    this.pendingInvitations.update((current) =>
      current.filter((inv) => inv.id !== invitationId),
    );
  }

  /**
   * Reset toàn bộ trạng thái khi đăng xuất.
   */
  clear(): void {
    this.pendingInvitations.set([]);
    this.isLoading.set(false);
    this.error.set(null);
  }
}
