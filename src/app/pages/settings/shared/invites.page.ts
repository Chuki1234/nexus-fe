import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import {
  generateInviteCode,
  INVITE_EXPIRY_OPTIONS,
  INVITE_MAX_USES_OPTIONS,
  MOCK_FRIENDS,
  MockInvite,
} from '../mock/settings-mock';
import { SettingsSectionComponent } from '../ui/settings-section.component';

/**
 * BẢN MẪU lời mời, dùng chung cho máy chủ và kênh.
 *
 * Hai cách mời trong một màn hình vì chúng thay thế cho nhau: mời thẳng người đã
 * kết bạn, hoặc phát một link cho người chưa có trong danh sách bạn bè.
 *
 * Bản thật: mã do BACKEND sinh (nanoid) và hạn dùng do Supabase giữ. Sinh ở client
 * như đây thì không chống được trùng mã, và hạn dùng chỉ là con số trên màn hình —
 * ai cũng sửa được vì không có gì phía máy chủ kiểm lại.
 */
@Component({
  selector: 'app-settings-invites',
  imports: [SettingsSectionComponent, ReactiveFormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './invites.page.html',
})
export class InvitesPage {
  protected readonly expiryOptions = INVITE_EXPIRY_OPTIONS;
  protected readonly maxUsesOptions = INVITE_MAX_USES_OPTIONS;

  /** Chỉ số trong `expiryOptions`, không phải số giờ: `null` không làm khoá được. */
  protected readonly expiryIndex = signal(1);
  protected readonly maxUsesIndex = signal(1);

  protected readonly invites = signal<MockInvite[]>([]);
  protected readonly copiedCode = signal<string | null>(null);

  // ── Mời bạn bè ───────────────────────────────────────────────────────────
  protected readonly search = new FormControl('', { nonNullable: true });
  private readonly query = toSignal(this.search.valueChanges, { initialValue: '' });
  protected readonly invitedIds = signal<Set<string>>(new Set());

  protected readonly friends = computed(() => {
    const needle = this.query().trim().toLowerCase();
    return MOCK_FRIENDS.filter(
      (friend) =>
        !needle ||
        friend.username.toLowerCase().includes(needle) ||
        friend.displayName.toLowerCase().includes(needle),
    );
  });

  protected createInvite(): void {
    const expiry = this.expiryOptions[this.expiryIndex()];
    const maxUses = this.maxUsesOptions[this.maxUsesIndex()];

    this.invites.update((current) => [
      {
        code: generateInviteCode(),
        createdByUsername: 'ban',
        expiresAt:
          expiry.hours === null
            ? null
            : new Date(Date.now() + expiry.hours * 3600_000).toISOString(),
        uses: 0,
        maxUses,
      },
      ...current,
    ]);
  }

  protected revoke(code: string): void {
    this.invites.update((current) => current.filter((invite) => invite.code !== code));
  }

  protected inviteUrl(code: string): string {
    // `location` chỉ có ở trình duyệt; trang này nằm sau authGuard nên không
    // prerender, nhưng vẫn phòng để SSR không nổ nếu sau này cấu hình đổi.
    const origin = typeof location === 'undefined' ? 'https://nexus.app' : location.origin;
    return `${origin}/invite/${code}`;
  }

  protected async copy(code: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.inviteUrl(code));
      this.copiedCode.set(code);
      setTimeout(
        () => this.copiedCode.update((current) => (current === code ? null : current)),
        2000,
      );
    } catch {
      // Trình duyệt từ chối quyền clipboard: link vẫn hiện đầy đủ trên màn hình
      // để người dùng bôi đen sao chép tay.
    }
  }

  protected isExpired(invite: MockInvite): boolean {
    return invite.expiresAt !== null && Date.parse(invite.expiresAt) <= Date.now();
  }

  /** Còn bao lâu, làm tròn tới đơn vị lớn nhất còn ý nghĩa. */
  protected remaining(invite: MockInvite): string {
    if (invite.expiresAt === null) {
      return '';
    }
    const ms = Date.parse(invite.expiresAt) - Date.now();
    if (ms <= 0) {
      return '';
    }
    const hours = Math.round(ms / 3600_000);
    return hours >= 24 ? `${Math.round(hours / 24)}d` : `${Math.max(hours, 1)}h`;
  }

  protected toggleFriend(id: string): void {
    this.invitedIds.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }
}
