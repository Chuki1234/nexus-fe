import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import {
  MessageContentToken,
  parseMessageContent,
} from '../../conversation/utils/message-content-parser';

@Component({
  selector: 'app-message-content',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './message-content.component.html',
  host: { class: 'block message-content-root' },
})
export class MessageContentComponent {
  readonly content = input<string | null | undefined>('');
  readonly messageId = input<string>('');
  readonly showSpoilers = input<'always' | 'click'>('click');
  readonly editedAt = input<string | null | undefined>(null);

  /** Set lưu trữ các spoiler đã được nhấp mở */
  private readonly revealedSpoilers = signal<Set<string>>(new Set());

  readonly tokens = computed(() => {
    const raw = this.content();
    const id = this.messageId() || 'msg';
    return parseMessageContent(raw, id);
  });

  isSpoilerRevealed(key: string): boolean {
    if (this.showSpoilers() === 'always') return true;
    return this.revealedSpoilers().has(key);
  }

  toggleSpoiler(key: string): void {
    if (this.showSpoilers() === 'always') return;
    this.revealedSpoilers.update((set) => {
      const next = new Set(set);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }
}
