import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Avatar } from '../../ui/avatar/avatar';
import { SearchField } from '../../ui/search-field/search-field';
import { SectionLabel } from '../../ui/section-label/section-label';
import { UnreadBadge } from '../../ui/unread-badge/unread-badge';
import { ShellData } from '../shell-data';
import { UserPanel } from '../user-panel/user-panel';

/**
 * Cột 2 — đổi nội dung theo ngữ cảnh.
 *
 * `serverId` rỗng nghĩa là đang ở khu tin nhắn trực tiếp (`/channels/@me`); khi
 * đó cột hiện danh sách hộp thoại. Có `serverId` thì hiện danh sách kênh.
 *
 * Bốn mục "Nitro / Cửa hàng / Nhiệm Vụ" của Discord đã bỏ: đó là tính năng
 * thương mại, Nexus không có gói trả phí lẫn cửa hàng.
 */
@Component({
  selector: 'app-channel-sidebar',
  imports: [
    Avatar,
    MatIconModule,
    MatListModule,
    MatTooltipModule,
    RouterLink,
    RouterLinkActive,
    SearchField,
    SectionLabel,
    UnreadBadge,
    UserPanel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full w-60 shrink-0 flex-col bg-canvas-soft' },
  styles: `
    /* Hàng của Material cao 48px theo M3 — quá thoáng cho sidebar dạng Discord.
       Nén lại bằng token của chính Material thay vì đè !important lên class nội bộ. */
    :host {
      --mat-list-list-item-one-line-container-height: 34px;
      --mat-list-list-item-two-line-container-height: 44px;
      --mat-list-list-item-leading-icon-size: 20px;
      --mat-list-list-item-label-text-size: 14px;
      --mat-list-list-item-label-text-color: var(--color-body);
      --mat-list-list-item-supporting-text-color: var(--color-mute);
      --mat-list-active-indicator-shape: var(--radius-sm);
    }
  `,
  template: `
    <header class="shrink-0 border-b border-hairline p-2">
      @if (serverId()) {
        <h2 class="truncate px-2 py-1 text-body-md-strong text-ink-strong">{{ title() }}</h2>
      } @else {
        <app-search-field placeholder="Tìm hoặc bắt đầu cuộc trò chuyện" [disabled]="true" />
      }
    </header>

    <nav class="flex-1 overflow-y-auto px-2 py-3" [attr.aria-label]="title()">
      @if (serverId()) {
        <!-- ══ Kênh trong server ══ -->
        @for (group of channelGroups(); track group.type) {
          <app-section-label class="mt-3 mb-1 block" [text]="group.label" />
          <mat-nav-list class="!py-0">
            @for (channel of group.channels; track channel.id) {
              <a
                mat-list-item
                [routerLink]="['/channels', serverId(), channel.id]"
                routerLinkActive
                #link="routerLinkActive"
                [activated]="link.isActive"
                [attr.aria-current]="link.isActive ? 'page' : null"
              >
                <mat-icon matListItemIcon aria-hidden="true">
                  {{ channel.type === 'voice' ? 'volume_up' : 'tag' }}
                </mat-icon>
                <span matListItemTitle [class.text-ink-strong]="link.isActive || channel.unread">
                  {{ channel.name }}
                </span>
                <app-unread-badge
                  matListItemMeta
                  [count]="channel.mentionCount"
                  label="lượt nhắc tên chưa đọc"
                />
              </a>
            }
          </mat-nav-list>
        } @empty {
          <p class="px-2 py-4 text-body-sm text-mute">Server này chưa có kênh nào.</p>
        }
      } @else {
        <!-- ══ Khu tin nhắn trực tiếp ══ -->
        <mat-nav-list class="!py-0">
          <a
            mat-list-item
            routerLink="/channels/@me"
            routerLinkActive
            #friends="routerLinkActive"
            [routerLinkActiveOptions]="{ exact: true }"
            [activated]="friends.isActive"
            [attr.aria-current]="friends.isActive ? 'page' : null"
          >
            <mat-icon matListItemIcon aria-hidden="true">group</mat-icon>
            <span matListItemTitle [class.text-ink-strong]="friends.isActive">Bạn bè</span>
          </a>
        </mat-nav-list>

        <app-section-label class="mt-5 mb-1 block" text="Tin nhắn trực tiếp">
          <button
            slot="action"
            type="button"
            disabled
            matTooltip="Tạo tin nhắn (chưa làm)"
            class="rounded-xs text-mute disabled:cursor-not-allowed"
          >
            <mat-icon aria-hidden="true" class="!size-4 !text-base">add</mat-icon>
            <span class="sr-only">Tạo tin nhắn mới</span>
          </button>
        </app-section-label>

        <mat-nav-list class="!py-0">
          @for (conversation of conversations(); track conversation.id) {
            <a
              mat-list-item
              [routerLink]="['/channels/@me', conversation.id]"
              routerLinkActive
              #link="routerLinkActive"
              [activated]="link.isActive"
              [attr.aria-current]="link.isActive ? 'page' : null"
              [lines]="conversation.statusMessage ? 2 : 1"
            >
              <app-avatar
                matListItemIcon
                [name]="conversation.name"
                [presence]="conversation.presence"
                size="sm"
                ring="canvas-soft"
              />
              <span matListItemTitle [class.text-ink-strong]="link.isActive || conversation.unread">
                {{ conversation.name }}
              </span>
              @if (conversation.statusMessage) {
                <span matListItemLine>{{ conversation.statusMessage }}</span>
              }
            </a>
          }
        </mat-nav-list>
      }
    </nav>

    <app-user-panel />
  `,
})
export class ChannelSidebar {
  private readonly shell = inject(ShellData);

  /** Rỗng = khu tin nhắn trực tiếp. */
  readonly serverId = input<string | null>(null);

  protected readonly conversations = this.shell.conversations;

  protected readonly title = computed(() => {
    const id = this.serverId();
    if (!id) {
      return 'Tin nhắn trực tiếp';
    }
    return this.shell.serverOf(id)?.name ?? 'Máy chủ';
  });

  /** Tách kênh chữ và kênh thoại thành hai nhóm có tiêu đề, giống Discord. */
  protected readonly channelGroups = computed(() => {
    const id = this.serverId();
    if (!id) {
      return [];
    }
    const channels = this.shell.channelsOf(id);
    return [
      { type: 'text' as const, label: 'Kênh chữ' },
      { type: 'voice' as const, label: 'Kênh thoại' },
    ]
      .map((group) => ({ ...group, channels: channels.filter((c) => c.type === group.type) }))
      .filter((group) => group.channels.length > 0);
  });
}
