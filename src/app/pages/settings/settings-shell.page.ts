import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileApiService } from '../../core/profile/profile-api.service';
import { ProfileLookupService } from '../../core/profile/profile-lookup.service';
import { OwnProfile, profileDisplayName } from '../../core/profile/profile.models';
import { ProfileService } from '../../core/profile/profile.service';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { MOCK_CHANNELS, MOCK_SERVER } from './mock/settings-mock';

interface NavItem {
  /** Đường dẫn tương đối với /settings. */
  path: string;
  labelKey: string;
  /**
   * Thuộc tính `d` của một `<path>` SVG, vẽ trên lưới 24×24.
   *
   * Vẽ tay chứ không kéo thêm một thư viện icon: cả màn cài đặt chỉ cần chừng
   * mười hình, mà thư viện nhẹ nhất cũng đội bundle hơn số đó nhiều lần — bundle
   * hiện đã vượt ngân sách 500 kB rồi.
   */
  icon: string;
}

interface NavGroup {
  labelKey: string;
  /** Tên riêng của máy chủ / kênh, hiện cạnh tên nhóm. */
  subject?: string;
  items: NavItem[];
}

/** Hình vẽ tay trên lưới 24×24, dùng chung `stroke-width` nên nét đồng đều. */
const ICONS = {
  account: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  profile:
    'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',
  appearance:
    'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828L11 18.657',
  language: 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129',
  notifications: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  security: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  overview: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
  access: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  roles: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  invites: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
} as const;

/**
 * Bốn mục giống hệt nhau ở cả máy chủ lẫn kênh — quyền hạn của hai phạm vi được
 * mô hình hoá như nhau, chỉ khác thứ đứng trước dấu gạch trong đường dẫn. Viết
 * một lần rồi ghép tiền tố để hai danh sách không có cơ hội trôi khỏi nhau.
 */
const SCOPED_ITEMS: NavItem[] = [
  { path: 'overview', labelKey: 'settings.nav.overview', icon: ICONS.overview },
  { path: 'access', labelKey: 'settings.nav.access', icon: ICONS.access },
  { path: 'roles', labelKey: 'settings.nav.roles', icon: ICONS.roles },
  { path: 'invites', labelKey: 'settings.nav.invites', icon: ICONS.invites },
];

/**
 * Khung chung của mọi trang cài đặt: thanh bên bên trái, nội dung bên phải.
 *
 * Thanh bên gom cả ba nhóm (người dùng, máy chủ, kênh) vào một chỗ để bản mẫu
 * xem được hết mà không phải dựng thêm màn hình chọn máy chủ.
 */
@Component({
  selector: 'app-settings-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings-shell.page.html',
})
export class SettingsShellPage {
  private readonly auth = inject(AuthService);
  private readonly profile = inject(ProfileService);
  private readonly lookup = inject(ProfileLookupService);
  private readonly api = inject(ProfileApiService);
  private readonly router = inject(Router);

  protected readonly signingOut = signal(false);
  /** Thanh bên trượt vào từ trái ở mobile; trên màn rộng luôn hiện. */
  protected readonly navOpen = signal(false);

  /**
   * Hồ sơ hiện lên đầu thanh bên. Hỏng thì để trống chứ không dựng khối lỗi:
   * đây là phần trang trí của thanh điều hướng, không phải nội dung trang.
   */
  protected readonly me = signal<OwnProfile | null>(null);
  protected readonly myName = computed(() => {
    const person = this.me();
    return person ? profileDisplayName(person) : '';
  });

  protected readonly groups = computed<NavGroup[]>(() => [
    {
      labelKey: 'settings.nav.user',
      items: [
        { path: 'account', labelKey: 'settings.nav.account', icon: ICONS.account },
        { path: 'profile', labelKey: 'settings.nav.profile', icon: ICONS.profile },
        { path: 'appearance', labelKey: 'settings.nav.appearance', icon: ICONS.appearance },
        { path: 'language', labelKey: 'settings.nav.language', icon: ICONS.language },
        {
          path: 'notifications',
          labelKey: 'settings.nav.notifications',
          icon: ICONS.notifications,
        },
        { path: 'security', labelKey: 'settings.nav.security', icon: ICONS.security },
      ],
    },
    {
      labelKey: 'settings.nav.server',
      subject: MOCK_SERVER.name,
      items: SCOPED_ITEMS.map((item) => ({
        ...item,
        path: `server/${MOCK_SERVER.id}/${item.path}`,
      })),
    },
    // Liệt kê cả hai kênh mẫu: một kênh công khai và một kênh riêng. Chỉ có một
    // kênh thì phần "kênh riêng" của bản mẫu không có cách nào xem được.
    ...MOCK_CHANNELS.map((channel) => ({
      labelKey: 'settings.nav.channel',
      subject: `#${channel.name}`,
      items: SCOPED_ITEMS.map((item) => ({
        ...item,
        path: `channel/${channel.id}/${item.path}`,
      })),
    })),
  ]);

  constructor() {
    void this.loadMe();
  }

  protected closeNav(): void {
    this.navOpen.set(false);
  }

  private async loadMe(): Promise<void> {
    try {
      this.me.set(await this.api.getOwn());
    } catch {
      this.me.set(null);
    }
  }

  protected async onSignOut(): Promise<void> {
    this.signingOut.set(true);
    try {
      await this.auth.signOut();
      // Trạng thái "đã có hồ sơ" thuộc về người vừa đăng xuất; giữ lại thì người
      // đăng nhập kế tiếp trên cùng máy sẽ đi qua guard bằng kết quả của người cũ.
      this.profile.reset();
      // Hồ sơ đã tra cũng vậy — trong đó có cờ `isSelf`, vốn đúng theo NGƯỜI ĐANG
      // XEM chứ không theo người được xem. Giữ lại thì người kế tiếp mở thẻ hồ sơ
      // của người cũ sẽ thấy nút "Chỉnh sửa hồ sơ" trên hồ sơ không phải của mình.
      this.lookup.reset();
      await this.router.navigateByUrl('/login');
    } finally {
      this.signingOut.set(false);
    }
  }
}
