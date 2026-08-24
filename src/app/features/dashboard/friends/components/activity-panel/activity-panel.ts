import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { FriendListPerson } from '../../services/friends-store';
import { Avatar } from '../../../../../shared/ui/avatar/avatar';
import { EmptyState } from '../../../../../shared/ui/empty-state/empty-state';

@Component({
  selector: 'app-activity-panel',
  imports: [Avatar, EmptyState],
  templateUrl: './activity-panel.html',
  styleUrl: './activity-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-full' },
})
export class ActivityPanel {
  readonly people = input.required<readonly FriendListPerson[]>();

  protected readonly activePeople = computed(() => this.people().slice(0, 3));
}
