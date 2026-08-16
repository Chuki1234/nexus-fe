import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MockMember } from '../../../pages/channels/mock/chat-mock';
import { AvatarComponent } from '../avatar.component';
import { PresenceDotComponent } from '../presence-dot.component';
import { bannerFallback } from './banner-color';
import { EmptyFieldComponent } from './empty-field.component';
import { detectLinkIcon, LINK_ICONS } from './link-icon';
import { injectMemberProfile } from './member-profile';
import { ProfileCardService } from './profile-card.service';

/** Thứ có thể nhận tiêu điểm — dùng để giữ Tab quẩn trong cửa sổ. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Chỗ giữ chỗ khi cửa sổ đóng.
 *
 * `injectMemberProfile` cần một member ở mọi lúc, kể cả lúc không có ai đang
 * được xem. Username rỗng là tín hiệu để nó không đi hỏi API.
 */
const NOBODY: MockMember = {
  id: '',
  username: '',
  displayName: '',
  color: null,
  roleName: '',
  status: 'offline',
};

/**
 * Hồ sơ mở ở GIỮA màn hình, có nền mờ chặn phía sau.
 *
 * Khác thẻ nổi ở chỗ người dùng đang hỏi gì: thẻ nổi trả lời "người này là ai?"
 * giữa lúc đọc chat nên phải nhỏ và dính vào avatar; cửa sổ này trả lời "hồ sơ
 * của tôi trông ra sao?" — người dùng dừng hẳn lại để xem, nên nó chiếm chỗ và
 * bày được nhiều thứ hơn.
 *
 * Vì nó chặn nền nên phải là dialog thật: `aria-modal="true"`, Tab quẩn bên
 * trong, Esc đóng, và tiêu điểm quay về đúng nút đã mở nó.
 */
@Component({
  selector: 'app-profile-modal',
  imports: [AvatarComponent, PresenceDotComponent, RouterLink, EmptyFieldComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closeIfOpen()' },
  template: `
    @if (request(); as request) {
      <!-- Glassmorphic Backdrop -->
      <div class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm" (click)="cards.close()" aria-hidden="true"></div>

      <div
        #dialog
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-name"
        tabindex="-1"
        (keydown.tab)="trapTab($event, false)"
        (keydown.shift.tab)="trapTab($event, true)"
        class="fixed inset-4 z-50 m-auto flex h-fit max-h-[calc(100dvh-2rem)] max-w-3xl flex-col overflow-y-auto rounded-2xl border border-hairline bg-canvas/95 shadow-modal backdrop-blur-md focus-visible:outline-none"
      >
        <!-- Cover Banner Hero -->
        <div
          class="relative h-44 w-full shrink-0 overflow-hidden"
          [style.background]="profile()?.bannerUrl ? 'transparent' : 'linear-gradient(135deg, ' + bannerColor() + ' 0%, #101010 100%)'"
        >
          @if (profile()?.bannerUrl; as banner) {
            <img [src]="banner" alt="" decoding="async" class="size-full object-cover" />
          } @else {
            <div class="absolute inset-0 opacity-20" style="background-image: radial-gradient(#fff 1px, transparent 1px); background-size: 16px 16px;"></div>
          }

          <!-- Nút đóng. Nền ĐỤC bằng token theme, không phải bg-black/60 trong
               suốt: nút này nằm trên ảnh bìa do người dùng tự tải lên, để nền
               trong suốt thì độ tương phản phụ thuộc vào chính tấm ảnh đó — bìa
               sáng màu là chữ X chìm hẳn. Nền đục cho tương phản cố định ở mọi
               ảnh, và tự đúng theo cả ba theme (canvas tối ở voltagent, sáng ở
               mongodb/apple). -->
          <button
            type="button"
            (click)="cards.close()"
            class="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-canvas text-ink-strong shadow-modal ring-1 ring-hairline-strong transition-colors hover:bg-canvas-soft hover:text-primary"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              class="size-5"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
            <span class="sr-only">Đóng</span>
          </button>
        </div>

        <!-- Dialog Content Grid -->
        <div class="relative z-10 grid gap-6 px-6 pb-6 sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <!-- Identity Column -->
          <div class="min-w-0">
            <div class="relative z-10 -mt-14 mb-3">
              <span class="relative z-10 inline-block group">
                <span class="relative inline-flex rounded-full ring-4 ring-canvas shadow-xl transition-transform group-hover:scale-105">
                  <app-avatar
                    [src]="profile()?.avatarUrl ?? null"
                    [name]="request.member.displayName"
                    size="lg"
                  />
                </span>
                <app-presence-dot
                  [status]="request.member.status"
                  size="lg"
                  ringClass="border-canvas"
                  class="absolute right-1 bottom-1 z-20"
                />
              </span>
            </div>

            <h2 id="profile-modal-name" class="text-display-md font-bold text-ink-strong tracking-tight">
              {{ request.member.displayName }}
            </h2>
            <p class="text-body-sm text-mute">&commat;{{ request.member.username }}</p>

            @if (profile()?.statusMessage; as status) {
              <p class="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 backdrop-blur-sm">
                <span aria-hidden="true" class="size-2 shrink-0 rounded-full bg-primary animate-pulse"></span>
                <span class="min-w-0 text-body-sm font-medium text-ink">{{ status }}</span>
              </p>
            } @else if (isSelf()) {
              <app-empty-field
                class="mt-3"
                [isSelf]="true"
                [selfLabel]="'profile.empty.statusSelf' | translate"
                [otherLabel]="''"
                [ctaLabel]="'profile.empty.cta' | translate"
                focusFragment="statusMessage"
              />
            }

            <!-- Chỉ một nút hành động: cửa sổ này đã là hồ sơ đầy đủ (bio,
                 liên kết, ngày tham gia đều có ở đây), nên không cần đường
                 sang trang riêng nữa — bớt một lựa chọn thừa. -->
            <div class="mt-4">
              @if (isSelf()) {
                <a
                  routerLink="/settings/profile"
                  class="block w-full rounded-lg bg-primary px-4 py-2.5 text-center text-button font-semibold text-on-primary shadow-glow transition-transform hover:scale-[1.02] hover:bg-primary-soft active:scale-[0.98]"
                >
                  Chỉnh sửa
                </a>
              } @else {
                <a
                  [routerLink]="['/channels/@me', request.member.id]"
                  class="block w-full rounded-lg bg-primary px-4 py-2.5 text-center text-button font-semibold text-on-primary shadow-glow transition-transform hover:scale-[1.02] hover:bg-primary-soft active:scale-[0.98]"
                >
                  Nhắn tin
                </a>
              }
            </div>

            <dl class="mt-6 flex flex-col gap-4 border-t border-hairline pt-5">
              @if (profile()?.location; as location) {
                <div>
                  <dt class="text-caption-strong text-mute uppercase font-bold tracking-wider">Nơi ở</dt>
                  <dd class="mt-1 text-body-sm font-medium text-ink">{{ location }}</dd>
                </div>
              } @else if (isSelf()) {
                <div>
                  <dt class="text-caption-strong text-mute uppercase font-bold tracking-wider">Nơi ở</dt>
                  <app-empty-field
                    class="mt-1"
                    [isSelf]="true"
                    [selfLabel]="'profile.empty.locationSelf' | translate"
                    [otherLabel]="''"
                    [ctaLabel]="'profile.empty.cta' | translate"
                    focusFragment="location"
                  />
                </div>
              }
              <div>
                <dt class="text-caption-strong text-mute uppercase font-bold tracking-wider">Thành viên từ</dt>
                <dd class="mt-1 text-body-sm font-medium text-ink">{{ joined() }}</dd>
              </div>
              <!-- Chỉ hiện khi biết vai trò này thuộc máy chủ NÀO. Một chức
                   danh trần như "Điều hành viên" không nói lên điều gì: người
                   xem không biết điều hành ở đâu, mà cùng một người có thể mang
                   vai trò khác nhau ở mỗi máy chủ. -->
              @if (request.member.roleName && request.member.roleServer) {
                <div>
                  <dt class="text-caption-strong text-mute uppercase font-bold tracking-wider">
                    Vai trò tại {{ request.member.roleServer }}
                  </dt>
                  <dd class="mt-1 inline-flex items-center gap-2 rounded-full border border-hairline bg-canvas-soft px-3 py-1 text-body-sm font-semibold text-ink">
                    <span
                      aria-hidden="true"
                      class="size-2.5 shrink-0 rounded-full shadow-sm"
                      [style.background-color]="request.member.color ?? 'var(--color-mute)'"
                    ></span>
                    {{ request.member.roleName }}
                  </dd>
                </div>
              }
            </dl>
          </div>

          <!-- Main Content Column -->
          <div class="flex min-w-0 flex-col gap-4 sm:pt-6">
            <section
              aria-labelledby="profile-modal-about"
              class="rounded-xl border border-hairline bg-canvas-soft/60 p-5 backdrop-blur-md"
            >
              <h3 id="profile-modal-about" class="text-caption-strong text-mute uppercase font-bold tracking-wider">
                Giới thiệu
              </h3>
              @if (profile(); as person) {
                @if (person.bio; as bio) {
                  <p class="mt-3 whitespace-pre-line rounded-xl border border-hairline/60 bg-canvas/50 p-3.5 text-body-md leading-relaxed text-body shadow-inner">{{ bio }}</p>
                } @else {
                  <app-empty-field
                    class="mt-3"
                    [isSelf]="isSelf()"
                    [selfLabel]="'profile.empty.bioSelf' | translate"
                    [otherLabel]="'profile.empty.bioOther' | translate"
                    [ctaLabel]="'profile.empty.cta' | translate"
                    focusFragment="bio"
                  />
                }
              } @else if (loading()) {
                <div class="mt-3 animate-pulse space-y-2">
                  <div class="h-3 w-40 rounded bg-canvas-soft"></div>
                  <div class="h-3 w-28 rounded bg-canvas-soft"></div>
                </div>
              } @else {
                <p class="mt-3 text-body-sm text-mute">Người này chưa tạo hồ sơ Nexus.</p>
              }
            </section>

            @if (profile(); as person) {
              <section
                aria-labelledby="profile-modal-links"
                class="rounded-xl border border-hairline bg-canvas-soft/60 p-5 backdrop-blur-md"
              >
                <h3 id="profile-modal-links" class="text-caption-strong text-mute uppercase font-bold tracking-wider">
                  Liên kết mạng xã hội
                </h3>
                @if (person.links.length) {
                  <ul class="mt-3 grid gap-2 sm:grid-cols-2">
                    @for (link of person.links; track link.url) {
                      <li>
                        <a
                          [href]="link.url"
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          class="group flex items-center gap-3 rounded-lg border border-hairline bg-canvas p-3 transition-all hover:border-primary hover:bg-canvas-soft"
                        >
                          <div class="flex size-8 shrink-0 items-center justify-center rounded-md bg-canvas-soft text-primary transition-transform group-hover:scale-110">
                            <svg aria-hidden="true" class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="linkIconPath(link.url)" />
                            </svg>
                          </div>
                          <div class="min-w-0 flex-1">
                            <span class="block truncate text-body-sm-strong font-semibold text-ink group-hover:text-primary">
                              {{ link.label }}
                            </span>
                            <span class="block truncate text-caption text-mute">{{ link.url }}</span>
                          </div>
                        </a>
                      </li>
                    }
                  </ul>
                } @else {
                  <app-empty-field
                    class="mt-3"
                    [isSelf]="isSelf()"
                    [selfLabel]="'profile.empty.linksSelf' | translate"
                    [otherLabel]="'profile.empty.linksOther' | translate"
                    [ctaLabel]="'profile.empty.cta' | translate"
                    focusFragment="links"
                  />
                }
              </section>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class ProfileModalComponent {
  protected readonly cards = inject(ProfileCardService);

  /** Chỉ dựng khi lời mở là kiểu modal — kiểu popover do ProfileCardComponent lo. */
  protected readonly request = computed(() => {
    const current = this.cards.request();
    return current?.variant === 'modal' ? current : null;
  });

  private readonly member = computed(() => this.request()?.member ?? NOBODY);

  private readonly state = injectMemberProfile(this.member);
  protected readonly profile = this.state.profile;
  protected readonly loading = this.state.loading;

  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');

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

  constructor() {
    // effect chứ không phải một lần trong constructor: component này sống suốt
    // vòng đời ứng dụng, chỉ phần trong `@if` mới được dựng lại.
    effect(() => {
      if (this.request()) {
        this.dialog()?.nativeElement.focus();
      }
    });
  }

  /** Esc nghe ở document nên phải tự kiểm tra cửa sổ này có đang mở không. */
  protected closeIfOpen(): void {
    if (this.request()) {
      this.cards.close();
    }
  }

  /**
   * Giữ Tab quẩn trong cửa sổ (WCAG 2.1.2, 2.4.3).
   *
   * Nền phía sau vẫn nằm trong DOM và vẫn Tab tới được; không chặn thì người
   * dùng bàn phím Tab một cái là lạc vào giao diện đang bị lớp phủ che, không
   * còn đường quay lại ngoài việc Tab hết một vòng cả trang.
   */
  // `Event` chứ không phải `KeyboardEvent`: Angular gõ $event của các phím tắt
  // dạng `keydown.tab` là Event. Ở đây chỉ cần preventDefault nên không sao.
  protected trapTab(event: Event, backwards: boolean): void {
    const root = this.dialog()?.nativeElement;
    if (!root) {
      return;
    }

    const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (!focusables.length) {
      // Chưa có gì để nhảy tới thì giữ tiêu điểm ở chính cửa sổ.
      event.preventDefault();
      root.focus();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    // Lúc vừa mở, tiêu điểm nằm ở chính cửa sổ (tabindex="-1"); Shift+Tab từ đó
    // phải vòng xuống cuối chứ không được rơi ra ngoài.
    if (backwards && (active === first || active === root)) {
      event.preventDefault();
      last.focus();
    } else if (!backwards && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
