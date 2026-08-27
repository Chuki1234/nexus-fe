import { inject, Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { ServersApiService } from '../api/servers-api.service';
import { ChannelSummary } from './server.models';
import { AuthService } from '../auth/auth.service';
import { ChatSocketService } from '../realtime/chat-socket.service';
import { ServersStore } from './servers.store';

@Injectable({ providedIn: 'root' })
export class ServerRealtimeCoordinator implements OnDestroy {
  private readonly serversStore = inject(ServersStore);
  private readonly chatSocket = inject(ChatSocketService);
  private readonly serversApi = inject(ServersApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  private readonly subs = new Subscription();
  private isInitialized = false;

  constructor() {
    this.init();
  }

  init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (this.chatSocket.channelsInvalidated$) {
      this.subs.add(
        this.chatSocket.channelsInvalidated$.subscribe(async ({ serverId }) => {
          try {
            const [channels, structure] = await Promise.all([
              this.serversApi.listChannels(serverId),
              this.serversApi.getChannelStructure(serverId),
            ]);
            this.serversStore.setChannels(serverId, channels);
            this.serversStore.applyServerChannelStructure(serverId, structure);

            const activeServerId = this.serversStore.activeServerId();
            const activeChannelId = this.serversStore.activeChannelId();

            if (activeServerId === serverId && activeChannelId) {
              const hasAccess = channels.some((c: ChannelSummary) => c.id === activeChannelId);
              if (!hasAccess) {
                // Kênh bị xóa hoặc mất quyền -> thông báo và chuyển về kênh đầu tiên
                this.snackBar.open('Kênh bạn đang xem đã bị xóa hoặc thay đổi quyền.', 'Đóng', {
                  duration: 4000,
                  horizontalPosition: 'right',
                  verticalPosition: 'bottom',
                });
                const firstValidChannel =
                  channels.find((c: ChannelSummary) => c.type === 'text') || channels[0];
                if (firstValidChannel) {
                  await this.router.navigate(['/channels', serverId, firstValidChannel.id]);
                } else {
                  await this.router.navigate(['/channels', serverId]);
                }
              }
            }
          } catch {
            // Lỗi network hoặc mất quyền server
          }
        }),
      );
    }

    if (this.chatSocket.channelStructureUpdated$) {
      this.subs.add(
        this.chatSocket.channelStructureUpdated$.subscribe(({ serverId, structure }) => {
          this.serversStore.applyServerChannelStructure(serverId, structure);
        }),
      );
    }

    // 2. Lắng nghe server:updated
    if (this.chatSocket.serverUpdated$) {
      this.subs.add(
        this.chatSocket.serverUpdated$.subscribe(({ serverId, name, iconUrl }) => {
          this.serversStore.patchServer(serverId, { name, iconUrl });
        }),
      );
    }

    // 3. Lắng nghe server:deleted
    if (this.chatSocket.serverDeleted$) {
      this.subs.add(
        this.chatSocket.serverDeleted$.subscribe(async ({ serverId }) => {
          const wasActive = this.serversStore.activeServerId() === serverId;
          this.serversStore.removeServer(serverId);
          void this.chatSocket.leaveServer(serverId);
          if (wasActive) {
            this.snackBar.open('Máy chủ này đã bị xóa bởi chủ sở hữu.', 'Đóng', {
              duration: 5000,
              horizontalPosition: 'right',
              verticalPosition: 'bottom',
            });
            await this.router.navigate(['/channels/@me']);
          }
        }),
      );
    }

    // 3. Lắng nghe server:member-left
    if (this.chatSocket.serverMemberLeft$) {
      this.subs.add(
        this.chatSocket.serverMemberLeft$.subscribe(async ({ serverId, userId }) => {
          const currentUserId = this.auth.user()?.id;
          if (userId === currentUserId) {
            const wasActive = this.serversStore.activeServerId() === serverId;
            this.serversStore.removeServer(serverId);
            void this.chatSocket.leaveServer(serverId);
            if (wasActive) {
              this.snackBar.open('Bạn không còn là thành viên của máy chủ này.', 'Đóng', {
                duration: 4000,
                horizontalPosition: 'right',
                verticalPosition: 'bottom',
              });
              await this.router.navigate(['/channels/@me']);
            }
          }
        }),
      );
    }

    // 4. Lắng nghe socket connection status để auto-join server rooms
    if (this.chatSocket.presenceSync$) {
      this.subs.add(
        this.chatSocket.presenceSync$.subscribe(() => {
          this.joinAllServerRooms();
        }),
      );
    }
  }

  /**
   * Khởi tạo hydration và join server rooms khi user đăng nhập
   */
  async hydrateAndJoinAll(): Promise<void> {
    await this.serversStore.ensureHydrated(this.serversApi);
    await this.joinAllServerRooms();
  }

  /**
   * Tham gia tất cả các server rooms mà user đang là member
   */
  async joinAllServerRooms(): Promise<void> {
    const servers = this.serversStore.servers();
    for (const server of servers) {
      await this.chatSocket.joinServer(server.id);
    }
  }

  /**
   * Dọn dẹp toàn bộ khi user đăng xuất
   */
  teardownOnLogout(): void {
    const servers = this.serversStore.servers();
    for (const server of servers) {
      void this.chatSocket.leaveServer(server.id);
    }
    this.serversStore.clear();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.isInitialized = false;
  }
}
