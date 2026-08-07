import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ChatToolbar } from '../components/chat-toolbar/chat-toolbar';
import { MemberPanel } from '../components/member-panel/member-panel';
import { MessageComposer } from '../components/message-composer/message-composer';
import { ShellData } from '../../../core/api/shell-data';
import { Avatar } from '../../../ui/avatar/avatar';
import { EmptyState } from '../../../ui/empty-state/empty-state';

/** Tin nhắn riêng — `/channels/@me/:conversationId`. */
@Component({
  selector: 'app-conversation-page',
  imports: [Avatar, ChatToolbar, EmptyState, MemberPanel, MessageComposer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-h-0 flex-col' },
  templateUrl: './conversation.page.html',
  styleUrl: './conversation.page.css',
})
export class ConversationPage {
  private readonly route = inject(ActivatedRoute);
  private readonly shell = inject(ShellData);

  protected readonly detailsOpen = signal(true);

  private readonly conversationId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('conversationId'))),
    { initialValue: null },
  );

  protected readonly conversation = computed(() => {
    const id = this.conversationId();
    return id ? this.shell.conversationOf(id) : undefined;
  });
}
