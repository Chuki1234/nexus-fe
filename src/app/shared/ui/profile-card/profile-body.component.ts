import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ProfileCardService } from './profile-card.service';
import { MockMember } from '../../../pages/channels/mock/chat-mock';
import { AvatarComponent } from '../avatar.component';
import { PresenceDotComponent } from '../presence-dot.component';
import { bannerFallback } from './banner-color';
import { EmptyFieldComponent } from './empty-field.component';
import { detectLinkIcon, LINK_ICONS } from './link-icon';
import { injectMemberProfile } from './member-profile';

/**
 * Ruột của thẻ hồ sơ — dùng chung cho popup nổi và bảng cạnh khung chat.
 *
 * Hai chỗ đó khác nhau ở khung ngoài (nổi có bóng và neo vị trí, bảng thì gắn
 * cứng bên phải) nhưng nội dung y hệt; tách ra để sửa một lần là cả hai đổi theo.
 *
 * Dữ liệu ghép từ hai nguồn: phần trạng thái/vai trò lấy từ dữ liệu giả của
 * kênh, phần hồ sơ (ảnh, giới thiệu, liên kết, ngày tham gia) hỏi API THẬT theo
 * username. Người nào không có hồ sơ thật thì vẫn hiện phần giả — bản mẫu không
 * được vỡ chỉ vì một thành viên bịa.
 */
@Component({
  selector: 'app-profile-body',
  imports: [AvatarComponent, PresenceDotComponent, RouterLink, EmptyFieldComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Cover Banner -->
    <div
      class="relative h-36 w-full shrink-0 overflow-hidden rounded-t-xl transition-all duration-300"
      [style.background]="profile()?.bannerUrl ? 'transparent' : 'linear-gradient(135deg, ' + bannerColor() + ' 0%, #101010 100%)'"
    >
      @if (profile()?.bannerUrl; as banner) {
        <img [src]="banner" alt="" decoding="async" class="size-full object-cover" />
      } @else {
        <div class="absolute inset-0 opacity-20" style="background-image: radial-gradient(#fff 1px, transparent 1px); background-size: 14px 14px;"></div>
      }
    </div>

    <div class="relative z-10 px-5 pb-5">
      <!-- Avatar with status badge -->
      <div class="relative z-10 -mt-8 mb-3 flex items-end justify-between gap-2">
        <span class="relative z-10 group">
          <span class="relative inline-flex rounded-full ring-4 ring-canvas shadow-xl transition-transform group-hover:scale-105">
            <app-avatar
              [src]="profile()?.avatarUrl ?? null"
              [name]="member().displayName"
              size="md"
            />
          </span>
          <app-presence-dot
            [status]="member().status"
            size="md"
            ringClass="border-canvas"
            class="absolute right-0 bottom-0 z-20"
          />
        </span>
      </div>

      <!-- Identity Header -->
      <h2 class="text-display-sm font-bold text-ink-strong tracking-tight">{{ member().displayName }}</h2>
      <p class="text-body-sm text-mute">&commat;{{ member().username }}</p>

      <!-- Status Message -->
      @if (profile()?.statusMessage; as status) {
        <p class="mt-2.5 inline-flex max-w-full items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-caption text-ink font-medium shadow-xs">
          <span aria-hidden="true" class="size-2 shrink-0 rounded-full bg-primary animate-pulse"></span>
          <span class="truncate">{{ status }}</span>
        </p>
      }

      <!-- Vai trò — chỉ hiện khi biết nó thuộc máy chủ NÀO. Một chức danh trần
           như "Điều hành viên" không nói lên điều gì: người xem không biết điều
           hành ở đâu, mà cùng một người có thể mang vai trò khác nhau ở mỗi
           máy chủ. -->
      @if (member().roleName && member().roleServer) {
        <div class="mt-3.5 border-t border-hairline/60 pt-3">
          <h3 class="text-caption-strong text-mute uppercase font-bold tracking-wider">
            Vai trò tại {{ member().roleServer }}
          </h3>
          <p class="mt-1.5 inline-flex items-center gap-2 rounded-full border border-hairline bg-canvas-soft px-3 py-1">
            <span
              aria-hidden="true"
              class="size-2.5 shrink-0 rounded-full shadow-sm"
              [style.background-color]="member().color ?? 'var(--color-mute)'"
            ></span>
            <span class="text-caption font-semibold text-ink">{{ member().roleName }}</span>
          </p>
        </div>
      }

      <!-- Bio, Joined & Links -->
      @if (profile(); as person) {
        <!-- Chỉ hiện mời điền cho chính chủ — thẻ nổi này gọn nên KHÔNG thêm
             lời mời cho dòng trạng thái/nơi ở như hai nơi hiện hồ sơ đầy đủ
             kia, chỉ giữ giới thiệu và liên kết vì hai mục đó vốn đã có
             khung riêng ở đây. -->
        @if (person.bio; as bio) {
          <div class="mt-3.5 border-t border-hairline/60 pt-3">
            <h3 class="text-caption-strong text-mute uppercase font-bold tracking-wider mb-1.5">Giới thiệu</h3>
            <p class="line-clamp-4 whitespace-pre-line text-caption text-body leading-relaxed bg-canvas-soft/50 p-3 rounded-xl border border-hairline/60 shadow-inner">{{ bio }}</p>
          </div>
        } @else if (isSelf()) {
          <div class="mt-3.5 border-t border-hairline/60 pt-3">
            <app-empty-field
              [compact]="true"
              [isSelf]="true"
              [selfLabel]="'profile.empty.bioSelf' | translate"
              [otherLabel]="''"
              [ctaLabel]="'profile.empty.cta' | translate"
              focusFragment="bio"
            />
          </div>
        }

        <div class="mt-3.5 border-t border-hairline/60 pt-3 flex items-center justify-between text-caption">
          <span class="text-mute font-medium">Thành viên từ</span>
          <span class="text-ink font-semibold">{{ joined() }}</span>
        </div>

        @if (person.links.length) {
          <div class="mt-3.5 border-t border-hairline/60 pt-3">
            <h3 class="text-caption-strong text-mute uppercase font-bold tracking-wider">Liên kết</h3>
            <ul class="mt-2 flex flex-wrap gap-2">
              @for (link of person.links; track link.url) {
                <li>
                  <a
                    [href]="link.url"
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    class="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-canvas-soft px-3 py-1 text-caption font-medium text-ink transition-colors hover:border-primary hover:text-primary"
                  >
                    <svg aria-hidden="true" class="size-3 text-mute" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="linkIconPath(link.url)" />
                    </svg>
                    <span>{{ link.label }}</span>
                  </a>
                </li>
              }
            </ul>
          </div>
        } @else if (isSelf()) {
          <div class="mt-3.5 border-t border-hairline/60 pt-3">
            <app-empty-field
              [compact]="true"
              [isSelf]="true"
              [selfLabel]="'profile.empty.linksSelf' | translate"
              [otherLabel]="''"
              [ctaLabel]="'profile.empty.cta' | translate"
              focusFragment="links"
            />
          </div>
        }
      } @else if (loading()) {
        <div class="mt-3.5 animate-pulse border-t border-hairline/60 pt-3 space-y-2">
          <div class="h-3 w-24 rounded bg-canvas-soft"></div>
          <div class="h-3 w-40 rounded bg-canvas-soft"></div>
        </div>
      } @else {
        <p class="mt-3.5 border-t border-hairline/60 pt-3 text-caption text-mute italic">
          Người này chưa khởi tạo hồ sơ Nexus.
        </p>
      }

      <!-- Actions Bar -->
      <div class="mt-5 flex flex-wrap gap-2">
        @if (isSelf()) {
          <a
            routerLink="/settings/profile"
            class="flex-1 rounded-lg bg-primary px-3 py-2 text-center text-body-sm font-semibold text-on-primary shadow-glow transition-transform hover:scale-[1.02] hover:bg-primary-soft active:scale-[0.98]"
          >
            Chỉnh sửa hồ sơ
          </a>
        } @else {
          <a
            [routerLink]="['/channels/@me', member().id]"
            class="flex-1 rounded-lg bg-primary px-3 py-2 text-center text-body-sm font-semibold text-on-primary shadow-glow transition-transform hover:scale-[1.02] hover:bg-primary-soft active:scale-[0.98]"
          >
            Nhắn tin
          </a>
        }
        @if (profile()) {
          <!-- Nút chứ không phải link: nâng thẻ này thành cửa sổ giữa màn hình,
               KHÔNG điều hướng sang /u/:username. Điều hướng đi thì khung chat
               phía sau biến mất, mà chính cái chat phía sau mới làm cho hồ sơ
               trông như đang nổi lên trên cuộc trò chuyện. -->
          <button
            type="button"
            (click)="openFull($event)"
            aria-haspopup="dialog"
            class="flex-1 rounded-lg border border-hairline-strong bg-canvas px-3 py-2 text-center text-body-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
          >
            Xem hồ sơ
          </button>
        }
      </div>
    </div>
  `,
})
export class ProfileBodyComponent {
  private readonly cards = inject(ProfileCardService);

  readonly member = input.required<MockMember>();

  private readonly state = injectMemberProfile(this.member);
  protected readonly profile = this.state.profile;
  protected readonly loading = this.state.loading;


  /** Backend là bên nói ai là ai — không đoán bằng cách so id ở phía này. */
  protected readonly isSelf = computed(() => this.profile()?.isSelf === true);

  protected readonly bannerColor = computed(() =>
    bannerFallback(this.member().username, this.profile()?.accentColor),
  );

  protected linkIconPath(url: string): string {
    return LINK_ICONS[detectLinkIcon(url)];
  }

  /** "Tháng 8, 2026" — tự dựng vì app chưa nạp locale tiếng Việt. */
  protected readonly joined = computed(() => {
    const createdAt = this.profile()?.createdAt;
    if (!createdAt) {
      return '—';
    }
    const date = new Date(createdAt);
    return Number.isNaN(date.getTime())
      ? '—'
      : `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
  });

  protected openFull(event: Event): void {
    this.cards.expandOrOpen(this.member(), event.currentTarget as HTMLElement);
  }
}
