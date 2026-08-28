import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MAX_PROFILE_LINKS } from '../../../../../shared';
import { ConnectedAppsService } from '../../../profile/connected-apps.service';
import {
  CATEGORY_LABELS,
  CUSTOM_LINK_COLOR,
  tint,
  type AppPlatform,
  type PlatformCategory,
} from '../../../profile/connected-apps';
import { linkIconFor } from '../../../profile/components/link-icon';
import { PlatformLogo } from '../../../profile/components/platform-logo/platform-logo';
import { ProfileStore } from '../../../profile/profile-store';

/** Một ô trong thước đo hạn mức liên kết. */
interface LinkSlot {
  kind: 'app' | 'link' | 'free';
  /** Màu nền tảng chiếm ô này. Null với liên kết tự do và ô trống. */
  color: string | null;
  label: string;
}

/** Một nhóm nền tảng trong phần "Thêm nền tảng". */
interface PlatformGroup {
  id: string;
  label: string;
  platforms: AppPlatform[];
}

const CATEGORY_ORDER: PlatformCategory[] = ['social', 'gaming', 'creative'];

/**
 * Gắn tài khoản nền tảng ngoài vào hồ sơ Nexus.
 *
 * Mỗi mục ở đây là một liên kết THẬT trên hồ sơ, lưu qua `PATCH /profiles/me` và
 * hiện ngay trên thẻ hồ sơ. Bản trước là danh sách giả trong bộ nhớ kèm hộp
 * thoại "Ủy quyền kết nối" và huy hiệu "Đã xác minh" — Nexus không hề nói
 * chuyện với Steam hay GitHub, nên không có gì để ủy quyền và cũng chẳng xác
 * minh được ai.
 *
 * Ô nhập tên tài khoản KHÔNG render ở đây: nó là một thanh popup neo đáy khung
 * cài đặt, dựng từ `SettingsModal` (xem `settings-modal.html`). Từng render tại
 * chỗ bấm — bấm một nền tảng ở nhóm "Đề xuất" trên đầu danh sách hai chục nền
 * tảng thì ô nhập lại hiện tận cuối trang, phải cuộn mới thấy.
 */
@Component({
  selector: 'app-connections-tab',
  imports: [MatIconModule, PlatformLogo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './connections-tab.html',
  styleUrl: './connections-tab.css',
})
export class ConnectionsTab {
  protected readonly apps = inject(ConnectedAppsService);
  private readonly store = inject(ProfileStore);

  protected readonly maxLinks = MAX_PROFILE_LINKS;
  protected readonly tint = tint;
  protected readonly customColor = CUSTOM_LINK_COLOR;

  /**
   * Hạn mức 5 liên kết vẽ thành 5 ô, mỗi ô mang màu thứ đang chiếm nó.
   *
   * Một dòng chữ "còn 4/5 chỗ" bắt người đọc tự trừ để biết vì sao nút Kết nối
   * sắp không bấm được; năm ô thì nhìn phát thấy ngay — kể cả chuyện liên kết
   * tự do từ trang sửa hồ sơ cũng đang ăn vào cùng hạn mức đó.
   */
  protected readonly slots = computed<LinkSlot[]>(() => {
    const taken: LinkSlot[] = this.apps.rows().map((row) =>
      row.platform
        ? { kind: 'app' as const, color: row.platform.color, label: row.platform.name }
        : { kind: 'link' as const, color: null, label: row.label },
    );

    while (taken.length < this.maxLinks) {
      taken.push({ kind: 'free', color: null, label: 'Còn trống' });
    }
    return taken.slice(0, this.maxLinks);
  });

  /**
   * "Đề xuất" lên đầu, rồi tới các nhóm theo chủ đề.
   *
   * Danh mục đã hơn hai chục nền tảng — đổ hết vào một lưới phẳng thì tìm Zalo
   * phải quét cả màn hình. Nhóm đề xuất chỉ chứa thứ người Việt hay dùng, nên
   * phần lớn người dùng không cần cuộn xuống các nhóm dưới.
   */
  protected readonly groups = computed<PlatformGroup[]>(() => {
    const result: PlatformGroup[] = [];

    const recommended = this.apps.recommended();
    if (recommended.length) {
      result.push({ id: 'recommended', label: 'Đề xuất cho bạn', platforms: recommended });
    }

    for (const category of CATEGORY_ORDER) {
      const platforms = this.apps
        .available()
        .filter((platform) => platform.category === category && !platform.recommended);
      if (platforms.length) {
        result.push({ id: category, label: CATEGORY_LABELS[category], platforms });
      }
    }
    return result;
  });

  constructor() {
    void this.store.ensureLoaded();
  }

  /** Icon cho liên kết tự do, đoán theo tên miền. */
  protected iconFor(url: string): string {
    return linkIconFor(url);
  }

  protected async remove(url: string): Promise<void> {
    await this.apps.remove(url);
  }
}
