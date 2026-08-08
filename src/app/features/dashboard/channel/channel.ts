import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { ChatToolbar } from '../components/chat-toolbar/chat-toolbar';
import { ContextPanel } from '../components/context-panel/context-panel';
import {
  MessageComposer,
  type MessageComposerContext,
} from '../components/message-composer/message-composer';
import { MessageActions } from '../components/message-actions/message-actions';
import { DashboardState } from '../components/dashboard-state/dashboard-state';
import { DashboardUiState } from '../services/dashboard-ui-state';
import { ShellData } from '../../../core/api/shell-data';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { Avatar } from '../../../shared/ui/avatar/avatar';

/** Kênh trong server — `/channels/:serverId/:channelId`. */
@Component({
  selector: 'app-channel-page',
  imports: [
    Avatar,
    ChatToolbar,
    ContextPanel,
    DashboardState,
    EmptyState,
    MatIconModule,
    MessageActions,
    MessageComposer,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-h-0 flex-col' },
  templateUrl: './channel.html',
  styleUrl: './channel.css',
})
export class ChannelPage {
  private readonly route = inject(ActivatedRoute);
  private readonly shell = inject(ShellData);
  private readonly uiState = inject(DashboardUiState);

  protected readonly detailsOpen = signal(false);
  protected readonly composerContext = signal<MessageComposerContext | null>(null);
  protected readonly demoEnabled = this.shell.demoEnabled;
  protected readonly blockingState = this.uiState.blockingState;
  protected readonly connectionState = this.uiState.connectionState;

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

  protected clearUiState(): void {
    void this.uiState.clearPreview();
  }
}
