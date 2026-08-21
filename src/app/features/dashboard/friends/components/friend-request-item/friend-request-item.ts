import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { ConversationSummary } from '../../../../../core/api/shell-data';
import { ProfileAvatar } from '../../../../../features/profile/components/profile-avatar/profile-avatar';

@Component({
  selector: 'app-friend-request-item',
  imports: [ProfileAvatar, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './friend-request-item.html',
  styleUrl: './friend-request-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class FriendRequestItem {
  readonly person = input.required<ConversationSummary>();
  readonly accepted = output<string>();
  readonly dismissed = output<string>();
}
