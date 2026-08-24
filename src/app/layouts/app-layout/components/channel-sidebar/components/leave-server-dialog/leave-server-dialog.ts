import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { formatApiError, ServersApiService } from '../../../../../../core/api/servers-api.service';
import { ServerCapabilitiesService } from '../../../../../../core/servers/server-capabilities.service';
import { ServersStore } from '../../../../../../core/servers/servers.store';

export interface LeaveServerDialogData {
  serverId: string;
  serverName: string;
}

@Component({
  selector: 'app-leave-server-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './leave-server-dialog.html',
  styleUrl: './leave-server-dialog.css',
  host: {
    class: 'block',
    '(keydown.escape)': 'onCancel()',
  },
})
export class LeaveServerDialog {
  private readonly dialogRef = inject(MatDialogRef<LeaveServerDialog>);
  private readonly data = inject<LeaveServerDialogData>(MAT_DIALOG_DATA);
  private readonly serversApi = inject(ServersApiService);
  private readonly serversStore = inject(ServersStore);
  private readonly capabilities = inject(ServerCapabilitiesService);

  readonly serverId = this.data.serverId;
  readonly serverName = this.data.serverName;

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  onCancel(): void {
    if (!this.isSubmitting()) {
      this.dialogRef.close(false);
    }
  }

  async onConfirmLeave(): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    try {
      await this.serversApi.leaveServer(this.serverId);
      this.serversStore.removeServer(this.serverId);
      this.capabilities.clear();
      this.dialogRef.close(true);
    } catch (err: unknown) {
      this.errorMessage.set(formatApiError(err));
      this.isSubmitting.set(false);
    }
  }
}
