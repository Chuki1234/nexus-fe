import { computed, inject, Injectable, signal } from '@angular/core';
import {
  ProfilesApiService,
  type ProfileImageKind,
} from '../../core/api/profiles-api.service';
import { formatApiError } from '../../core/api/servers-api.service';
import { ProfileStore } from './profile-store';

/**
 * Một thay đổi ảnh đang chờ người dùng bấm "Lưu thay đổi".
 *
 * `file` là ảnh mới; `null` nghĩa là yêu cầu gỡ ảnh hiện có.
 */
interface PendingImage {
  file: File | null;
  /** `blob:` URL để xem trước. Rỗng khi đây là yêu cầu gỡ ảnh. */
  previewUrl: string | null;
}

/**
 * Ảnh hồ sơ đã chọn nhưng CHƯA gửi lên máy chủ.
 *
 * Trước đây chọn ảnh là tải lên ngay, nên thanh "bạn có thay đổi chưa được lưu"
 * không bao giờ hiện cho ảnh — trong khi đổi màu bìa thì có. Hai lối cư xử khác
 * nhau trong cùng một khung cài đặt khiến người dùng không biết đã lưu hay chưa.
 *
 * Nay ảnh cũng xếp hàng chờ như các ô chữ: xem trước ngay bằng `blob:` URL, chỉ
 * thật sự tải lên khi bấm Lưu, và bấm Đặt lại là bỏ hẳn.
 *
 * Đặt ở `features/profile` chứ không nằm trong `UserSettingsService`: ảnh thuộc
 * về hồ sơ, còn màn cài đặt chỉ là một nơi sửa nó.
 */
@Injectable({ providedIn: 'root' })
export class ProfilePendingImages {
  private readonly api = inject(ProfilesApiService);
  private readonly store = inject(ProfileStore);

  private readonly state = signal<Record<ProfileImageKind, PendingImage | null>>({
    avatar: null,
    banner: null,
  });

  /** Lỗi của lần lưu ảnh gần nhất, để khối đổi ảnh hiện lại cho người dùng. */
  readonly errorMessage = signal<string | null>(null);
  readonly saving = signal(false);

  readonly pending = this.state.asReadonly();

  readonly hasPending = computed(() => {
    const map = this.state();
    return map.avatar !== null || map.banner !== null;
  });

  /** Ảnh xem trước của loại này, hoặc `undefined` nếu không có thay đổi chờ. */
  previewFor(kind: ProfileImageKind): string | null | undefined {
    const change = this.state()[kind];
    return change ? change.previewUrl : undefined;
  }

  /**
   * Ảnh mà MỌI chỗ xem trước phải dùng: ảnh đang chờ nếu có, chưa chọn gì thì
   * ảnh đã lưu.
   *
   * Để ở đây thay vì mỗi component tự ghép: thẻ "Xem trước thẻ hồ sơ" từng đọc
   * thẳng `ProfileStore` nên trong lúc ảnh còn chờ lưu nó vẫn khoe ảnh cũ —
   * đúng lúc người dùng cần nhìn ảnh mới nhất thì nó lại là chỗ sai nhất.
   */
  readonly effectiveAvatarUrl = computed(() => this.resolve('avatar'));
  readonly effectiveBannerUrl = computed(() => this.resolve('banner'));

  private resolve(kind: ProfileImageKind): string | null {
    const change = this.state()[kind];
    if (change) {
      return change.previewUrl;
    }
    const profile = this.store.profile();
    return (kind === 'avatar' ? profile?.avatarUrl : profile?.bannerUrl) ?? null;
  }

  /** Chọn ảnh mới. Ghi đè lựa chọn trước đó của cùng loại. */
  stage(kind: ProfileImageKind, file: File): void {
    this.errorMessage.set(null);
    this.replace(kind, { file, previewUrl: URL.createObjectURL(file) });
  }

  /** Hẹn gỡ ảnh hiện có khi lưu. */
  stageRemoval(kind: ProfileImageKind): void {
    this.errorMessage.set(null);
    this.replace(kind, { file: null, previewUrl: null });
  }

  /** Bỏ mọi ảnh đang chờ — dùng cho nút "Đặt lại" và khi đóng phiên. */
  discard(): void {
    const map = this.state();
    this.revoke(map.avatar);
    this.revoke(map.banner);
    this.state.set({ avatar: null, banner: null });
    this.errorMessage.set(null);
  }

  /**
   * Gửi các ảnh đang chờ lên máy chủ.
   *
   * Ném lại lỗi để nơi gọi (nút Lưu) biết đừng xoá dấu "chưa lưu": giữ nguyên
   * hàng chờ thì người dùng bấm Lưu lại được, thay vì mất ảnh vừa chọn.
   */
  async commit(): Promise<void> {
    if (!this.hasPending()) {
      return;
    }

    this.errorMessage.set(null);
    this.saving.set(true);
    try {
      // Tuần tự chứ không song song: mỗi lời gọi trả về TOÀN BỘ hồ sơ mới, chạy
      // song song thì phản hồi về sau sẽ ghi đè mất ảnh của phản hồi về trước.
      for (const kind of ['avatar', 'banner'] as const) {
        const change = this.state()[kind];
        if (!change) {
          continue;
        }
        const updated = change.file
          ? await this.api.uploadImage(kind, change.file)
          : await this.api.removeImage(kind);
        this.store.set(updated);
        this.replace(kind, null);
      }
    } catch (error) {
      this.errorMessage.set(formatApiError(error));
      throw error;
    } finally {
      this.saving.set(false);
    }
  }

  /** Thay một mục và thu hồi `blob:` URL cũ để không rò bộ nhớ. */
  private replace(kind: ProfileImageKind, next: PendingImage | null): void {
    this.state.update((map) => {
      this.revoke(map[kind]);
      return { ...map, [kind]: next };
    });
  }

  private revoke(change: PendingImage | null): void {
    if (change?.previewUrl) {
      URL.revokeObjectURL(change.previewUrl);
    }
  }
}
