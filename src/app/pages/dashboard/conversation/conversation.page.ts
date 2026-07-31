import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ChatToolbar } from '../../../layout/chat-toolbar/chat-toolbar';
import { MemberPanel } from '../../../layout/member-panel/member-panel';
import { MessageComposer } from '../../../layout/message-composer/message-composer';
import { ShellData } from '../../../layout/shell-data';
import { Avatar } from '../../../ui/avatar/avatar';
import { EmptyState } from '../../../ui/empty-state/empty-state';

/** Tin nhắn riêng — `/channels/@me/:conversationId`. */
@Component({
  selector: 'app-conversation-page',
  imports: [Avatar, ChatToolbar, EmptyState, MemberPanel, MessageComposer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-h-0 flex-col' },
  template: `
    @if (conversation(); as person) {
      <app-chat-toolbar
        [title]="person.name"
        [subtitle]="person.statusMessage"
        leadingIcon="alternate_email"
        [showCallActions]="true"
        [detailsOpen]="detailsOpen()"
        (toggleDetails)="detailsOpen.set(!detailsOpen())"
      />

      <div class="flex min-h-0 flex-1">
        <div class="flex min-w-0 flex-1 flex-col">
          <!-- P3 sẽ thay khối này bằng danh sách tin nhắn thật (cursor pagination). -->
          <div class="flex flex-1 flex-col justify-end overflow-y-auto px-4 py-6">
            <app-avatar [name]="person.name" [presence]="person.presence" size="xl" ring="canvas" />
            <h2 class="mt-4 text-display-md text-ink-strong">{{ person.name }}</h2>
            <p class="mt-2 max-w-prose text-body-md text-body">
              Đây là phần mở đầu lịch sử tin nhắn trực tiếp của bạn với
              <strong class="text-ink">{{ person.name }}</strong
              >.
            </p>
          </div>

          <app-message-composer [target]="'@' + person.name" />
        </div>

        @if (detailsOpen()) {
          <aside class="hidden border-l border-hairline xl:block" aria-label="Hồ sơ thành viên">
            <app-member-panel
              [name]="person.name"
              [statusMessage]="person.statusMessage"
              [presence]="person.presence"
            />
          </aside>
        }
      </div>
    } @else {
      <app-empty-state icon="search_off" message="Không tìm thấy cuộc trò chuyện này." />
    }
  `,
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
