import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { DirectServerInvitationDto } from '../../../../../../shared/dto/server-invitations.dto';

@Component({
  selector: 'app-server-invitation-item',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './server-invitation-item.html',
  styleUrl: './server-invitation-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class ServerInvitationItem {
  readonly invitation = input.required<DirectServerInvitationDto>();
  readonly busy = input(false);
  readonly accepted = output<DirectServerInvitationDto>();
  readonly dismissed = output<DirectServerInvitationDto>();

  protected readonly serverInitial = computed(() => {
    const name = this.invitation().serverName || '?';
    return name.trim().charAt(0).toUpperCase();
  });

  protected readonly inviterText = computed(() => {
    const inv = this.invitation();
    const displayName = inv.inviterDisplayName || inv.inviterUsername || 'Một người bạn';
    return inv.inviterUsername ? `${displayName} (@${inv.inviterUsername})` : displayName;
  });

  protected readonly expiresText = computed(() => {
    const expiresAt = this.invitation().expiresAt;
    if (!expiresAt) return 'Không có thời hạn';
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Đã hết hạn';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) {
      const minutes = Math.max(1, Math.floor(diff / (1000 * 60)));
      return minutes > 60 ? `Hết hạn sau ${hours} giờ` : `Hết hạn sau ${minutes} phút`;
    }
    const days = Math.floor(hours / 24);
    return `Hết hạn sau ${days} ngày`;
  });
}
