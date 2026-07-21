import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

/**
 * TẠM THỜI — chỗ giữ chỗ để `/` có đích đến sau khi đăng nhập.
 * Người phụ trách `pages/home` thay toàn bộ file này bằng trang chủ thật.
 */
@Component({
  selector: 'app-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="flex min-h-dvh items-center justify-center bg-canvas px-4 py-12">
      <div class="w-full max-w-md rounded-md border border-hairline bg-canvas p-6 text-center">
        <p class="text-eyebrow text-mute uppercase">Nexus</p>
        <h1 class="mt-2 text-display-md text-ink-strong">Bạn đã đăng nhập</h1>
        <p class="mt-2 text-body-md text-body">{{ email() ?? 'Không đọc được email' }}</p>
        <button
          type="button"
          (click)="onSignOut()"
          [disabled]="signingOut()"
          class="mt-6 w-full rounded-sm bg-primary px-4 py-3 text-button text-on-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:bg-hairline disabled:text-mute"
        >
          {{ signingOut() ? 'Đang đăng xuất…' : 'Đăng xuất' }}
        </button>
      </div>
    </main>
  `,
})
export class HomePage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly email = computed(() => this.auth.user()?.email ?? null);
  protected readonly signingOut = signal(false);

  protected async onSignOut(): Promise<void> {
    this.signingOut.set(true);
    try {
      await this.auth.signOut();
      await this.router.navigateByUrl('/login');
    } finally {
      this.signingOut.set(false);
    }
  }
}
