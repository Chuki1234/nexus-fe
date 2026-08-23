import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { PRESENCE_LABEL } from '../../../../../shared/dto/common';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import type { FriendListPerson } from '../services/friends-store';
import { ConversationsApiService } from '../../../../core/api/conversations-api.service';
import { ShellData } from '../../../../core/api/shell-data';
import { PresenceService } from '../../../../core/presence/presence.service';
import type { PresenceStatus } from '../../../../../shared/dto/common';
import { extractErrorMessage } from '../../../../core/utils/error.util';

/**
 * Một hàng trong danh sách bạn bè.
 *
 * Cả hàng là một vùng bấm kích hoạt mở cuộc trò chuyện DM thật (hoặc demo khi bật demo).
 */
@Component({
  selector: 'app-friend-row',
  imports: [
    Avatar,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './friend-row.html',
  styleUrl: './friend-row.css',
})
export class FriendRow {
  private readonly router = inject(Router);
  private readonly conversationsApi = inject(ConversationsApiService);
  private readonly shell = inject(ShellData);
  private readonly presenceService = inject(PresenceService);
  private readonly destroyRef = inject(DestroyRef);

  private isDestroyed = false;

  readonly person = input.required<FriendListPerson>();
  readonly canManage = input(true);
  readonly busy = input(false);
  readonly removed = output<string>();

  readonly openingDm = signal(false);
  readonly errorMessage = signal<string | null>(null);

  protected readonly effectivePresence = computed<PresenceStatus>(() => {
    if (this.shell.demoEnabled()) {
      return this.person().presence;
    }
    const id = this.person().id;
    if (this.presenceService.hasPresence(id)) {
      return this.presenceService.getPresence(id)();
    }
    return this.person().presence || 'offline';
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.isDestroyed = true;
      this.openingDm.set(false);
    });
  }

  /** Ưu tiên câu trạng thái người dùng tự đặt; không có thì hiện trạng thái hệ thống. */
  protected readonly subtitle = computed(() => {
    const person = this.person();
    return person.statusMessage ?? PRESENCE_LABEL[this.effectivePresence()];
  });

  async onOpenDm(): Promise<void> {
    if (this.openingDm() || this.busy() || this.isDestroyed) {
      return;
    }

    if (this.shell.demoEnabled()) {
      const ok = await this.router.navigate(['/channels/@me', this.person().id]);
      if (!ok && !this.isDestroyed) {
        this.errorMessage.set('Không thể chuyển đến cuộc trò chuyện demo.');
      }
      return;
    }

    this.openingDm.set(true);
    this.errorMessage.set(null);
    try {
      const conv = await this.conversationsApi.getOrCreateDm(this.person().id);
      if (this.isDestroyed) return;
      const navigated = await this.router.navigate(['/channels/@me', conv.id]);
      if (!navigated && !this.isDestroyed) {
        this.errorMessage.set('Không thể chuyển đến cuộc trò chuyện.');
      }
    } catch (err: unknown) {
      if (!this.isDestroyed) {
        const msg = extractErrorMessage(
          err,
          'Không thể mở cuộc trò chuyện. Vui lòng thử lại.',
        );
        this.errorMessage.set(msg);
      }
    } finally {
      if (!this.isDestroyed) {
        this.openingDm.set(false);
      }
    }
  }

  clearError(): void {
    this.errorMessage.set(null);
  }
}
