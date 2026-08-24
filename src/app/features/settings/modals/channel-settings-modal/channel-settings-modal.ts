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
import { ChannelSummary, ShellData } from '../../../../core/api/shell-data';

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
  private readonly shell = inject(ShellData);

  readonly activeTab = signal<ChannelSettingsTab>('overview');

  // Form State
  readonly channelName = signal<string>(this.data.channel.name);
  readonly channelTopic = signal<string>(this.data.channel.topic || '');
  readonly slowmode = signal<number>(0);
  readonly contentVisibility = signal<'default' | 'hidden' | 'age_restricted'>('default');
  readonly hideAfterInactivity = signal<string>('3days');
  readonly isSaving = signal<boolean>(false);
  readonly saveNotice = signal<string | null>(null);

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
  }

  saveChanges(): void {
    this.isSaving.set(true);
    try {
      // Cập nhật thông tin kênh vào ShellData runtime
      this.shell.updateChannel(this.data.serverId, this.data.channel.id, {
        name: this.channelName().trim() || this.data.channel.name,
        topic: this.channelTopic().trim() || null,
      });

      this.saveNotice.set('Đã lưu thay đổi cài đặt kênh!');
      setTimeout(() => {
        this.saveNotice.set(null);
      }, 2500);
    } finally {
      this.isSaving.set(false);
    }
  }

  deleteChannel(): void {
    if (confirm(`Bạn có chắc chắn muốn xóa kênh #${this.data.channel.name}?`)) {
      this.shell.removeChannel(this.data.serverId, this.data.channel.id);
      this.dialogRef.close({ deleted: true });
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
