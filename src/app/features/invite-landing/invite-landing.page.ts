import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { ServerInvitePreviewDto } from '../../../shared/dto/server-invitations.dto';
import { ServersApiService } from '../../core/api/servers-api.service';
import { sanitizeReturnUrl, saveReturnUrl } from '../../core/auth/auth-redirect.util';
import { AuthService } from '../../core/auth/auth.service';
import { ChatSocketService } from '../../core/realtime/chat-socket.service';
import { ServerCapabilitiesService } from '../../core/servers/server-capabilities.service';
import { ServersStore } from '../../core/servers/servers.store';
import { ToastService } from '../../core/toast/toast.service';
import { Avatar } from '../../shared/ui/avatar/avatar';

/**
 * Trang Landing xem trước và tham gia máy chủ qua liên kết mời (Invite Link Preview).
 * Hỗ trợ cả khách chưa đăng nhập (Public Stateless Preview) và thành viên đã đăng nhập.
 */
@Component({
  selector: 'app-invite-landing-page',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, Avatar],
  templateUrl: './invite-landing.page.html',
  styleUrl: './invite-landing.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviteLandingPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly serversApi = inject(ServersApiService);
  private readonly serversStore = inject(ServersStore);
  private readonly capabilities = inject(ServerCapabilitiesService);
  private readonly chatSocket = inject(ChatSocketService);
  private readonly toast = inject(ToastService);

  readonly code = signal<string>('');
  readonly preview = signal<ServerInvitePreviewDto | null>(null);
  readonly loading = signal<boolean>(true);
  readonly joining = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isNotFound = signal<boolean>(false);

  readonly isAuthenticated = computed(() => this.auth.isAuthenticated());

  readonly alreadyMember = computed(() => {
    const p = this.preview();
    if (!p || !this.isAuthenticated()) return false;
    return !!this.serversStore.getServer(p.serverId);
  });

  readonly isExpired = computed(() => this.preview()?.isExpired ?? false);
  readonly isMaxUsed = computed(() => this.preview()?.isMaxUsed ?? false);

  async ngOnInit(): Promise<void> {
    const inviteCode = this.route.snapshot.paramMap.get('code')?.trim() ?? '';
    this.code.set(inviteCode);

    if (!inviteCode) {
      this.isNotFound.set(true);
      this.loading.set(false);
      return;
    }

    await this.fetchPreview(inviteCode);
  }

  async fetchPreview(inviteCode: string): Promise<void> {
    try {
      this.loading.set(true);
      this.errorMessage.set(null);
      this.isNotFound.set(false);

      const data = await this.serversApi.getInvitePreview(inviteCode);
      this.preview.set(data);
    } catch (err: any) {
      if (err?.status === 404) {
        this.isNotFound.set(true);
      } else {
        this.errorMessage.set(
          err?.error?.message || 'Không thể tải thông tin liên kết mời. Vui lòng thử lại.',
        );
      }
    } finally {
      this.loading.set(false);
    }
  }

  onLoginToJoin(): void {
    const returnUrl = sanitizeReturnUrl(`/invite/${this.code()}`);
    saveReturnUrl(returnUrl);
    void this.router.navigate(['/login'], { queryParams: { returnUrl } });
  }

  async onJoinServer(): Promise<void> {
    if (this.joining()) return;

    try {
      this.joining.set(true);
      this.errorMessage.set(null);

      const res = await this.serversApi.joinByInviteCode(this.code());

      // Fetch canonical server & channels data từ REST API
      const myServers = await this.serversApi.listServers();
      const server = myServers.find((s: { id: string }) => s.id === res.serverId);

      if (server) {
        this.serversStore.upsertServerWithChannels(
          {
            id: server.id,
            name: server.name,
            iconUrl: server.iconUrl ?? null,
            unread: false,
            mentionCount: 0,
          },
          server.channels ?? [],
        );
      }

      await this.capabilities.refresh(res.serverId);
      await this.chatSocket.joinServer(res.serverId);

      this.toast.show({
        message: `Chào mừng bạn gia nhập máy chủ "${this.preview()?.serverName || server?.name || 'máy chủ'}"!`,
        type: 'success',
      });

      const targetChannelId =
        res.channelId ||
        server?.channels?.[0]?.id ||
        '';

      if (targetChannelId) {
        await this.router.navigate(['/channels', res.serverId, targetChannelId]);
      } else {
        await this.router.navigate(['/channels', res.serverId]);
      }
    } catch (err: any) {
      this.errorMessage.set(
        err?.error?.message || 'Không thể tham gia máy chủ. Vui lòng thử lại.',
      );
    } finally {
      this.joining.set(false);
    }
  }

  onOpenServer(): void {
    const p = this.preview();
    if (!p) return;

    const channels = this.serversStore.getChannels(p.serverId);
    const targetChannelId = p.channelId || channels?.[0]?.id || '';

    if (targetChannelId) {
      void this.router.navigate(['/channels', p.serverId, targetChannelId]);
    } else {
      void this.router.navigate(['/channels', p.serverId]);
    }
  }

  onGoHome(): void {
    void this.router.navigate(['/channels/@me']);
  }
}
