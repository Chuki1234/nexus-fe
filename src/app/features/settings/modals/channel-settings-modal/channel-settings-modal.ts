import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ServersApiService } from '../../../../core/api/servers-api.service';
import { ChannelSummary } from '../../../../core/servers/server.models';
import { ServersStore } from '../../../../core/servers/servers.store';
import { extractErrorMessage } from '../../../../core/utils/error.util';

export interface ChannelSettingsModalData {
  channel: ChannelSummary;
  serverId: string;
}

export type ChannelSettingsTab = 'overview' | 'invites';

@Component({
  selector: 'app-channel-settings-modal',
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './channel-settings-modal.html',
  styleUrl: './channel-settings-modal.css',
  host: {
    class: 'block',
  },
})
export class ChannelSettingsModal {
  readonly data: ChannelSettingsModalData = inject(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<ChannelSettingsModal>);
  private readonly serversApi = inject(ServersApiService, { optional: true });
  private readonly serversStore = inject(ServersStore, { optional: true });

  readonly activeTab = signal<ChannelSettingsTab>('overview');

  readonly currentChannel = computed(() => {
    const fromStore = this.serversStore?.channelsOf(this.data.serverId).find((c) => c.id === this.data.channel.id);
    return fromStore || this.data.channel;
  });

  readonly isVoiceChannel = computed(() => {
    return (this.currentChannel().type || this.data.channel.type) === 'voice';
  });

  // Form State
  readonly channelName = signal<string>(this.data.channel.name);
  readonly channelTopic = signal<string>(this.data.channel.topic || '');
  readonly slowmode = signal<number>(this.data.channel.slowmode ?? this.currentChannel().slowmode ?? 0);
  readonly contentVisibility = signal<'default' | 'age_restricted'>(
    (this.data.channel.contentVisibility || this.currentChannel().contentVisibility) === 'age_restricted' ||
    this.data.channel.isAgeRestricted ||
    this.currentChannel().isAgeRestricted
      ? 'age_restricted'
      : 'default',
  );
  readonly isSaving = signal<boolean>(false);
  readonly isDeleting = signal<boolean>(false);
  readonly saveNotice = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  // Invites State (Hạn 7 ngày)
  readonly activeInvite = signal<{ code: string; expiresDays: number; uses: number } | null>({
    code: this.data.channel.id,
    expiresDays: 7,
    uses: 0,
  });
  readonly copiedInvite = signal<boolean>(false);

  revokeInvite(): void {
    this.activeInvite.set(null);
    this.saveNotice.set('Đã thu hồi liên kết lời mời thành công!');
    setTimeout(() => {
      this.saveNotice.set(null);
    }, 2500);
  }

  createInvite(): void {
    this.activeInvite.set({
      code: this.data.channel.id,
      expiresDays: 7,
      uses: 0,
    });
    this.saveNotice.set('Đã tạo liên kết lời mời mới (hạn 7 ngày)!');
    setTimeout(() => {
      this.saveNotice.set(null);
    }, 2500);
  }

  async copyInvite(): Promise<void> {
    const inv = this.activeInvite();
    if (!inv) return;
    const url = `https://nexus.gg/c/${inv.code}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      this.copiedInvite.set(true);
      setTimeout(() => this.copiedInvite.set(false), 2000);
    } catch {
      this.copiedInvite.set(true);
      setTimeout(() => this.copiedInvite.set(false), 2000);
    }
  }

  readonly isDirty = computed(() => {
    const initialSlowmode = this.data.channel.slowmode ?? this.currentChannel().slowmode ?? 0;
    const initialVisibility =
      (this.data.channel.contentVisibility || this.currentChannel().contentVisibility) === 'age_restricted' ||
      this.data.channel.isAgeRestricted ||
      this.currentChannel().isAgeRestricted
        ? 'age_restricted'
        : 'default';

    return (
      this.channelName() !== this.data.channel.name ||
      this.channelTopic() !== (this.data.channel.topic || '') ||
      this.slowmode() !== initialSlowmode ||
      this.contentVisibility() !== initialVisibility
    );
  });

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.close();
  }

  setTab(tab: ChannelSettingsTab): void {
    this.activeTab.set(tab);
  }

  resetChanges(): void {
    this.channelName.set(this.data.channel.name);
    this.channelTopic.set(this.data.channel.topic || '');
    this.slowmode.set(this.data.channel.slowmode ?? this.currentChannel().slowmode ?? 0);
    this.contentVisibility.set(
      (this.data.channel.contentVisibility || this.currentChannel().contentVisibility) === 'age_restricted' ||
      this.data.channel.isAgeRestricted ||
      this.currentChannel().isAgeRestricted
        ? 'age_restricted'
        : 'default',
    );
    this.errorMessage.set(null);
  }

  async saveChanges(): Promise<void> {
    const rawName = this.channelName().trim();
    if (!rawName) {
      this.errorMessage.set('Tên kênh không được để trống.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const isAgeRestricted = this.contentVisibility() === 'age_restricted';
    const slowmode = Number(this.slowmode()) || 0;
    const contentVisibility = this.contentVisibility();

    try {
      let updated: Partial<ChannelSummary> | null = null;
      if (this.serversApi) {
        updated = await this.serversApi.updateChannel(this.data.serverId, this.data.channel.id, {
          name: rawName,
          topic: this.channelTopic().trim() || undefined,
          slowmode,
          isAgeRestricted,
          contentVisibility,
        });
      }

      this.data.channel.name = updated?.name || rawName;
      this.data.channel.topic = (updated?.topic !== undefined ? updated.topic : this.channelTopic().trim()) || null;
      this.data.channel.slowmode = slowmode;
      this.data.channel.isAgeRestricted = isAgeRestricted;
      this.data.channel.contentVisibility = contentVisibility;

      if (this.serversStore) {
        this.serversStore.updateChannel(this.data.serverId, {
          ...this.data.channel,
          id: this.data.channel.id,
          name: this.data.channel.name,
          type: (updated?.type as any) || this.data.channel.type,
          topic: this.data.channel.topic,
          slowmode,
          isAgeRestricted,
          contentVisibility,
          unread: false,
          mentionCount: 0,
        });
      }

      this.saveNotice.set('Đã lưu thay đổi cài đặt kênh!');
      setTimeout(() => {
        this.saveNotice.set(null);
      }, 2500);
    } catch (err: any) {
      if (err?.status === 409) {
        this.saveNotice.set(null);
        this.errorMessage.set('Tên kênh đã tồn tại trong máy chủ này.');
      } else {
        this.saveNotice.set(null);
        this.errorMessage.set(extractErrorMessage(err, 'Lỗi lưu thay đổi kênh.'));
      }
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteChannel(): Promise<void> {
    const serverChannels = this.serversStore?.channelsOf(this.data.serverId) || [];
    const textChannels = serverChannels.filter((c) => c.type === 'text' || !c.type);

    if (textChannels.length <= 1 && (this.data.channel.type === 'text' || !this.data.channel.type) && serverChannels.length > 0) {
      alert('Không thể xóa kênh chữ cuối cùng trong máy chủ.');
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn xóa kênh #${this.data.channel.name}? Thao tác này không thể hoàn tác.`)) {
      return;
    }

    this.isDeleting.set(true);
    this.serversStore?.removeChannel(this.data.serverId, this.data.channel.id);

    try {
      if (this.serversApi) {
        await this.serversApi.deleteChannel(this.data.serverId, this.data.channel.id);
      }
      this.dialogRef.close({ deleted: true, channelId: this.data.channel.id });
    } catch (err: any) {
      alert(extractErrorMessage(err, 'Không thể xóa kênh.'));
    } finally {
      this.isDeleting.set(false);
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
