import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/auth/auth.service';
import { extractErrorMessage } from '../../../../core/utils/error.util';
import { ToastService } from '../../../../core/toast/toast.service';

@Component({
  selector: 'app-add-account-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
  ],
  templateUrl: './add-account-modal.html',
  styleUrl: './add-account-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddAccountModal {
  readonly dialogRef = inject(MatDialogRef<AddAccountModal>);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly identifier = signal('');
  protected readonly password = signal('');
  protected readonly mfaCode = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  // 2FA step state
  protected readonly mfaRequiredState = signal<{
    accessToken: string;
    challengeId: string;
  } | null>(null);

  protected async onSubmit(): Promise<void> {
    const id = this.identifier().trim();
    const pwd = this.password();

    if (!id || !pwd || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    try {
      if (this.mfaRequiredState()) {
        const mfa = this.mfaRequiredState()!;
        const code = this.mfaCode().trim();
        if (!code) {
          this.errorMessage.set('Vui lòng nhập mã xác thực 2FA.');
          this.isSubmitting.set(false);
          return;
        }
        await this.auth.verifyMfaChallenge(mfa.accessToken, mfa.challengeId, code);
        this.toast.show({ message: 'Thêm tài khoản thành công!', type: 'success' });
        this.dialogRef.close(true);
        window.location.reload();
        return;
      }

      const res = await this.auth.signIn({ identifier: id, password: pwd });

      if ('requiresMfa' in res && res.requiresMfa) {
        this.mfaRequiredState.set({
          accessToken: res.accessToken,
          challengeId: res.mfaChallengeId,
        });
        this.toast.show({ message: 'Tài khoản yêu cầu xác thực 2FA. Vui lòng nhập mã TOTP.', type: 'info' });
        this.isSubmitting.set(false);
        return;
      }

      this.toast.show({ message: 'Đã thêm tài khoản và đăng nhập thành công!', type: 'success' });
      this.dialogRef.close(true);
      window.location.reload();
    } catch (err: any) {
      const msg = extractErrorMessage(err, 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
      this.errorMessage.set(msg);
      this.toast.show({ message: msg, type: 'error' });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected async onGoogleSignIn(): Promise<void> {
    try {
      await this.auth.signInWithGoogle(window.location.origin);
    } catch (err: any) {
      this.toast.show({ message: extractErrorMessage(err, 'Đăng nhập Google thất bại.'), type: 'error' });
    }
  }

  protected close(): void {
    this.dialogRef.close(false);
  }
}
