import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { firstTextChannel, MOCK_SERVER_LIST } from '../mock/chat-mock';

/**
 * Dải máy chủ ngoài cùng bên trái — chỗ chuyển giữa tin nhắn riêng và các máy chủ.
 *
 * Huy hiệu chỉ có chữ cái đầu trên nền màu, không có ảnh: máy chủ chưa có backend
 * nên chưa có icon thật, và chữ cái vẫn phân biệt được ba máy chủ với nhau.
 */
@Component({
  selector: 'app-server-rail',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // shrink-0: dải này rộng cố định, không được co lại khi khung chat cần chỗ.
  host: { class: 'flex shrink-0' },
  template: `
    <nav
      aria-label="Máy chủ"
      class="flex h-full w-18 shrink-0 flex-col items-center gap-2 overflow-y-auto border-r border-hairline bg-canvas-soft py-3"
    >
      <!-- Tin nhắn riêng -->
      <a
        routerLink="/channels/@me"
        routerLinkActive="rounded-md! bg-primary! text-on-primary!"
        #dmActive="routerLinkActive"
        [attr.aria-current]="dmActive.isActive ? 'page' : null"
        title="Tin nhắn riêng"
        class="flex size-12 items-center justify-center rounded-full bg-canvas text-body-md-strong text-ink transition-all hover:rounded-md"
      >
        <span aria-hidden="true">N</span>
        <span class="sr-only">Tin nhắn riêng</span>
      </a>

      <span aria-hidden="true" class="my-1 h-px w-8 bg-hairline"></span>

      @for (server of servers; track server.id) {
        <a
          [routerLink]="linkFor(server.id)"
          routerLinkActive="rounded-md!"
          #serverActive="routerLinkActive"
          [attr.aria-current]="serverActive.isActive ? 'page' : null"
          [title]="server.name"
          class="relative flex size-12 items-center justify-center rounded-full text-display-sm transition-all hover:rounded-md"
          [style.background-color]="server.color"
          [style.color]="'#101010'"
        >
          <span aria-hidden="true">{{ server.name.charAt(0) }}</span>
          <span class="sr-only">{{ server.name }}</span>

          @if (server.unread) {
            <!-- Số nằm trong span có sr-only text riêng để trình đọc màn hình
                 nói "3 tin chưa đọc" chứ không phải mỗi con số trần. -->
            <span
              class="absolute -right-1 -bottom-1 flex min-w-5 items-center justify-center rounded-pill bg-danger px-1.5 text-caption-strong text-ink-strong"
            >
              <span aria-hidden="true">{{ server.unread }}</span>
              <span class="sr-only">{{ server.unread }} tin chưa đọc</span>
            </span>
          }
        </a>
      }
    </nav>
  `,
})
export class ServerRailComponent {
  protected readonly servers = MOCK_SERVER_LIST;

  /** Bấm vào máy chủ là vào thẳng kênh văn bản đầu tiên, không dừng ở màn trống. */
  protected linkFor(serverId: string): string[] {
    const channel = firstTextChannel(serverId);
    return channel ? ['/channels', serverId, channel.id] : ['/channels', serverId];
  }
}
