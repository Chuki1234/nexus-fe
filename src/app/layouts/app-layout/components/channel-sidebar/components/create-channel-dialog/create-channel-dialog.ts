import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  formatApiError,
  ServersApiService,
} from '../../../../../../core/api/servers-api.service';
import { ChannelSummary, ShellData } from '../../../../../../core/api/shell-data';


export interface CreateChannelDialogData {
  serverId: string;
  serverName?: string;
  defaultType?: 'text' | 'voice';
}

@Component({
  selector: 'app-create-channel-dialog',
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './create-channel-dialog.html',
  styleUrl: './create-channel-dialog.css',
})
export class CreateChannelDialog {
  readonly dialogRef = inject(MatDialogRef<CreateChannelDialog, ChannelSummary | null>);
  readonly data = inject<CreateChannelDialogData>(MAT_DIALOG_DATA);
  private readonly serversApi = inject(ServersApiService);
  private readonly shellData = inject(ShellData);

  protected readonly channelType = signal<'text' | 'voice'>(
    this.data.defaultType ?? 'text',
  );
  protected readonly rawChannelName = signal('');
  protected readonly channelTopic = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly formattedChannelName = computed(() => {
    const raw = this.rawChannelName();
    if (this.channelType() === 'text') {
      return raw
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-_àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, '');
    }
    return raw.trim();
  });

  protected readonly isNameValid = computed(() => {
    const name = this.formattedChannelName();
    return name.length >= 1 && name.length <= 100;
  });

  protected selectType(type: 'text' | 'voice'): void {
    this.channelType.set(type);
    this.errorMessage.set(null);
  }

  protected updateName(value: string): void {
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

      // Cập nhật live state trong ShellData để sidebar hiển thị ngay
      this.shellData.addChannel(this.data.serverId, createdChannel);

      this.dialogRef.close(createdChannel);
    } catch (err) {
      this.errorMessage.set(formatApiError(err));
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
