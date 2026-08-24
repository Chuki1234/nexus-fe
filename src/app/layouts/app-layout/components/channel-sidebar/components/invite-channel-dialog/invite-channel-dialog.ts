import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  formatApiError,
  ServersApiService,
} from '../../../../../../core/api/servers-api.service';
import {
  ServerInviteCandidateDto,
  ServerInviteLinkResponseDto,
} from '../../../../../../../shared/dto/server-invitations.dto';
import { Avatar } from '../../../../../../shared/ui/avatar/avatar';

export interface InviteChannelDialogData {
  serverName: string;
  channelName?: string;
  channelId?: string;
  serverId?: string;
}

export type InviteActionState = 'idle' | 'sending' | 'sent' | 'error';

@Component({
  selector: 'app-invite-channel-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    Avatar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './invite-channel-dialog.html',
  styleUrl: './invite-channel-dialog.css',
})
export class InviteChannelDialog implements OnInit {
  readonly data: InviteChannelDialogData = inject(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<InviteChannelDialog>);
  private readonly serversApi = inject(ServersApiService);

  readonly searchQuery = signal<string>('');
  readonly isLoadingFriends = signal<boolean>(true);
  readonly friends = signal<ServerInviteCandidateDto[]>([]);
  readonly inviteStateMap = signal<Map<string, InviteActionState>>(new Map());

  readonly isLoadingLink = signal<boolean>(true);
  readonly inviteLinkData = signal<ServerInviteLinkResponseDto | null>(null);
  readonly copied = signal<boolean>(false);
  readonly globalError = signal<string | null>(null);

  readonly inviteLink = computed(() => {
    const data = this.inviteLinkData();
    if (data?.inviteUrl) {
      return data.inviteUrl;
    }
    if (data?.code) {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://nexuscord.app';
      return `${origin}/invite/${data.code}`;
    }
    return 'Đang tạo liên kết mời...';
  });

  readonly filteredFriends = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.friends();
    return this.friends().filter(
      (f) =>
        f.displayName.toLowerCase().includes(q) ||
        f.username.toLowerCase().includes(q),
    );
  });

  async ngOnInit(): Promise<void> {
    const serverId = this.data.serverId;
    if (!serverId) {
      this.isLoadingFriends.set(false);
      this.isLoadingLink.set(false);
      return;
    }

    // 1. Tải danh sách bạn bè chưa vào server
    this.loadFriends(serverId);

    // 2. Tạo hoặc lấy liên kết mời 128-bit thật từ backend
    this.loadInviteLink(serverId);
  }

  private async loadFriends(serverId: string): Promise<void> {
    try {
      this.isLoadingFriends.set(true);
      const candidates = await this.serversApi.getInviteCandidates(serverId);
      this.friends.set(candidates);
    } catch (err) {
      console.warn('Không thể lấy danh sách ứng viên mời:', err);
    } finally {
      this.isLoadingFriends.set(false);
    }
  }

  private async loadInviteLink(serverId: string): Promise<void> {
    try {
      this.isLoadingLink.set(true);
      const link = await this.serversApi.createInviteLink(serverId, {
        channelId: this.data.channelId,
      });
      this.inviteLinkData.set(link);
    } catch (err) {
      console.warn('Không thể tạo liên kết mời:', err);
    } finally {
      this.isLoadingLink.set(false);
    }
  }

  async inviteFriend(userId: string): Promise<void> {
    const serverId = this.data.serverId;
    if (!serverId) return;

    this.inviteStateMap.update((map) => {
      const next = new Map(map);
      next.set(userId, 'sending');
      return next;
    });

    try {
      await this.serversApi.createDirectInvitation(serverId, userId);

      this.inviteStateMap.update((map) => {
        const next = new Map(map);
        next.set(userId, 'sent');
        return next;
      });
    } catch (err: any) {
      if (err?.status === 409) {
        // Lời mời đang ở trạng thái chờ (duplicate pending) -> hiển thị 'Đã gửi'
        this.inviteStateMap.update((map) => {
          const next = new Map(map);
          next.set(userId, 'sent');
          return next;
        });
      } else {
        this.globalError.set(formatApiError(err));
        this.inviteStateMap.update((map) => {
          const next = new Map(map);
          next.set(userId, 'error');
          return next;
        });
      }
    }
  }

  getFriendState(userId: string): InviteActionState {
    return this.inviteStateMap().get(userId) ?? 'idle';
  }

  async copyLink(): Promise<void> {
    try {
      const link = this.inviteLink();
      if (typeof navigator !== 'undefined' && navigator.clipboard && link) {
        await navigator.clipboard.writeText(link);
      }
      this.copied.set(true);
      setTimeout(() => {
        this.copied.set(false);
      }, 3000);
    } catch (err) {
      console.warn('Không thể sao chép liên kết:', err);
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
