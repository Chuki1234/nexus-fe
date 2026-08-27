import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { FriendListPerson } from '../../services/friends-store';
import { Avatar } from '../../../../../shared/ui/avatar/avatar';
import { EmptyState } from '../../../../../shared/ui/empty-state/empty-state';
import { PresenceService } from '../../../../../core/presence/presence.service';
import { PRESENCE_LABEL, type PresenceStatus } from '../../../../../../shared/dto/common';

@Component({
  selector: 'app-activity-panel',
  imports: [Avatar, EmptyState],
  templateUrl: './activity-panel.html',
  styleUrl: './activity-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-full' },
})
export class ActivityPanel {
  private readonly presenceService = inject(PresenceService);

  readonly people = input.required<readonly FriendListPerson[]>();

  protected readonly activePeople = computed(() =>
    this.people()
      .filter((person) => this.presenceOf(person) !== 'offline')
      .slice(0, 3),
  );

  protected presenceOf(person: FriendListPerson): PresenceStatus {
    return this.presenceService.resolvePresence(person.id);
  }

  protected subtitleOf(person: FriendListPerson): string {
    return person.statusMessage ?? PRESENCE_LABEL[this.presenceOf(person)];
  }
}
