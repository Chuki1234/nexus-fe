import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Avatar } from '../../../../../shared/ui/avatar/avatar';
import type { FriendRequestPerson } from '../../services/friends-store';

@Component({
  selector: 'app-friend-request-item',
  imports: [Avatar, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './friend-request-item.html',
  styleUrl: './friend-request-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class FriendRequestItem {
  readonly person = input.required<FriendRequestPerson>();
  readonly busy = input(false);
  readonly accepted = output<string>();
  readonly dismissed = output<string>();
}
