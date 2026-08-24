import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { formatApiError, ServersApiService } from '../../../../../../core/api/servers-api.service';
import { ServerCapabilitiesService } from '../../../../../../core/servers/server-capabilities.service';
import { ServersStore } from '../../../../../../core/servers/servers.store';

export interface DeleteServerDialogData {
  serverId: string;
  serverName: string;
}

@Component({
  selector: 'app-delete-server-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './delete-server-dialog.html',
  styleUrl: './delete-server-dialog.css',
  host: {
    class: 'block',
    '(keydown.escape)': 'onCancel()',
  },
})
export class DeleteServerDialog {
  private readonly dialogRef = inject(MatDialogRef<DeleteServerDialog>);
  private readonly data = inject<DeleteServerDialogData>(MAT_DIALOG_DATA);
  private readonly serversApi = inject(ServersApiService);
  private readonly serversStore = inject(ServersStore);
  private readonly capabilities = inject(ServerCapabilitiesService);

  readonly serverId = this.data.serverId;
  readonly serverName = this.data.serverName;

  readonly confirmControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  private readonly confirmText = toSignal(this.confirmControl.valueChanges, {
    initialValue: '',
  });

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  /** Nút xóa chỉ kích hoạt khi nhập đúng 100% tên máy chủ */
  readonly isNameMatched = computed(
    () => (this.confirmText() ?? '').trim() === this.serverName.trim(),
  );

  onCancel(): void {
    if (!this.isSubmitting()) {
      this.dialogRef.close(false);
    }
  }

  async onConfirmDelete(): Promise<void> {
    if (this.confirmControl.value.trim() !== this.serverName.trim() || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    try {
      await this.serversApi.deleteServer(this.serverId);
      this.serversStore.removeServer(this.serverId);
      this.capabilities.clear();
      this.dialogRef.close(true);
    } catch (err: unknown) {
      this.errorMessage.set(formatApiError(err));
      this.isSubmitting.set(false);
    }
  }
}
