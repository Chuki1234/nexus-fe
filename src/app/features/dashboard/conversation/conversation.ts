import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { ChatToolbar } from '../components/chat-toolbar/chat-toolbar';
import {
  MessageComposer,
  type MessageComposerContext,
} from '../components/message-composer/message-composer';
import { MessageActions } from '../components/message-actions/message-actions';
import { ContextPanel } from '../components/context-panel/context-panel';
import { ProfileAvatar } from '../../profile/components/profile-avatar/profile-avatar';
import { ProfilePanel } from '../../profile/components/profile-panel/profile-panel';
import { ProfileStore } from '../../profile/profile-store';
import { DashboardState } from '../components/dashboard-state/dashboard-state';
import { DashboardUiState } from '../services/dashboard-ui-state';
import { ShellData } from '../../../core/api/shell-data';
import { Avatar } from '../../../shared/ui/avatar/avatar';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';

/** Tin nhắn riêng — `/channels/@me/:conversationId`. */
@Component({
  selector: 'app-conversation-page',
  imports: [
    Avatar,
    ChatToolbar,
    ContextPanel,
    DashboardState,
    EmptyState,
    MatIconModule,
    MessageActions,
    MessageComposer,
    ProfileAvatar,
    ProfilePanel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-h-0 flex-col' },
  templateUrl: './conversation.html',
  styleUrl: './conversation.css',
})
export class ConversationPage {
  private readonly route = inject(ActivatedRoute);
  private readonly shell = inject(ShellData);
  private readonly uiState = inject(DashboardUiState);
  protected readonly demoEnabled = this.shell.demoEnabled;
  protected readonly composerContext = signal<MessageComposerContext | null>(null);
  /** Cột hồ sơ bên phải. Mở sẵn vì đây là thứ người dùng muốn thấy khi vào DM. */
  protected readonly profilePanelOpen = signal(true);

  private readonly profileStore = inject(ProfileStore);
  protected readonly myAvatarUrl = computed(() => this.profileStore.profile()?.avatarUrl ?? null);
  protected readonly blockingState = this.uiState.blockingState;
  protected readonly connectionState = this.uiState.connectionState;

  private readonly conversationId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('conversationId'))),
    { initialValue: null },
  );

  protected readonly conversation = computed(() => {
    const id = this.conversationId();
    return id ? this.shell.conversationOf(id) : undefined;
  });

  constructor() {
    void this.profileStore.ensureLoaded();
  }

  protected toggleProfilePanel(): void {
    this.profilePanelOpen.update((open) => !open);
  }

  protected clearUiState(): void {
    void this.uiState.clearPreview();
  }
}
