import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ShellData } from '../../../../../core/api/shell-data';
import { Avatar } from '../../../../../shared/ui/avatar/avatar';
import { SectionLabel } from '../../../../../shared/ui/section-label/section-label';

/**
 * Danh sách tin nhắn riêng — nội dung cột 2 khi ở khu `/channels/@me`.
 *
 * Không có "Nitro / Cửa hàng / Nhiệm Vụ" như Discord: đó là tính năng thương mại,
 * Nexus không có gói trả phí lẫn cửa hàng.
 */
@Component({
  selector: 'app-conversation-list',
  imports: [
    Avatar,
    MatIconModule,
    MatListModule,
    MatTooltipModule,
    RouterLink,
    RouterLinkActive,
    SectionLabel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './conversation-list.html',
  styleUrl: './conversation-list.css',
})
export class ConversationList {
  private readonly shell = inject(ShellData);

  readonly query = input('');

  protected readonly hasQuery = computed(() => this.normalize(this.query()).length > 0);

  protected readonly conversations = computed(() => {
    const query = this.normalize(this.query());
    const conversations = this.shell.conversations();
    if (!query) {
      return conversations;
    }

    return conversations.filter((conversation) =>
      this.normalize(`${conversation.name} ${conversation.statusMessage ?? ''}`).includes(query),
    );
  });

  protected readonly sectionTitle = computed(() =>
    this.hasQuery() ? `Kết quả · ${this.conversations().length}` : 'Tin nhắn trực tiếp',
  );

  private normalize(value: string): string {
    return (
      value
        .trim()
        .toLocaleLowerCase('vi')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        // `\u0111` l\u00e0 CH\u1eee C\u00c1I ri\u00eang (U+0111), kh\u00f4ng ph\u1ea3i `d` k\u00e8m d\u1ea5u, n\u00ean NFD kh\u00f4ng
        // t\u00e1ch \u0111\u01b0\u1ee3c n\u00f3. Thi\u1ebfu d\u00f2ng n\u00e0y th\u00ec g\u00f5 "duc" kh\u00f4ng bao gi\u1edd ra "\u0110\u1ee9c".
        .replace(/\u0111/g, 'd')
    );
  }
}
