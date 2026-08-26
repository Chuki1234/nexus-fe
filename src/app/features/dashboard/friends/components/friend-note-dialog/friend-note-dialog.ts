import {
  ChangeDetectionStrategy,
  Component,
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

export interface FriendNoteDialogData {
  friendId: string;
  friendName: string;
  initialNote: string;
}

@Component({
  selector: 'app-friend-note-dialog',
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './friend-note-dialog.html',
  styleUrl: './friend-note-dialog.css',
})
export class FriendNoteDialog {
  readonly dialogRef = inject(MatDialogRef<FriendNoteDialog, string | null>);
  readonly data = inject<FriendNoteDialogData>(MAT_DIALOG_DATA);

  readonly noteText = signal(this.data.initialNote || '');

  onSave(): void {
    this.dialogRef.close(this.noteText().trim());
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
