import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Avatar } from '../../../../../../shared/ui/avatar/avatar';
import { ShellData } from '../../../../../../core/api/shell-data';

export interface InviteChannelDialogData {
  serverName: string;
  channelName: string;
  channelId?: string;
  serverId?: string;
}

export interface FriendInviteItem {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  invited: boolean;
}

@Component({
  selector: 'app-invite-channel-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    Avatar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './invite-channel-dialog.html',
  styleUrl: './invite-channel-dialog.css',
})
export class InviteChannelDialog {
  readonly data: InviteChannelDialogData = inject(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<InviteChannelDialog>);
  private readonly shell = inject(ShellData);

  readonly searchQuery = signal<string>('');
  readonly friends = signal<FriendInviteItem[]>(
    this.shell.conversations().map((c) => ({
      id: c.id,
      name: c.name,
      username: c.name.toLowerCase().replace(/\s+/g, '_'),
      invited: false,
    })),
  );
  readonly copied = signal<boolean>(false);

  readonly inviteCode = signal<string>('wCWvey9XP');

  readonly inviteLink = computed(
    () => `https://nexus.gg/c/${this.inviteCode()}`,
  );

  readonly filteredFriends = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.friends();
    return this.friends().filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.username.toLowerCase().includes(q),
    );
  });

  inviteFriend(id: string): void {
    this.friends.update((list) =>
      list.map((f) => (f.id === id ? { ...f, invited: true } : f)),
    );
  }

  async copyLink(): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(this.inviteLink());
      }
      this.copied.set(true);
      setTimeout(() => {
        this.copied.set(false);
      }, 3000);
    } catch (err) {
      console.warn('Không thể sao chép liên kết:', err);
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
