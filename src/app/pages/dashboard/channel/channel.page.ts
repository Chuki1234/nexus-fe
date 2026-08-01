import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ChatToolbar } from '../components/chat-toolbar/chat-toolbar';
import { MessageComposer } from '../components/message-composer/message-composer';
import { ShellData } from '../../../core/api/shell-data';
import { EmptyState } from '../../../ui/empty-state/empty-state';
import { SectionLabel } from '../../../ui/section-label/section-label';

/** Kênh trong server — `/channels/:serverId/:channelId`. */
@Component({
  selector: 'app-channel-page',
  imports: [ChatToolbar, EmptyState, MessageComposer, SectionLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-h-0 flex-col' },
  templateUrl: './channel.page.html',
  styleUrl: './channel.page.css',
})
export class ChannelPage {
  private readonly route = inject(ActivatedRoute);
  private readonly shell = inject(ShellData);

  protected readonly detailsOpen = signal(true);

  private readonly params = toSignal(
    this.route.paramMap.pipe(
      map((params) => ({
        serverId: params.get('serverId'),
        channelId: params.get('channelId'),
      })),
    ),
    { initialValue: { serverId: null, channelId: null } },
  );

  protected readonly channel = computed(() => {
    const { serverId, channelId } = this.params();
    return serverId && channelId ? this.shell.channelOf(serverId, channelId) : undefined;
  });
}
