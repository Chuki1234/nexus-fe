import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ChatToolbar } from '../../../layout/chat-toolbar/chat-toolbar';
import { MessageComposer } from '../../../layout/message-composer/message-composer';
import { ShellData } from '../../../layout/shell-data';
import { EmptyState } from '../../../ui/empty-state/empty-state';
import { SectionLabel } from '../../../ui/section-label/section-label';

/** Kênh trong server — `/channels/:serverId/:channelId`. */
@Component({
  selector: 'app-channel-page',
  imports: [ChatToolbar, EmptyState, MessageComposer, SectionLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-h-0 flex-col' },
  template: `
    @if (channel(); as current) {
      <app-chat-toolbar
        [title]="current.name"
        [subtitle]="current.topic"
        [leadingIcon]="current.type === 'voice' ? 'volume_up' : 'tag'"
        [detailsOpen]="detailsOpen()"
        (toggleDetails)="detailsOpen.set(!detailsOpen())"
      />

      <div class="flex min-h-0 flex-1">
        <div class="flex min-w-0 flex-1 flex-col">
          @if (current.type === 'voice') {
            <!-- Kênh thoại: phần nghe/nói thật thuộc phase C2. -->
            <app-empty-state
              icon="volume_up"
              [title]="current.name"
              message="Chưa có ai trong kênh thoại này."
            />
          } @else {
            <!-- P3 sẽ thay khối này bằng danh sách tin nhắn thật. -->
            <div class="flex flex-1 flex-col justify-end overflow-y-auto px-4 py-6">
              <h2 class="text-display-md text-ink-strong">Chào mừng tới #{{ current.name }}</h2>
              <p class="mt-2 max-w-prose text-body-md text-body">
                Đây là phần mở đầu của kênh này.
              </p>
            </div>

            <app-message-composer [target]="'#' + current.name" />
          }
        </div>

        @if (detailsOpen()) {
          <aside
            class="hidden w-60 shrink-0 border-l border-hairline bg-canvas-soft p-4 xl:block"
            aria-label="Thành viên"
          >
            <app-section-label text="Thành viên" />
            <p class="mt-2 px-2 text-body-sm text-mute">Danh sách thành viên sẽ có ở phase sau.</p>
          </aside>
        }
      </div>
    } @else {
      <app-empty-state icon="search_off" message="Không tìm thấy kênh này." />
    }
  `,
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
