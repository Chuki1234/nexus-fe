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
    return value
      .trim()
      .toLocaleLowerCase('vi')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
