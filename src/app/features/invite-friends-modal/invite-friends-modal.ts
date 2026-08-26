import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { type ServerInviteCardData } from '../../core/servers/server.models';
import type { ConversationSummary } from '../../core/conversations/conversation.models';
import { ServersStore } from '../../core/servers/servers.store';
import { FriendsStore } from '../dashboard/friends/services/friends-store';
import { UserSettingsService } from '../settings/services/user-settings.service';
import { Avatar } from '../../shared/ui/avatar/avatar';

@Component({
  selector: 'app-invite-friends-modal',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatTooltipModule, Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './invite-friends-modal.html',
  styleUrl: './invite-friends-modal.css',
})
export class InviteFriendsModal {
  private readonly serversStore = inject(ServersStore);
  private readonly friendsStore = inject(FriendsStore);
  private readonly userSettings = inject(UserSettingsService);

  readonly serverId = input.required<string>();
  readonly close = output<void>();

  protected readonly searchQuery = signal<string>('');
  protected readonly invitedFriendIds = signal<Set<string>>(new Set());
  protected readonly isCopied = signal<boolean>(false);

  protected readonly serverData = computed(() => {
    const sId = this.serverId();
    return this.userSettings.serverDataMap()[sId] ?? { name: 'Máy chủ', initials: 'MC', invites: [] };
  });

  protected readonly defaultChannel = computed(() => {
    const sId = this.serverId();
    const channels = this.serversStore.channelsOf(sId);
    return channels.find((c) => c.type === 'text') ?? channels[0] ?? { id: 'general', name: 'chung' };
  });

  protected readonly activeInviteCode = computed<string>(() => {
    const sData = this.serverData();
    const active = sData.invites?.find((inv) => !inv.isPaused);
    return active?.code ?? 'FZqeb9Ya3';
  });

  protected readonly inviteUrl = computed<string>(() => {
    return `https://nexus.app/invite/${this.activeInviteCode()}`;
  });

  protected readonly friendsList = computed<ConversationSummary[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.friendsStore.friends();
    if (!q) return list;
    return list.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.statusMessage && c.statusMessage.toLowerCase().includes(q)),
    );
  });

  protected isInvited(friendId: string): boolean {
    return this.invitedFriendIds().has(friendId);
  }

  protected inviteFriend(friend: ConversationSummary): void {
    if (this.isInvited(friend.id)) return;

    this.invitedFriendIds.update((set) => {
      const next = new Set(set);
      next.add(friend.id);
      return next;
    });

    const sData = this.serverData();
    const inviteCard: ServerInviteCardData = {
      serverId: this.serverId(),
      serverName: sData.name,
      serverIconUrl: sData.iconUrl ?? null,
      serverBannerColor: sData.bannerColor ?? '#1e3a2b',
      onlineCount: Math.floor((sData.members?.length ?? 5) * 0.7),
      membersCount: sData.members?.length ?? 6,
      createdDate: 'thg 1 2026',
      inviteCode: this.activeInviteCode(),
      targetChannelId: this.defaultChannel().id,
    };

    // Add dynamic audit log record
    this.userSettings.addAuditLog(
      'Gửi lời mời bạn bè vào server',
      `Mời ${friend.name} vào #${this.defaultChannel().name}`,
      'person_add',
      this.serverId(),
    );
  }

  protected copyInviteLink(): void {
    navigator.clipboard?.writeText(this.inviteUrl());
    this.isCopied.set(true);
    setTimeout(() => this.isCopied.set(false), 2500);

    this.userSettings.addAuditLog(
      'Sao chép liên kết mời máy chủ',
      this.inviteUrl(),
      'content_copy',
      this.serverId(),
    );
  }
}
