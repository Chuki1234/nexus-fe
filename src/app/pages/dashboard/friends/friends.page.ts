import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { PRESENCE_LABEL } from '../../../../shared/dto/common';
import { Avatar } from '../../../ui/avatar/avatar';
import { EmptyState } from '../../../ui/empty-state/empty-state';
import { SearchField } from '../../../ui/search-field/search-field';
import { SectionLabel } from '../../../ui/section-label/section-label';
import { ShellData } from '../../../layout/shell-data';

/** Ba tab lọc, đúng ảnh 6 trong tài liệu phân tích. */
type FriendsTab = 'online' | 'all';

/** Trang đích của khu tin nhắn trực tiếp — `/channels/@me`. */
@Component({
  selector: 'app-friends-page',
  imports: [
    Avatar,
    EmptyState,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatTooltipModule,
    RouterLink,
    SearchField,
    SectionLabel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-h-0 flex-col' },
  styles: `
    :host {
      --mat-toolbar-container-background-color: var(--color-canvas);
      --mat-toolbar-container-text-color: var(--color-ink);
      --mat-toolbar-standard-height: 48px;
    }
  `,
  template: `
    <mat-toolbar class="!gap-3 !border-b !border-hairline !px-4">
      <mat-icon aria-hidden="true" class="text-mute">group</mat-icon>
      <h1 class="text-body-md-strong text-ink-strong">Bạn bè</h1>

      <span aria-hidden="true" class="h-5 w-px shrink-0 bg-hairline"></span>

      <!-- Tab lọc. Dùng nút + aria-pressed chứ không phải MatTabs: đây là bộ lọc
           trên cùng một danh sách, không phải nhiều panel nội dung khác nhau. -->
      <div class="flex gap-1" role="group" aria-label="Lọc danh sách bạn bè">
        @for (option of tabs; track option.id) {
          <button
            type="button"
            (click)="tab.set(option.id)"
            [attr.aria-pressed]="tab() === option.id"
            class="rounded-sm px-3 py-1 text-body-sm-strong transition-colors"
            [class.bg-canvas-soft]="tab() === option.id"
            [class.text-ink-strong]="tab() === option.id"
            [class.text-body]="tab() !== option.id"
          >
            {{ option.label }}
          </button>
        }
      </div>

      <span class="flex-1"></span>

      <button mat-flat-button type="button" disabled matTooltip="Thêm bạn (chưa làm)">
        Thêm bạn
      </button>
    </mat-toolbar>

    <div class="min-h-0 flex-1 overflow-y-auto p-6">
      <app-search-field placeholder="Tìm kiếm" [(value)]="query" />

      @if (visible().length > 0) {
        <app-section-label class="mt-6 block" [text]="sectionLabel()" />

        <ul class="mt-2 divide-y divide-hairline">
          @for (person of visible(); track person.id) {
            <li>
              <a
                [routerLink]="['/channels/@me', person.id]"
                class="flex items-center gap-3 rounded-sm px-2 py-3 hover:bg-canvas-soft"
              >
                <app-avatar
                  [name]="person.name"
                  [presence]="person.presence"
                  size="lg"
                  ring="canvas"
                />
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-body-sm-strong text-ink">{{ person.name }}</span>
                  <span class="block truncate text-caption text-mute">
                    {{ person.statusMessage ?? presenceLabel(person.presence) }}
                  </span>
                </span>
                <mat-icon aria-hidden="true" class="text-mute">chat_bubble</mat-icon>
              </a>
            </li>
          }
        </ul>
      } @else if (query()) {
        <app-empty-state icon="search_off" [message]="'Không có ai khớp với “' + query() + '”.'" />
      } @else {
        <app-empty-state
          icon="group_off"
          message="Chưa có cuộc trò chuyện nào. Hãy kết bạn để bắt đầu."
        />
      }
    </div>
  `,
})
export class FriendsPage {
  private readonly shell = inject(ShellData);

  protected readonly tabs = [
    { id: 'online' as const, label: 'Trực tuyến' },
    { id: 'all' as const, label: 'Tất cả' },
  ];

  protected readonly tab = signal<FriendsTab>('all');
  protected readonly query = signal('');

  protected readonly visible = computed(() => {
    const needle = this.query().trim().toLowerCase();
    return this.shell
      .conversations()
      .filter((person) => this.tab() === 'all' || person.presence !== 'offline')
      .filter((person) => !needle || person.name.toLowerCase().includes(needle));
  });

  protected readonly sectionLabel = computed(
    () => `${this.tab() === 'online' ? 'Trực tuyến' : 'Tất cả bạn bè'} — ${this.visible().length}`,
  );

  protected presenceLabel = (presence: keyof typeof PRESENCE_LABEL) => PRESENCE_LABEL[presence];
}
