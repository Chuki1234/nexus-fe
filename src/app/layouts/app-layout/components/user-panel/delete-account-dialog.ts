import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-delete-account-dialog',
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatIconModule],
  templateUrl: './delete-account-dialog.html',
  styleUrl: './delete-account-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteAccountDialog {
  private readonly auth = inject(AuthService);
  private readonly dialogRef = inject(MatDialogRef<DeleteAccountDialog>);
  protected readonly data = inject<{ displayName: string; email: string }>(MAT_DIALOG_DATA);

  protected readonly email = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });
  protected readonly deleting = signal(false);
  protected readonly errorMessage = signal('');

  protected canDelete(): boolean {
    return this.email.value.trim().toLowerCase() === this.data.email.toLowerCase() && !this.deleting();
  }

  protected async deleteAccount(): Promise<void> {
    if (!this.canDelete()) return;

    this.deleting.set(true);
    this.errorMessage.set('');
    try {
      await this.auth.deleteAccount(this.email.value.trim());
      this.dialogRef.close(true);
    } catch (error) {
      this.errorMessage.set(
        error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
          ? error.error.message
          : 'Không xóa được tài khoản. Vui lòng thử lại.',
      );
      this.deleting.set(false);
    }
  }
}
