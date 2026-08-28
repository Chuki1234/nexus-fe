import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ProfileLookupService } from '../../../../../core/profile/profile-lookup.service';
import { Profile } from '../../../../../core/profile/profile.models';
import { ProfilePreviewCardComponent } from '../../../../../shared/ui/profile-card/profile-preview-card.component';
import { ServersApiService } from '../../../../../core/api/servers-api.service';
import { ProfileDialogService } from '../../../../profile/profile-dialog.service';
import { resolveInternalLink, type InternalLinkTarget } from '../../utils/internal-link';

/** View-model đã chuẩn hoá cho card máy chủ (dùng chung cho invite & introduction). */
export interface ServerCardVm {
  name: string;
  iconUrl: string | null;
  memberCount: number;
  /** Nhãn dòng phụ: "Lời mời máy chủ" | "Máy chủ". */
  subtitle: string;
  /** routerLink khi bấm vào TÊN server (điều hướng). */
  nameLink: readonly [string, string];
  /** Chỉ card lời mời hợp lệ mới có nút "Tham gia" riêng. */
  showJoin: boolean;
  joinLink: readonly [string, string];
  /** Lời mời hết hạn/hết lượt → không cho tham gia, hiện lý do. */
  invalid: boolean;
  invalidReason: string | null;
  /** Phần "giàu" chỉ có ở card giới thiệu server (introduction) — invite bỏ trống. */
  rich: boolean;
  description: string | null;
  tags: string[];
  onlineCount: number | null;
  /** Nhãn "Thành lập từ …" đã format sẵn, hoặc null. */
  foundedLabel: string | null;
}

const VI_MONTHS = [
  'tháng 1', 'tháng 2', 'tháng 3', 'tháng 4', 'tháng 5', 'tháng 6',
  'tháng 7', 'tháng 8', 'tháng 9', 'tháng 10', 'tháng 11', 'tháng 12',
];

/** ISO → "tháng M YYYY" cho dòng "Thành lập từ". Null nếu không parse được. */
function formatFoundedLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${VI_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Card embed cho link NỘI BỘ Nexus dán trong khung chat.
 *
 * - Hồ sơ `origin/u/:username` → thẻ `app-profile-preview-card` (Phase 3), live
 *   qua `ProfileLookupService`.
 * - Lời mời `origin/invite/:code` → card máy chủ + nút "Tham gia" (Phase 4).
 * - Giới thiệu `origin/channels/:serverId` → card máy chủ + nút "Xem server" (Phase 4).
 *
 * Nơi gọi chỉ truyền URL đã là link; kind không nhận diện được, hoặc dữ liệu
 * không lấy được (không quyền xem / không tồn tại) → component không vẽ gì, link
 * inline trong tin nhắn vẫn còn nguyên.
 */
@Component({
  selector: 'app-chat-link-embed',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    ProfilePreviewCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat-link-embed.html',
  styleUrl: './chat-link-embed.css',
})
export class ChatLinkEmbed {
  private readonly lookup = inject(ProfileLookupService);
  private readonly serversApi = inject(ServersApiService);
  private readonly profileDialog = inject(ProfileDialogService);

  /**
   * Cache dedupe cho card máy chủ (dùng chung mọi instance) — nhiều tin cùng
   * link 1 server/invite chỉ gọi API một lần, giống `ProfileLookupService` cho
   * hồ sơ. Nhớ cả `null` để không lặp lại request hỏng.
   */
  private static readonly serverCache = new Map<string, Promise<ServerCardVm | null>>();

  /** URL nội bộ (đã xác thực là link) của tin nhắn — nguồn duy nhất của embed. */
  readonly url = input.required<string>();

  private readonly target = computed<InternalLinkTarget | null>(() =>
    resolveInternalLink(this.url()),
  );

  /** Nhánh hồ sơ (Phase 3). */
  protected readonly profileUsername = computed(() => {
    const t = this.target();
    return t?.kind === 'profile' ? t.username : null;
  });

  /** Nhánh máy chủ (Phase 4): invite hoặc introduction. */
  protected readonly serverTarget = computed(() => {
    const t = this.target();
    return t && (t.kind === 'server-invite' || t.kind === 'server') ? t : null;
  });

  protected readonly profile = signal<Profile | null>(null);
  protected readonly profileLoading = signal(false);

  protected readonly serverCard = signal<ServerCardVm | null>(null);
  protected readonly serverLoading = signal(false);

  constructor() {
    // Hồ sơ — mirror `injectMemberProfile()`: effect để tái dùng khi URL đổi.
    effect(() => {
      const username = this.profileUsername();
      this.profile.set(null);
      if (!username) {
        this.profileLoading.set(false);
        return;
      }
      this.profileLoading.set(true);
      void this.lookup.lookup(username).then((found) => {
        if (this.profileUsername() === username) {
          this.profile.set(found);
          this.profileLoading.set(false);
        }
      });
    });

    // Máy chủ (invite/introduction).
    effect(() => {
      const target = this.serverTarget();
      this.serverCard.set(null);
      if (!target) {
        this.serverLoading.set(false);
        return;
      }
      const key = target.kind === 'server-invite' ? `invite:${target.code}` : `server:${target.serverId}`;
      this.serverLoading.set(true);
      void this.loadServerCard(target, key).then((vm) => {
        // Có thể đã bị tái dùng cho URL khác trong lúc chờ request.
        if (this.serverCardKey() === key) {
          this.serverCard.set(vm);
          this.serverLoading.set(false);
        }
      });
    });
  }

  /** Bấm vào tên hồ sơ → mở dialog preview (giống nơi khác trong chat). */
  protected openProfileDialog(): void {
    const username = this.profileUsername();
    if (username) {
      this.profileDialog.open(username);
    }
  }

  /** Khoá cache hiện tại của nhánh server — để bỏ kết quả trễ khi URL đã đổi. */
  private serverCardKey(): string | null {
    const t = this.serverTarget();
    if (!t) return null;
    return t.kind === 'server-invite' ? `invite:${t.code}` : `server:${t.serverId}`;
  }

  private loadServerCard(
    target: Extract<InternalLinkTarget, { kind: 'server-invite' | 'server' }>,
    key: string,
  ): Promise<ServerCardVm | null> {
    const cached = ChatLinkEmbed.serverCache.get(key);
    if (cached) return cached;

    const pending =
      target.kind === 'server-invite'
        ? this.serversApi
            .getInvitePreview(target.code)
            .then((p) => {
              const invalid = p.isExpired || p.isMaxUsed || p.status !== 'valid';
              return {
                name: p.serverName,
                iconUrl: p.serverIconUrl,
                memberCount: p.memberCount,
                subtitle: 'Lời mời máy chủ',
                nameLink: ['/invite', p.code] as const,
                showJoin: !invalid,
                joinLink: ['/invite', p.code] as const,
                invalid,
                invalidReason: p.isExpired
                  ? 'Lời mời đã hết hạn'
                  : p.isMaxUsed
                    ? 'Lời mời đã hết lượt dùng'
                    : null,
                rich: false,
                description: null,
                tags: [],
                onlineCount: null,
                foundedLabel: null,
              } satisfies ServerCardVm;
            })
            .catch(() => null)
        : this.serversApi
            .getServerPreview(target.serverId)
            .then((p) => {
              return {
                name: p.name,
                iconUrl: p.iconUrl,
                memberCount: p.memberCount,
                subtitle: 'Máy chủ',
                nameLink: ['/channels', p.serverId] as const,
                showJoin: false,
                joinLink: ['/channels', p.serverId] as const,
                invalid: false,
                invalidReason: null,
                rich: true,
                description: p.description,
                tags: p.tags,
                onlineCount: p.onlineCount,
                foundedLabel: formatFoundedLabel(p.createdAt),
              } satisfies ServerCardVm;
            })
            .catch(() => null);

    ChatLinkEmbed.serverCache.set(key, pending);
    return pending;
  }
}
