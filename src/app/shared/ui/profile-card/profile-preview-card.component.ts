import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AvatarComponent } from '../avatar.component';
import { bannerFallback } from './banner-color';
import { EmptyFieldComponent } from './empty-field.component';
import { detectLinkIcon, LINK_ICONS } from './link-icon';

/**
 * `Partial` chứ không phải `ProfileLink` đầy đủ: giá trị đến từ
 * `FormArray.valueChanges` của trang sửa, đang gõ dở giữa chừng có thể thiếu
 * `label`/`url` — kiểu của Angular typed forms phản ánh đúng thực tế đó.
 */
type PreviewLink = { label?: string; url?: string };

/**
 * Thẻ xem trước hồ sơ trên trang `/settings/profile` — trước đây là một khối
 * viết tay ngay trong `profile-edit.page.html`, bản trùng lặp thứ TƯ của cùng
 * một tấm thẻ hồ sơ (ba bản kia: trang `/u/:username`, cửa sổ giữa màn hình,
 * thẻ nổi cạnh chat). Tách ra đây để nếu còn trôi giạt thêm thì chỉ trôi ở một
 * chỗ.
 *
 * KHÔNG dùng lại `ProfileBodyComponent`: nó gọi `injectMemberProfile()` → gọi
 * API thật mỗi lần đổi input, sai với yêu cầu "xem trước không được gọi API".
 * KHÔNG dùng lại `ProfileModalComponent`: nó mang theo khung dialog (nền mờ,
 * bẫy Tab, Esc) không hợp với một cột xem trước nằm ngay trong trang.
 *
 * Nhận toàn `input()` thuần — không tự đọc API, không biết gì về form hay
 * ProfileEditPage. Nơi gọi tự gộp giá trị đã lưu với giá trị đang gõ dở.
 */
@Component({
  selector: 'app-profile-preview-card',
  imports: [AvatarComponent, EmptyFieldComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-hidden rounded-2xl border border-hairline bg-canvas-soft/90 shadow-modal backdrop-blur-md">
      <!-- Banner -->
      <div
        class="relative h-40 w-full overflow-hidden transition-all"
        [style.background]="bannerUrl() ? 'transparent' : 'linear-gradient(135deg, ' + bannerColor() + ' 0%, #101010 100%)'"
      >
        @if (bannerUrl(); as banner) {
          <img [src]="banner" alt="" decoding="async" class="size-full object-cover" />
        } @else {
          <div class="absolute inset-0 opacity-20" style="background-image: radial-gradient(#fff 1px, transparent 1px); background-size: 14px 14px;"></div>
        }
        @if (bannerBusy()) {
          <div class="absolute inset-0 flex items-center justify-center bg-canvas/60 backdrop-blur-sm">
            <svg aria-hidden="true" class="size-6 animate-spin text-ink" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="sr-only">Đang tải ảnh bìa…</span>
          </div>
        }
      </div>

      <div class="relative z-10 px-5 pb-5">
        <div class="relative z-10 -mt-14 mb-3 flex items-end justify-between">
          <span class="relative inline-flex rounded-full ring-4 ring-canvas-soft shadow-xl">
            <app-avatar [src]="avatarUrl()" [name]="displayName()" size="lg" />
            @if (avatarBusy()) {
              <span class="absolute inset-0 flex items-center justify-center rounded-full bg-canvas/60 backdrop-blur-sm">
                <svg aria-hidden="true" class="size-5 animate-spin text-ink" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="sr-only">Đang tải ảnh đại diện…</span>
              </span>
            }
          </span>
        </div>

        <h3 class="text-display-sm font-bold text-ink-strong tracking-tight">{{ displayName() }}</h3>
        <p class="text-body-sm text-mute">&commat;{{ username() }}</p>

        @if (statusMessage(); as status) {
          <div class="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-caption text-ink font-medium shadow-xs">
            <span aria-hidden="true" class="size-2 shrink-0 rounded-full bg-primary animate-pulse"></span>
            <span class="truncate">{{ status }}</span>
          </div>
        } @else {
          <app-empty-field
            class="mt-3"
            [compact]="true"
            [editing]="true"
            [isSelf]="true"
            [selfLabel]="'profile.empty.statusSelf' | translate"
            [otherLabel]="''"
            [ctaLabel]="''"
          />
        }

        <div class="mt-4 flex flex-wrap gap-4 text-caption text-mute border-t border-hairline/60 pt-3">
          @if (location(); as loc) {
            <div class="flex items-center gap-1.5">
              <svg aria-hidden="true" class="size-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <span>{{ loc }}</span>
            </div>
          }
          <div class="flex items-center gap-1.5">
            <svg aria-hidden="true" class="size-3.5 text-mute" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Thành viên Nexus</span>
          </div>
        </div>

        <!-- Bio -->
        <div class="mt-3 border-t border-hairline/60 pt-3">
          <h4 class="text-caption-strong text-mute uppercase font-bold tracking-wider mb-1.5">Giới thiệu</h4>
          @if (bio(); as bio) {
            <p class="whitespace-pre-line rounded-xl border border-hairline/60 bg-canvas/50 p-3 text-caption leading-relaxed text-body shadow-inner">{{ bio }}</p>
          } @else {
            <app-empty-field
              [compact]="true"
              [editing]="true"
              [isSelf]="true"
              [selfLabel]="'profile.empty.bioSelf' | translate"
              [otherLabel]="''"
              [ctaLabel]="''"
            />
          }
        </div>

        <!-- Links -->
        @if (links().length) {
          <div class="mt-3 border-t border-hairline/60 pt-3 space-y-2">
            <h4 class="text-caption-strong text-mute uppercase font-bold tracking-wider mb-1.5">Liên kết</h4>
            <div class="flex flex-wrap gap-1.5">
              @for (link of links(); track $index) {
                @if (link.label) {
                  <span class="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-canvas px-3 py-1 text-caption text-ink font-medium shadow-xs">
                    <svg aria-hidden="true" class="size-3 text-mute" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="linkIconPath(link.url)" />
                    </svg>
                    <span>{{ link.label }}</span>
                  </span>
                }
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class ProfilePreviewCardComponent {
  readonly displayName = input.required<string>();
  readonly username = input.required<string>();
  readonly avatarUrl = input<string | null>(null);
  readonly bannerUrl = input<string | null>(null);
  readonly accentColor = input<string | null>(null);
  readonly statusMessage = input<string | null>(null);
  readonly location = input<string | null>(null);
  readonly bio = input<string | null>(null);
  readonly links = input<PreviewLink[]>([]);
  /** Đang có request upload chạy dở — khoá phần ảnh tương ứng bằng lớp mờ. */
  readonly avatarBusy = input(false);
  readonly bannerBusy = input(false);

  protected readonly bannerColor = computed(() => bannerFallback(this.username(), this.accentColor()));

  protected linkIconPath(url: string | undefined): string {
    return LINK_ICONS[detectLinkIcon(url ?? '')];
  }
}
