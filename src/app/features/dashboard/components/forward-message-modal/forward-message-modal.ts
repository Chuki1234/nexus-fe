import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  OnInit,
  output,
  signal,
  computed,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  ConversationResponseDto,
  ConversationsApiService,
} from '../../../../core/api/conversations-api.service';
import {
  MessageResponseDto,
  MessagesApiService,
} from '../../../../core/api/messages-api.service';
import { ServersApiService } from '../../../../core/api/servers-api.service';
import { ServersStore } from '../../../../core/servers/servers.store';
import { FriendsStore } from '../../friends/services/friends-store';
import { extractErrorMessage } from '../../../../core/utils/error.util';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import { ChatUiMessage } from '../../services/active-chat.store';
import type { PresenceStatus } from '../../../../../shared/dto/common';
import { GiphyMessageEmbedComponent } from '../giphy-message-embed/giphy-message-embed.component';

export interface ForwardDmTarget {
  id: string;
  type: 'conversation';
  name: string;
  username?: string;
  avatarUrl?: string | null;
  presence?: PresenceStatus | null;
}

export interface ForwardChannelTarget {
  id: string;
  serverId: string;
  serverName: string;
  serverIconUrl?: string | null;
  type: 'channel';
  name: string;
  topic?: string | null;
}

export interface ForwardServerGroup {
  id: string;
  name: string;
  iconUrl?: string | null;
  channels: ForwardChannelTarget[];
}

@Component({
  selector: 'app-forward-message-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    Avatar,
    GiphyMessageEmbedComponent,
  ],
  templateUrl: './forward-message-modal.html',
  styleUrl: './forward-message-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'forward-dialog-title',
  },
})
export class ForwardMessageModal implements OnInit {
  private readonly conversationsApi = inject(ConversationsApiService);
  private readonly messagesApi = inject(MessagesApiService);
  private readonly serversApi = inject(ServersApiService);
  private readonly serversStore = inject(ServersStore);
  private readonly friendsStore = inject(FriendsStore);

  readonly message = input.required<ChatUiMessage | MessageResponseDto>();
  readonly currentConversationId = input<string | null>(null);
  readonly currentChannelId = input<string | null>(null);

  readonly close = output<void>();
  readonly forwardSuccess = output<MessageResponseDto>();

  readonly searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly dmTargets = signal<ForwardDmTarget[]>([]);
  readonly serverGroups = signal<ForwardServerGroup[]>([]);
  readonly searchQuery = signal<string>('');

  readonly sendingTargetIds = signal<Record<string, boolean>>({});
  readonly sentTargetIds = signal<Record<string, boolean>>({});

  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }

  async ngOnInit(): Promise<void> {
    await this.loadTargets();
    setTimeout(() => {
      this.searchInputRef()?.nativeElement?.focus();
    }, 50);
  }

  async loadTargets(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const dmItems: ForwardDmTarget[] = [];
      const currentConv = this.currentConversationId();

      // 1. Direct Conversations
      try {
        const convList = await this.conversationsApi.listConversations();
        for (const c of convList) {
          if (c.id === currentConv) continue;
          dmItems.push({
            id: c.id,
            type: 'conversation',
            name: c.recipient?.displayName || c.recipient?.username || c.name || 'Tin nhắn riêng',
            username: c.recipient?.username ? `@${c.recipient.username}` : undefined,
            avatarUrl: c.recipient?.avatarUrl || c.iconUrl || null,
            presence: (c.recipient?.presence as PresenceStatus) || null,
          });
        }
      } catch {}

      // 2. Friends
      try {
        const friends = this.friendsStore.friends();
        for (const f of friends) {
          const alreadyInList = dmItems.some(
            (d) => d.name === f.name || (f.username && d.username === `@${f.username}`),
          );
          if (!alreadyInList) {
            dmItems.push({
              id: `friend_${f.id}`,
              type: 'conversation',
              name: f.name,
              username: f.username ? `@${f.username}` : undefined,
              avatarUrl: f.avatarUrl || null,
              presence: (f.presence as PresenceStatus) || null,
            });
          }
        }
      } catch {}

      this.dmTargets.set(dmItems);

      // 3. Servers & Channels
      const servers = this.serversStore.servers();
      const currentChan = this.currentChannelId();
      const groups: ForwardServerGroup[] = [];

      for (const s of servers) {
        let channels = this.serversStore.channelsOf(s.id);
        if (!channels || channels.length === 0) {
          try {
            channels = await this.serversApi.listChannels(s.id);
          } catch {}
        }

        const validChannels: ForwardChannelTarget[] = (channels || [])
          .filter((ch) => ch.id !== currentChan && ch.type !== 'voice')
          .map((ch) => ({
            id: ch.id,
            serverId: s.id,
            serverName: s.name,
            serverIconUrl: s.iconUrl,
            type: 'channel',
            name: ch.name.startsWith('#') ? ch.name : `#${ch.name}`,
            topic: ch.topic,
          }));

        if (validChannels.length > 0) {
          groups.push({
            id: s.id,
            name: s.name,
            iconUrl: s.iconUrl,
            channels: validChannels,
          });
        }
      }

      this.serverGroups.set(groups);
    } catch (err: unknown) {
      this.errorMessage.set(
        extractErrorMessage(
          err,
          'Không thể tải danh sách đích chia sẻ. Vui lòng thử lại.',
        ),
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  readonly filteredDmTargets = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.dmTargets();
    if (!q) return list;
    return list.filter((t) => {
      const name = t.name.toLowerCase();
      const sub = (t.username || '').toLowerCase();
      return name.includes(q) || sub.includes(q);
    });
  });

  readonly filteredServerGroups = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const groups = this.serverGroups();
    if (!q) return groups;

    return groups
      .map((g) => {
        const sNameMatch = g.name.toLowerCase().includes(q);
        const matchingChannels = g.channels.filter(
          (ch) =>
            sNameMatch ||
            ch.name.toLowerCase().includes(q) ||
            (ch.topic && ch.topic.toLowerCase().includes(q)),
        );
        return {
          ...g,
          channels: matchingChannels,
        };
      })
      .filter((g) => g.channels.length > 0);
  });

  readonly hasAnyResults = computed(() => {
    return this.filteredDmTargets().length > 0 || this.filteredServerGroups().length > 0;
  });

  isTargetSending(targetId: string): boolean {
    return Boolean(this.sendingTargetIds()[targetId]);
  }

  isTargetSent(targetId: string): boolean {
    return Boolean(this.sentTargetIds()[targetId]);
  }

  private setTargetSending(targetId: string, value: boolean): void {
    this.sendingTargetIds.update((prev) => ({ ...prev, [targetId]: value }));
  }

  private setTargetSent(targetId: string, value: boolean): void {
    this.sentTargetIds.update((prev) => ({ ...prev, [targetId]: value }));
  }

  async sendToTarget(target: ForwardDmTarget | ForwardChannelTarget): Promise<void> {
    const srcMsg = this.message();
    const srcConvId = this.currentConversationId() || srcMsg.conversationId;
    const srcChanId = this.currentChannelId() || srcMsg.channelId;

    if (
      (!srcConvId && !srcChanId) ||
      !srcMsg.id ||
      this.isTargetSending(target.id) ||
      this.isTargetSent(target.id)
    ) {
      return;
    }

    this.setTargetSending(target.id, true);
    this.errorMessage.set(null);

    try {
      const clientNonce = crypto.randomUUID();
      let res: MessageResponseDto;

      let targetConvId: string | undefined = undefined;
      let targetChanId: string | undefined = undefined;

      if (target.type === 'channel') {
        targetChanId = target.id;
      } else {
        if (target.id.startsWith('friend_')) {
          const friendUserId = target.id.replace('friend_', '');
          const dm = await this.conversationsApi.getOrCreateDm(friendUserId);
          targetConvId = dm.id;
        } else {
          targetConvId = target.id;
        }
      }

      if (srcChanId) {
        res = await this.messagesApi.forwardChannelMessage(srcChanId, srcMsg.id, {
          targetConversationId: targetConvId,
          targetChannelId: targetChanId,
          clientNonce,
        });
      } else {
        res = await this.messagesApi.forwardMessage(srcConvId!, srcMsg.id, {
          targetConversationId: targetConvId,
          targetChannelId: targetChanId,
          clientNonce,
        });
      }

      this.setTargetSent(target.id, true);
      this.forwardSuccess.emit(res);
    } catch (err: unknown) {
      this.errorMessage.set(
        extractErrorMessage(
          err,
          'Chia sẻ tin nhắn thất bại. Vui lòng thử lại.',
        ),
      );
    } finally {
      this.setTargetSending(target.id, false);
    }
  }

  getImageAttachments(): Array<{ url: string; fileName: string }> {
    const msg = this.message();
    const atts = msg.attachments || [];
    const images: Array<{ url: string; fileName: string }> = [];

    for (const a of atts as unknown as Record<string, unknown>[]) {
      const mime = String(a['mimeType'] || '');
      const url = String(a['signedUrl'] || a['url'] || '');
      const fileName = String(a['filename'] || a['fileName'] || a['name'] || 'Ảnh');
      const isImg =
        mime.startsWith('image/') ||
        /\.(jpeg|jpg|gif|png|webp)($|\?)/i.test(url) ||
        /\.(jpeg|jpg|gif|png|webp)$/i.test(fileName);

      if (isImg && url) {
        images.push({ url, fileName });
      }
    }

    return images;
  }

  getNonImageAttachments(): Array<{ fileName: string; fileSize?: number; mimeType?: string }> {
    const msg = this.message();
    const atts = msg.attachments || [];
    const nonImages: Array<{ fileName: string; fileSize?: number; mimeType?: string }> = [];

    for (const a of atts as unknown as Record<string, unknown>[]) {
      const mime = String(a['mimeType'] || '');
      const url = String(a['signedUrl'] || a['url'] || '');
      const fileName = String(a['filename'] || a['fileName'] || a['name'] || 'Tệp đính kèm');
      const sizeBytes = typeof a['sizeBytes'] === 'number' ? a['sizeBytes'] : (typeof a['size'] === 'number' ? a['size'] : undefined);
      const isImg =
        mime.startsWith('image/') ||
        /\.(jpeg|jpg|gif|png|webp)($|\?)/i.test(url) ||
        /\.(jpeg|jpg|gif|png|webp)$/i.test(fileName);

      if (!isImg) {
        nonImages.push({ fileName, fileSize: sizeBytes, mimeType: mime });
      }
    }

    return nonImages;
  }

  formatFileSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
