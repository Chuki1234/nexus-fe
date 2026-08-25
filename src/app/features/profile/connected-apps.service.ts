import { computed, inject, Injectable, signal } from '@angular/core';
import { ProfilesApiService } from '../../core/api/profiles-api.service';
import { formatApiError } from '../../core/api/servers-api.service';
import { LINK_LABEL_MAX, MAX_PROFILE_LINKS, type ProfileLink } from '../../../shared';
import { prettyUrl } from './components/link-icon';
import {
  APP_PLATFORMS,
  connectedAppFor,
  normalizeHandle,
  platformForLink,
  profileUrlFor,
  type AppPlatform,
} from './connected-apps';
import { ProfileStore } from './profile-store';

/** Một dòng trong danh sách "đang gắn trên hồ sơ". */
export interface LinkRow {
  /** Null = liên kết tự do, không khớp nền tảng nào trong danh mục. */
  platform: AppPlatform | null;
  label: string;
  /** Tên tài khoản khi biết nền tảng; địa chỉ rút gọn với liên kết tự do. */
  handle: string;
  url: string;
}

/**
 * Gắn/gỡ tài khoản nền tảng ngoài vào hồ sơ.
 *
 * Không có kho dữ liệu riêng: một "ứng dụng đã kết nối" CHÍNH LÀ một
 * `ProfileLink` trong hồ sơ thật. Trước đây tab cài đặt giữ một danh sách giả
 * trong bộ nhớ, nên nút "Hiển thị trên hồ sơ" bật lên cũng không có gì xuất
 * hiện trên hồ sơ — hai bên không hề biết nhau.
 *
 * Ghi thẳng chứ không xếp hàng chờ như ảnh: ở đây "Kết nối" và "Gỡ" đã là hành
 * động dứt khoát có nút riêng, không phải ô nhập sửa dần.
 */
@Injectable({ providedIn: 'root' })
export class ConnectedAppsService {
  private readonly api = inject(ProfilesApiService);
  private readonly store = inject(ProfileStore);

  /** Thứ đang có request chạy dở (id nền tảng hoặc URL), để chỉ khoá đúng nó. */
  readonly busy = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  private readonly links = computed<ProfileLink[]>(() => this.store.profile()?.links ?? []);

  /**
   * MỌI liên kết trên hồ sơ, kể cả cái không khớp nền tảng nào.
   *
   * Không lọc bỏ liên kết tự do: chúng vẫn hiện trên thẻ hồ sơ và vẫn ăn hạn
   * mức, nên giấu đi thì người dùng không hiểu vì sao hết chỗ và cũng không có
   * đường nào gỡ chúng từ đây.
   */
  readonly rows = computed<LinkRow[]>(() =>
    this.links().map((link) => {
      const app = connectedAppFor(link);
      return app
        ? { platform: app.platform, label: app.platform.name, handle: app.handle, url: app.url }
        : { platform: null, label: link.label, handle: prettyUrl(link.url), url: link.url };
    }),
  );

  readonly available = computed<AppPlatform[]>(() => {
    const taken = new Set(
      this.rows()
        .map((row) => row.platform?.id)
        .filter((id): id is string => id !== undefined),
    );
    return APP_PLATFORMS.filter((platform) => !taken.has(platform.id));
  });

  readonly recommended = computed(() => this.available().filter((p) => p.recommended));

  /**
   * Liên kết tự do (portfolio, blog…) — của trang sửa hồ sơ hoặc thêm bằng
   * "Nền tảng khác". Ăn chung hạn mức 5 với các nền tảng, nên phải đếm và nói
   * rõ; nếu không người dùng bấm "Kết nối" và nhận lỗi mà không hiểu vì sao.
   */
  readonly otherLinksCount = computed(
    () => this.links().filter((link) => platformForLink(link) === null).length,
  );

  readonly slotsLeft = computed(() => MAX_PROFILE_LINKS - this.links().length);
  readonly isFull = computed(() => this.slotsLeft() <= 0);

  /**
   * Nền tảng đang mở ô nhập tên tài khoản. 'custom' = ô nhập link tự do. Null =
   * không có ô nào mở.
   *
   * Nằm ở service (không phải trong `ConnectionsTab`) vì Ô NHẬP không còn render
   * tại chỗ bấm nữa — nó là một thanh nổi neo đáy khung cài đặt, dựng từ
   * `SettingsModal` để không bị kẹt bên trong vùng cuộn của tab. Bấm nền tảng ở
   * nhóm "Đề xuất" trên đầu danh sách hai chục nền tảng mà ô nhập lại render tận
   * cuối trang thì phải cuộn mới thấy — đúng lỗi đang sửa.
   */
  readonly pending = signal<AppPlatform | 'custom' | null>(null);
  readonly handle = signal('');
  readonly customLabel = signal('');
  readonly customUrl = signal('');

  readonly pendingPlatform = computed(() => {
    const value = this.pending();
    return value === 'custom' || value === null ? null : value;
  });

  /**
   * Gắn một nền tảng. Trả về `true` khi lưu xong.
   *
   * Trả boolean thay vì ném: nơi gọi chỉ cần biết có đóng ô nhập lại hay không,
   * còn câu lỗi thì đã nằm sẵn ở `errorMessage` cho template đọc.
   */
  async connect(platform: AppPlatform, rawHandle: string): Promise<boolean> {
    const handle = normalizeHandle(platform, rawHandle);
    if (!handle) {
      this.errorMessage.set(`Nhập tên tài khoản ${platform.name} của bạn.`);
      return false;
    }
    if (!this.ensureRoom()) {
      return false;
    }

    const next = [
      ...this.links(),
      { label: platform.name, url: profileUrlFor(platform, handle) },
    ];
    return this.save(platform.id, next);
  }

  /**
   * Gắn một địa chỉ bất kỳ — nền tảng không có trong danh mục, blog, portfolio.
   *
   * Chỉ nhận `https://`: backend và ràng buộc dưới database đều từ chối thứ
   * khác, mà `javascript:` thì còn chạy được script khi người xem bấm vào.
   */
  async connectCustom(label: string, rawUrl: string): Promise<boolean> {
    const cleanLabel = label.trim();
    const url = rawUrl.trim();

    if (!cleanLabel) {
      this.errorMessage.set('Đặt tên cho liên kết này.');
      return false;
    }
    if (cleanLabel.length > LINK_LABEL_MAX) {
      this.errorMessage.set(`Tên liên kết tối đa ${LINK_LABEL_MAX} ký tự.`);
      return false;
    }
    if (!/^https:\/\/.+\..+/i.test(url)) {
      this.errorMessage.set('Địa chỉ phải bắt đầu bằng https:// và là một tên miền hợp lệ.');
      return false;
    }
    if (!this.ensureRoom()) {
      return false;
    }

    return this.save(url, [...this.links(), { label: cleanLabel, url }]);
  }

  /** Gỡ một liên kết khỏi hồ sơ, dù nó là nền tảng hay link tự do. */
  async remove(url: string): Promise<boolean> {
    return this.save(
      url,
      this.links().filter((link) => link.url !== url),
    );
  }

  startConnect(platform: AppPlatform): void {
    this.resetDraft();
    this.pending.set(platform);
  }

  startCustom(): void {
    this.resetDraft();
    this.pending.set('custom');
  }

  cancelConnect(): void {
    this.resetDraft();
  }

  async confirmConnect(): Promise<void> {
    const platform = this.pendingPlatform();
    if (!platform) {
      return;
    }
    if (await this.connect(platform, this.handle())) {
      this.resetDraft();
    }
  }

  async confirmCustom(): Promise<void> {
    if (await this.connectCustom(this.customLabel(), this.customUrl())) {
      this.resetDraft();
    }
  }

  private resetDraft(): void {
    this.pending.set(null);
    this.handle.set('');
    this.customLabel.set('');
    this.customUrl.set('');
    this.errorMessage.set(null);
  }

  private ensureRoom(): boolean {
    if (this.isFull()) {
      this.errorMessage.set(
        `Hồ sơ chỉ chứa được ${MAX_PROFILE_LINKS} liên kết. Gỡ bớt một cái rồi thử lại.`,
      );
      return false;
    }
    return true;
  }

  private async save(token: string, links: ProfileLink[]): Promise<boolean> {
    if (this.busy()) {
      return false;
    }
    this.errorMessage.set(null);
    this.busy.set(token);
    try {
      // `links` là thay CẢ danh sách chứ không phải thêm vào — xem
      // `UpdateProfileRequest` trong shared/dto/profile.ts.
      this.store.set(await this.api.update({ links }));
      return true;
    } catch (error) {
      this.errorMessage.set(formatApiError(error));
      return false;
    } finally {
      this.busy.set(null);
    }
  }
}
