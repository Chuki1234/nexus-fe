import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import type { PresenceStatus } from '../../../../../shared/dto/common';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import { SectionLabel } from '../../../../shared/ui/section-label/section-label';

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
  host: { class: 'flex h-full w-84 shrink-0 flex-col overflow-y-auto bg-surface' },
  templateUrl: './member-panel.html',
  styleUrl: './member-panel.css',
})
export class MemberPanel {
  readonly name = input.required<string>();
  readonly statusMessage = input<string | null>(null);
  readonly presence = input<PresenceStatus | null>(null);
}
