import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ShellData, ConversationSummary, ServerInviteCardData } from '../../core/api/shell-data';
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
  private readonly shell = inject(ShellData);
  private readonly userSettings = inject(UserSettingsService);

  readonly serverId = input.required<string>();
  readonly close = output<void>();

  protected readonly searchQuery = signal<string>('');
  protected readonly invitedFriendIds = signal<Set<string>>(new Set());
  protected readonly isCopied = signal<boolean>(false);

  protected readonly serverData = computed(() => {
    const sId = this.serverId();
    return this.userSettings.serverDataMap()[sId] ?? this.userSettings.serverDataMap()['itss'];
  });

  protected readonly defaultChannel = computed(() => {
    const sId = this.serverId();
    const channels = this.shell.channelsOf(sId);
    return channels.find((c) => c.type === 'text') ?? channels[0] ?? { id: 'do-an', name: 'đồ-án' };
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
    const list = this.shell.conversations().filter((c) => c.id !== 'lofi-bot');
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

    // 1. Send invite card to DM conversation (Ảnh 4)
    this.shell.sendDirectMessage(
      friend.id,
      `https://nexus.app/invite/${this.activeInviteCode()}`,
      inviteCard,
    );

    // 2. Add dynamic audit log record (Ảnh 5)
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
