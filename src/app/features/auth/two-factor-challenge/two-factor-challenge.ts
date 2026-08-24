import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/auth/auth.service';
import { toAuthErrorMessage } from '../../../core/auth/auth-error';

@Component({
  selector: 'app-two-factor-challenge',
  imports: [FormsModule, RouterLink, MatIconModule],
  templateUrl: './two-factor-challenge.html',
  styleUrl: './two-factor-challenge.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TwoFactorChallengePage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Navigation state từ login page. */
  private readonly navState = this.router.getCurrentNavigation()?.extras.state as {
    mfaChallengeId?: string;
    accessToken?: string;
    returnUrl?: string;
  } | undefined;

  protected readonly mfaChallengeId = signal<string>('');
  protected readonly accessToken = signal<string>('');
  protected readonly returnUrl = signal<string>('/');

  protected readonly code = signal<string>('');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly useBackupCode = signal(false);

  ngOnInit(): void {
    const state = this.navState ?? (history.state as typeof this.navState);
    if (!state?.mfaChallengeId || !state?.accessToken) {
      // Không có challenge — ai đó truy cập thẳng URL này
      void this.router.navigate(['/login']);
      return;
    }
    this.mfaChallengeId.set(state.mfaChallengeId);
    this.accessToken.set(state.accessToken);
    this.returnUrl.set(state.returnUrl ?? '/');
  }

  protected toggleMode(): void {
    this.useBackupCode.update((v) => !v);
    this.code.set('');
    this.errorMessage.set(null);
  }

  protected async onSubmit(): Promise<void> {
    const raw = this.code().trim();
    if (!raw || this.submitting()) return;

    // Validate: 6 chữ số TOTP hoặc 8 ký tự hex backup code
    const isTotpValid = /^[0-9]{6}$/.test(raw);
    const isBackupValid = /^[0-9a-f]{8}$/.test(raw.toLowerCase());

    if (!isTotpValid && !isBackupValid) {
      this.errorMessage.set(
        this.useBackupCode()
          ? 'Mã dự phòng gồm 8 ký tự (chữ số và a-f).'
          : 'Mã xác thực gồm 6 chữ số.',
      );
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      await this.auth.verifyMfaChallenge(
        this.accessToken(),
        this.mfaChallengeId(),
        this.useBackupCode() ? raw.toLowerCase() : raw,
      );
      await this.router.navigateByUrl(this.returnUrl());
    } catch (error) {
      this.errorMessage.set(toAuthErrorMessage(error));
      this.code.set('');
      this.focusInput();
    } finally {
      this.submitting.set(false);
    }
  }

  private focusInput(): void {
    setTimeout(() => {
      this.host.nativeElement.querySelector<HTMLInputElement>('input')?.focus();
    });
  }
}
