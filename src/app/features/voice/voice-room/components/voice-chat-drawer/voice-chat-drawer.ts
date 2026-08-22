import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { ChannelSummary } from '../../../../../core/api/shell-data';
import { ProfileService } from '../../../../../core/profile/profile.service';
import { Avatar } from '../../../../../shared/ui/avatar/avatar';

export interface VoiceChatMessage {
  id: string;
  author: string;
  authorAvatar?: string;
  content: string;
  time: string;
  isLocal?: boolean;
}

@Component({
  selector: 'app-voice-chat-drawer',
  imports: [FormsModule, Avatar, MatIconModule, MatButtonModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './voice-chat-drawer.html',
  styleUrl: './voice-chat-drawer.css',
  host: {
    class: 'flex size-full min-h-0 flex-col overflow-hidden bg-surface border-l border-hairline',
  },
})
export class VoiceChatDrawer {
  private readonly profile = inject(ProfileService);

  readonly channel = input.required<ChannelSummary>();
  readonly closed = output<void>();

  readonly messageText = signal<string>('');
  readonly messages = signal<VoiceChatMessage[]>([]);

  private readonly messageListContainer = viewChild<ElementRef<HTMLDivElement>>('messageListContainer');

  protected sendMessage(): void {
    const text = this.messageText().trim();
    if (!text) return;

    const displayName =
      this.profile.current()?.displayName ?? this.profile.current()?.username ?? 'Bạn';

    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');

    const newMsg: VoiceChatMessage = {
      id: `vm-${Date.now()}`,
      author: displayName,
      content: text,
      time: `${hours}:${minutes}`,
      isLocal: true,
    };

    this.messages.update((list) => [...list, newMsg]);
    this.messageText.set('');

    setTimeout(() => {
      const el = this.messageListContainer()?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }, 50);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
