import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { formatApiError, ServersApiService } from '../../../../../../core/api/servers-api.service';
import { ChannelSummary } from '../../../../../../core/servers/server.models';
import { ServersStore } from '../../../../../../core/servers/servers.store';
import { ServerCapabilitiesService } from '../../../../../../core/servers/server-capabilities.service';
import { ServerChannelStructureSyncService } from '../../../../../../core/servers/server-channel-structure-sync.service';

export interface CreateChannelDialogData {
  serverId: string;
  serverName?: string;
  defaultType?: 'text' | 'voice';
  categoryId?: string;
  categoryName?: string;
}

function formatChannelNameInput(raw: string, _type: 'text' | 'voice'): string {
  return raw;
}

@Component({
  selector: 'app-create-channel-dialog',
  imports: [FormsModule, MatButtonModule, MatDialogModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './create-channel-dialog.html',
  styleUrl: './create-channel-dialog.css',
})
export class CreateChannelDialog {
  readonly dialogRef = inject(MatDialogRef<CreateChannelDialog, ChannelSummary | null>);
  readonly data = inject<CreateChannelDialogData>(MAT_DIALOG_DATA);
  private readonly serversApi = inject(ServersApiService);
  private readonly serversStore = inject(ServersStore, { optional: true });
  private readonly capabilitiesService = inject(ServerCapabilitiesService);
  private readonly structureSync = inject(ServerChannelStructureSyncService);

  protected readonly rawChannelName = signal('');
  protected readonly channelType = signal<'text' | 'voice'>(this.data.defaultType ?? 'text');
  protected readonly channelTopic = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly formattedChannelName = computed(() => {
    return formatChannelNameInput(this.rawChannelName(), this.channelType());
  });

  protected readonly isNameValid = computed(() => {
    const name = this.formattedChannelName();
    return name.length >= 1 && name.length <= 100;
  });

  protected selectType(type: 'text' | 'voice'): void {
    this.channelType.set(type);
    this.errorMessage.set(null);
  }

  protected onNameInput(value: string): void {
    this.rawChannelName.set(value);
    this.errorMessage.set(null);
  }

  protected async onSubmit(): Promise<void> {
    const name = this.formattedChannelName();
    if (!name || name.length > 100 || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    try {
      const createdChannel = await this.serversApi.createChannel(
        this.data.serverId,
        name,
        this.channelType(),
        this.channelTopic().trim() || undefined,
      );

      const channelWithCategory: ChannelSummary = {
        ...createdChannel,
        categoryId: this.data.categoryId ?? null,
      };

      // Cập nhật live state trong ServersStore
      this.serversStore?.addChannel(this.data.serverId, channelWithCategory);
      if (this.serversStore) {
        void this.structureSync.save(this.data.serverId).catch(() => undefined);
      }

      this.dialogRef.close(channelWithCategory);
    } catch (err: any) {
      const formatted = formatApiError(err);
      this.errorMessage.set(formatted);

      if (err?.status === 403 || formatted.includes('không có quyền')) {
        this.capabilitiesService.refresh(this.data.serverId).catch(() => {});
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
