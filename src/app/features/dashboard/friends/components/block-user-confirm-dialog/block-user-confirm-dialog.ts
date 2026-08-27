import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface BlockUserConfirmDialogData {
  userId: string;
  username: string;
  displayName: string;
}

@Component({
  selector: 'app-block-user-confirm-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './block-user-confirm-dialog.html',
  styleUrl: './block-user-confirm-dialog.css',
})
export class BlockUserConfirmDialog {
  readonly dialogRef = inject(MatDialogRef<BlockUserConfirmDialog, boolean>);
  readonly data = inject<BlockUserConfirmDialogData>(MAT_DIALOG_DATA);

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
