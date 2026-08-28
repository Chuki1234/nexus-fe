import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ProfileDialogService } from '../../../profile/profile-dialog.service';
import { PRESENCE_LABEL } from '../../../../../shared/dto/common';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import { FriendsStore, type FriendListPerson } from '../services/friends-store';
import { ConversationsApiService } from '../../../../core/api/conversations-api.service';
import { PresenceService } from '../../../../core/presence/presence.service';
import { DirectCallCoordinatorService } from '../../../../core/calls/direct-call-coordinator.service';
import { UserSettingsService } from '../../../settings/services/user-settings.service';
import { FriendNoteDialog } from './friend-note-dialog/friend-note-dialog';
import { BlockUserConfirmDialog } from './block-user-confirm-dialog/block-user-confirm-dialog';
import type { PresenceStatus } from '../../../../../shared/dto/common';
import { extractErrorMessage } from '../../../../core/utils/error.util';

/**
 * Một hàng trong danh sách bạn bè.
 *
 * Cả hàng là một vùng bấm kích hoạt mở cuộc trò chuyện DM thật.
 */
@Component({
  selector: 'app-friend-row',
  imports: [
    Avatar,
    MatButtonModule,
    MatDialogModule,
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
  private readonly profileDialog = inject(ProfileDialogService);
  private readonly conversationsApi = inject(ConversationsApiService);
  private readonly presenceService = inject(PresenceService);
  private readonly directCallCoordinator = inject(DirectCallCoordinatorService);
  private readonly userSettingsService = inject(UserSettingsService);
  private readonly friendsStore = inject(FriendsStore);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  private isDestroyed = false;

  readonly person = input.required<FriendListPerson>();
  readonly canManage = input(true);
  readonly busy = input(false);
  readonly removed = output<string>();

  readonly openingDm = signal(false);
  readonly errorMessage = signal<string | null>(null);

  protected readonly effectivePresence = computed<PresenceStatus>(() => {
    return this.presenceService.resolvePresence(this.person().id);
  });

  protected readonly isMuted = computed(() =>
    this.userSettingsService.isFriendMuted(this.person().id),
  );

  protected readonly note = computed(() =>
    this.userSettingsService.getFriendNote(this.person().id),
  );

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.isDestroyed = true;
      this.openingDm.set(false);
    });
  }

  /** Ưu tiên câu trạng thái người dùng tự đặt; không có thì hiện thời gian hoạt động cuối (nếu offline) hoặc trạng thái hệ thống. */
  protected readonly subtitle = computed(() => {
    const person = this.person();
    if (person.statusMessage) {
      return person.statusMessage;
    }
    const presence = this.effectivePresence();
    if (presence === 'offline') {
      const lastSeenText = this.presenceService.getLastSeenLabel(person.id)();
      return lastSeenText ?? PRESENCE_LABEL['offline'];
    }
    return PRESENCE_LABEL[presence];
  });

  async onOpenDm(): Promise<void> {
    if (this.openingDm() || this.busy() || this.isDestroyed) {
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

  async onStartAudioCall(): Promise<void> {
    if (this.busy() || this.isDestroyed) return;
    this.errorMessage.set(null);
    try {
      const conv = await this.conversationsApi.getOrCreateDm(this.person().id);
      if (this.isDestroyed) return;
      void this.directCallCoordinator.startCall(conv.id, 'audio');
      await this.router.navigate(['/channels/@me', conv.id]);
    } catch (err: unknown) {
      if (!this.isDestroyed) {
        this.errorMessage.set(
          extractErrorMessage(err, 'Không thể bắt đầu cuộc gọi thoại.'),
        );
      }
    }
  }

  async onStartVideoCall(): Promise<void> {
    if (this.busy() || this.isDestroyed) return;
    this.errorMessage.set(null);
    try {
      const conv = await this.conversationsApi.getOrCreateDm(this.person().id);
      if (this.isDestroyed) return;
      void this.directCallCoordinator.startCall(conv.id, 'video');
      await this.router.navigate(['/channels/@me', conv.id]);
    } catch (err: unknown) {
      if (!this.isDestroyed) {
        this.errorMessage.set(
          extractErrorMessage(err, 'Không thể bắt đầu cuộc gọi video.'),
        );
      }
    }
  }

  onToggleMute(): void {
    this.userSettingsService.toggleMuteFriend(this.person().id);
  }

  onViewProfile(): void {
    const target = this.person().username || this.person().name || this.person().id;
    if (target) {
      this.profileDialog.open(target);
    }
  }

  onEditNote(): void {
    const dialogRef = this.dialog.open(FriendNoteDialog, {
      data: {
        friendId: this.person().id,
        friendName: this.person().name,
        initialNote: this.note(),
      },
      panelClass: 'nexus-dialog-surface',
      hasBackdrop: true,
    });

    dialogRef.afterClosed().subscribe((result: string | null | undefined) => {
      if (typeof result === 'string') {
        this.userSettingsService.setFriendNote(this.person().id, result);
      }
    });
  }

  onBlockUser(): void {
    const p = this.person();
    const dialogRef = this.dialog.open(BlockUserConfirmDialog, {
      data: {
        userId: p.id,
        username: p.username || p.name,
        displayName: p.name,
      },
      panelClass: 'nexus-dialog-surface',
      hasBackdrop: true,
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (confirmed) {
        void this.friendsStore.blockUser(p.id);
      }
    });
  }

  @ViewChild('friendOptionsMenuTrigger', { read: MatMenuTrigger })
  protected friendOptionsMenuTrigger?: MatMenuTrigger;

  protected readonly contextMenuPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuPosition.set({ x: event.clientX, y: event.clientY });
    this.friendOptionsMenuTrigger?.openMenu();
  }

  clearError(): void {
    this.errorMessage.set(null);
  }
}
