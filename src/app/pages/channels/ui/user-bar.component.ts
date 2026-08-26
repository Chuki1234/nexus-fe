import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProfileApiService } from '../../../core/profile/profile-api.service';
import { ProfileLookupService } from '../../../core/profile/profile-lookup.service';
import { OwnProfile, profileDisplayName } from '../../../core/profile/profile.models';
import { AvatarComponent } from '../../../shared/ui/avatar.component';
import { PresenceDotComponent } from '../../../shared/ui/presence-dot.component';
import { ProfileCardService } from '../../../shared/ui/profile-card/profile-card.service';
import { CURRENT_USER_ID, selfAsMember } from '../mock/chat-mock';

/**
 * Thanh người dùng dưới đáy cột kênh: avatar, tên, và lối vào Cài đặt.
 *
 * Hồ sơ ở đây là DỮ LIỆU THẬT (GET /api/profiles/me). Chỉ chấm trạng thái là giả
 * — chưa có kênh realtime nào để biết ai đang online.
 */
@Component({
  selector: 'app-user-bar',
  imports: [AvatarComponent, PresenceDotComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-2 border-t border-hairline bg-canvas-soft px-2 py-2">
      @if (profile(); as person) {
        <!-- Nút mở thẻ hồ sơ chứ không phải link sang trang hồ sơ: đây là avatar
             của chính mình, cái người ta muốn khi bấm vào là xem nhanh mình đang
             hiện ra thế nào. Đường sang trang đầy đủ nằm trong thẻ. -->
        <button
          type="button"
          (click)="openCard($event)"
          aria-haspopup="dialog"
          [attr.aria-expanded]="cardOpen()"
          class="flex min-w-0 flex-1 items-center gap-2 rounded-sm p-1 text-left hover:bg-canvas"
        >
          <span class="relative shrink-0">
            <app-avatar [src]="person.avatarUrl" [name]="name()" size="sm" />
            <app-presence-dot
              status="online"
              ringClass="border-canvas-soft"
              class="absolute right-0 bottom-0"
            />
          </span>
          <span class="min-w-0">
            <span class="block truncate text-body-sm-strong text-ink">{{ name() }}</span>
            <span class="block truncate text-caption text-mute">&commat;{{ person.username }}</span>
          </span>
        </button>
      } @else {
        <span class="min-w-0 flex-1 px-1 text-caption text-mute">…</span>
      }

      <a
        routerLink="/settings"
        title="Cài đặt"
        class="shrink-0 rounded-sm p-2 text-body hover:bg-canvas hover:text-ink"
      >
        <!-- Bánh răng vẽ tay: dự án chưa có bộ icon nào, thêm một thư viện chỉ
             vì một hình là không đáng. currentColor để đổi theme là đổi theo. -->
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          class="size-5"
        >
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
          />
        </svg>
        <span class="sr-only">Cài đặt</span>
      </a>
    </div>
  `,
})
export class UserBarComponent {
  private readonly api = inject(ProfileApiService);
  private readonly lookup = inject(ProfileLookupService);
  private readonly cards = inject(ProfileCardService);

  protected readonly profile = signal<OwnProfile | null>(null);

  protected readonly name = computed(() => {
    const person = this.profile();
    return person ? profileDisplayName(person) : '';
  });

  /** Cho aria-expanded biết thẻ đang mở là thẻ của chính mình hay của người khác. */
  protected readonly cardOpen = computed(
    () => this.cards.request()?.member.id === CURRENT_USER_ID,
  );

  constructor() {
    void this.load();
  }

  protected openCard(event: Event): void {
    const person = this.profile();
    if (!person) {
      return;
    }
    // openModal chứ không phải toggle: hồ sơ của chính mình mở ra giữa màn hình,
    // không phải một thẻ nhỏ dính vào góc dưới trái.
    this.cards.openModal(
      selfAsMember(person.username, this.name()),
      event.currentTarget as HTMLElement,
    );
  }

  /** Hỏng thì để trống: thanh này không đáng dựng một khối lỗi giữa giao diện. */
  private async load(): Promise<void> {
    try {
      const person = await this.api.getOwn();
      this.profile.set(person);
      // Thẻ hồ sơ tra theo username; đưa sẵn kết quả vào để lúc bấm nó mở ra
      // thấy nội dung ngay chứ không chớp một nhịp khung xám.
      this.lookup.prime(person);
    } catch {
      this.profile.set(null);
    }
  }
}
