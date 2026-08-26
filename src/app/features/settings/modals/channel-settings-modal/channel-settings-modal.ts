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

export type ChannelSettingsTab = 'overview' | 'permissions' | 'invites' | 'integrations';

@Component({
  selector: 'app-channel-settings-modal',
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './channel-settings-modal.html',
  styleUrl: './channel-settings-modal.css',
  host: {
    class: 'block size-full',
  },
})
export class ChannelSettingsModal {
  readonly data: ChannelSettingsModalData = inject(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<ChannelSettingsModal>);
  private readonly serversApi = inject(ServersApiService, { optional: true });
  private readonly serversStore = inject(ServersStore, { optional: true });

  readonly activeTab = signal<ChannelSettingsTab>('overview');

  // Form State
  readonly channelName = signal<string>(this.data.channel.name);
  readonly channelTopic = signal<string>(this.data.channel.topic || '');
  readonly slowmode = signal<number>(0);
  readonly contentVisibility = signal<'default' | 'hidden' | 'age_restricted'>('default');
  readonly hideAfterInactivity = signal<string>('3days');
  readonly isSaving = signal<boolean>(false);
  readonly isDeleting = signal<boolean>(false);
  readonly saveNotice = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly isDirty = computed(() => {
    return (
      this.channelName() !== this.data.channel.name ||
      this.channelTopic() !== (this.data.channel.topic || '') ||
      this.slowmode() !== 0 ||
      this.contentVisibility() !== 'default' ||
      this.hideAfterInactivity() !== '3days'
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
    this.slowmode.set(0);
    this.contentVisibility.set('default');
    this.hideAfterInactivity.set('3days');
    this.errorMessage.set(null);
  }

  async saveChanges(): Promise<void> {
    const rawName = this.channelName().trim().toLowerCase().replace(/\s+/g, '-');
    if (!rawName || rawName.length < 2) {
      this.errorMessage.set('Tên kênh phải có ít nhất 2 ký tự.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    this.saveNotice.set('Đã lưu thay đổi cài đặt kênh!');
    setTimeout(() => {
      this.saveNotice.set(null);
    }, 2500);

    try {
      if (this.serversApi && this.serversStore) {
        const updated = await this.serversApi.updateChannel(this.data.serverId, this.data.channel.id, {
          name: rawName,
          topic: this.channelTopic().trim() || undefined,
        });

        this.serversStore.updateChannel(this.data.serverId, {
          id: this.data.channel.id,
          name: updated.name,
          type: (updated.type as any) || this.data.channel.type,
          topic: updated.topic || null,
          unread: false,
          mentionCount: 0,
        });
      }
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
