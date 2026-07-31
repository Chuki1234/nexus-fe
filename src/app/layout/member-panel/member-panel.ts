import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import type { PresenceStatus } from '../../../shared/dto/common';
import { Avatar } from '../../ui/avatar/avatar';
import { SectionLabel } from '../../ui/section-label/section-label';

/**
 * Cột 4 — thẻ hồ sơ người đang trò chuyện (ảnh 3 trong tài liệu phân tích).
 *
 * Cấu trúc theo tài liệu: banner → avatar lớn đè lên ranh giới banner–thân →
 * tên + handle → divider → máy chủ chung → ngày tham gia → nút footer.
 *
 * P2 sẽ nối vào hồ sơ thật; hiện dữ liệu truyền từ ngoài vào.
 */
@Component({
  selector: 'app-member-panel',
  imports: [Avatar, MatButtonModule, MatChipsModule, MatDividerModule, SectionLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full w-84 shrink-0 flex-col overflow-y-auto bg-canvas-soft' },
  template: `
    <div class="p-4">
      <article class="overflow-hidden rounded-md border border-hairline bg-canvas">
        <!-- Banner: chưa có ảnh nên dùng dải nền, không để khoảng trắng vô nghĩa -->
        <div aria-hidden="true" class="h-16 bg-canvas-soft"></div>

        <div class="-mt-10 px-4 pb-4">
          <app-avatar
            class="ring-4 ring-canvas rounded-full"
            [name]="name()"
            [presence]="presence()"
            size="xl"
            ring="canvas"
          />

          <h2 class="mt-3 text-display-sm text-ink-strong">{{ name() }}</h2>

          @if (statusMessage(); as status) {
            <p class="mt-1 text-body-sm text-body">{{ status }}</p>
          }

          <mat-chip-set class="mt-3" aria-label="Nhãn của thành viên">
            <mat-chip>Thành viên</mat-chip>
          </mat-chip-set>

          <mat-divider class="!my-4" />

          <app-section-label text="Máy chủ chung" />
          <p class="mt-1 px-2 text-body-sm text-body">1 máy chủ chung</p>

          <app-section-label class="mt-4 block" text="Tham gia từ" />
          <p class="mt-1 px-2 text-body-sm text-body">19 tháng 3, 2020</p>

          <button mat-flat-button class="!mt-5 !w-full" type="button" disabled>
            Xem hồ sơ đầy đủ
          </button>
        </div>
      </article>
    </div>
  `,
})
export class MemberPanel {
  readonly name = input.required<string>();
  readonly statusMessage = input<string | null>(null);
  readonly presence = input<PresenceStatus | null>(null);
}
