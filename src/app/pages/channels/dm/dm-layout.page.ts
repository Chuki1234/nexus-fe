import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AvatarComponent } from '../../../shared/ui/avatar.component';
import { PresenceDotComponent } from '../../../shared/ui/presence-dot.component';
import { MOCK_CONVERSATIONS } from '../mock/chat-mock';
import { UserBarComponent } from '../ui/user-bar.component';

/** Cột danh sách tin nhắn riêng + vùng nội dung bên phải. */
@Component({
  selector: 'app-dm-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    AvatarComponent,
    PresenceDotComponent,
    UserBarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Component được route nằm trong DOM dưới dạng thẻ <app-dm-layout>, mà thẻ tuỳ
  // biến mặc định là display:inline. Không đặt lại thì cột danh sách và khung chat
  // rơi xuống dòng riêng thay vì đứng cạnh nhau, và `overflow-hidden` ở vỏ cắt
  // mất phần bị đẩy xuống dưới màn hình.
  host: { class: 'flex min-w-0 flex-1' },
  template: `
    <nav
      aria-label="Tin nhắn riêng"
      class="hidden h-dvh w-60 shrink-0 flex-col border-r border-hairline bg-canvas-soft md:flex"
    >
      <header class="shrink-0 border-b border-hairline px-4 py-3">
        <h2 class="text-body-md-strong text-ink-strong">Tin nhắn riêng</h2>
      </header>

      <ul class="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        @for (conversation of conversations; track conversation.id) {
          <li>
            <a
              [routerLink]="['/channels/@me', conversation.id]"
              routerLinkActive="bg-canvas"
              #active="routerLinkActive"
              [attr.aria-current]="active.isActive ? 'page' : null"
              class="flex items-center gap-2 rounded-sm px-2 py-2 hover:bg-canvas"
            >
              <span class="relative shrink-0">
                <app-avatar [src]="null" [name]="conversation.member.displayName" size="sm" />
                <app-presence-dot
                  [status]="conversation.member.status"
                  ringClass="border-canvas-soft"
                  class="absolute right-0 bottom-0"
                />
              </span>

              <span class="min-w-0 flex-1">
                <span class="block truncate text-body-sm-strong text-ink">
                  {{ conversation.member.displayName }}
                </span>
                <span class="block truncate text-caption text-mute">{{
                  conversation.preview
                }}</span>
              </span>

              @if (conversation.unread) {
                <span
                  class="flex min-w-5 shrink-0 items-center justify-center rounded-pill bg-danger px-1.5 text-caption-strong text-ink-strong"
                >
                  <span aria-hidden="true">{{ conversation.unread }}</span>
                  <span class="sr-only">{{ conversation.unread }} tin chưa đọc</span>
                </span>
              }
            </a>
          </li>
        }
      </ul>

      <app-user-bar />
    </nav>

    <router-outlet />
  `,
})
export class DmLayoutPage {
  protected readonly conversations = MOCK_CONVERSATIONS;
}
