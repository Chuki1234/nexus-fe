import { computed, inject, Injectable, signal } from '@angular/core';
import { ProfilesApiService } from '../../core/api/profiles-api.service';
import { formatApiError } from '../../core/api/servers-api.service';
import {
  GAME_KIND_LABELS,
  GAME_TAG_MAX,
  GAME_TITLE_MAX,
  MAX_GAME_TAGS,
  gameLimitFor,
  type ProfileGame,
  type ProfileGameKind,
} from '../../../shared';
import { gameIdFor } from './game-catalog';
import { ProfileStore } from './profile-store';

/**
 * Quản lý danh sách trò chơi trên hồ sơ: thêm, xoá, gắn nhãn.
 *
 * Dựng theo đúng khuôn `ConnectedAppsService` của feature "Ứng dụng đã kết nối"
 * — cũng là danh sách có hạn mức, lưu bằng `PATCH /profiles/me` trả về TOÀN BỘ
 * hồ sơ mới, rồi ghi lại vào `ProfileStore`.
 *
 * KHÔNG giữ kho riêng: danh sách luôn đọc thẳng từ `ProfileStore`. Có kho riêng
 * thì sau mỗi lần lưu phải nhớ đồng bộ hai nơi, quên một lần là thanh người
 * dùng dưới đáy hiện dữ liệu cũ — lỗi đã xảy ra thật trong repo này.
 */
@Injectable({ providedIn: 'root' })
export class ProfileGamesService {
  private readonly api = inject(ProfilesApiService);
  private readonly store = inject(ProfileStore);

  /**
   * Mã của mục đang ghi dở, `null` khi rảnh.
   *
   * Dùng mã chứ không phải boolean để chỉ thẻ ĐANG lưu đổi nhãn, các thẻ khác
   * giữ nguyên — boolean thì cả danh sách cùng nhấp nháy "Đang lưu…".
   */
  readonly busy = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  private readonly games = computed<ProfileGame[]>(() => this.store.profile()?.games ?? []);

  /** Gom sẵn theo widget: `computed` không nhận tham số nên template không gọi hàm lọc được. */
  readonly grouped = computed<Record<ProfileGameKind, ProfileGame[]>>(() => {
    const result: Record<ProfileGameKind, ProfileGame[]> = {
      rotation: [],
      favorite: [],
      like: [],
      wishlist: [],
    };
    for (const game of this.games()) {
      result[game.kind]?.push(game);
    }
    return result;
  });

  /** Còn bao nhiêu chỗ trống ở từng widget — để hiện "còn N chỗ" và khoá nút khi đầy. */
  readonly slotsLeft = computed<Record<ProfileGameKind, number>>(() => {
    const grouped = this.grouped();
    return {
      rotation: gameLimitFor('rotation') - grouped.rotation.length,
      favorite: gameLimitFor('favorite') - grouped.favorite.length,
      like: gameLimitFor('like') - grouped.like.length,
      wishlist: gameLimitFor('wishlist') - grouped.wishlist.length,
    };
  });

  // ── Ô nhập "thêm trò chơi" (render ở cấp SettingsModal, neo đáy khung) ──
  readonly pendingKind = signal<ProfileGameKind | null>(null);
  readonly draftTitle = signal('');
  readonly draftCover = signal('');

  // ── Ô nhập "+ Tag" ──
  readonly taggingId = signal<string | null>(null);
  readonly draftTag = signal('');

  startAdd(kind: ProfileGameKind): void {
    this.resetDrafts();
    if (!this.ensureRoom(kind)) return;
    this.pendingKind.set(kind);
  }

  cancelAdd(): void {
    this.resetDrafts();
  }

  async confirmAdd(): Promise<void> {
    const kind = this.pendingKind();
    if (!kind) return;
    if (await this.add(kind, this.draftTitle(), this.draftCover())) {
      this.resetDrafts();
    }
  }

  startTag(id: string): void {
    this.resetDrafts();
    this.taggingId.set(id);
  }

  cancelTag(): void {
    this.resetDrafts();
  }

  async confirmTag(): Promise<void> {
    const id = this.taggingId();
    if (!id) return;
    if (await this.addTag(id, this.draftTag())) {
      this.resetDrafts();
    }
  }

  /** Dọn mọi ô nhập dở. Gọi khi đóng khung cài đặt hoặc đổi tab. */
  cancelAll(): void {
    this.resetDrafts();
  }

  async add(kind: ProfileGameKind, rawTitle: string, rawCover: string): Promise<boolean> {
    const title = rawTitle.trim();
    const cover = rawCover.trim();

    // Kiểm ở client trước khi tốn một vòng mạng: backend cũng chặn y hệt, nhưng
    // để nó trả 400 thì người dùng phải chờ rồi mới biết mình gõ sai.
    if (!title) {
      this.errorMessage.set('Nhập tên trò chơi.');
      return false;
    }
    if (title.length > GAME_TITLE_MAX) {
      this.errorMessage.set(`Tên trò chơi tối đa ${GAME_TITLE_MAX} ký tự.`);
      return false;
    }
    if (cover && !/^https:\/\/.+\..+/i.test(cover)) {
      this.errorMessage.set('Ảnh bìa phải bắt đầu bằng https:// và là địa chỉ hợp lệ.');
      return false;
    }
    if (!this.ensureRoom(kind)) {
      return false;
    }

    const id = gameIdFor(kind, title);
    if (this.games().some((game) => game.id === id)) {
      this.errorMessage.set(`"${title}" đã có trong ${GAME_KIND_LABELS[kind]}.`);
      return false;
    }

    const next: ProfileGame = { id, kind, title, cover: cover || null, tags: [] };
    return this.save(id, [...this.games(), next]);
  }

  async remove(id: string): Promise<boolean> {
    return this.save(
      id,
      this.games().filter((game) => game.id !== id),
    );
  }

  async addTag(id: string, rawTag: string): Promise<boolean> {
    const tag = rawTag.trim();
    const game = this.games().find((item) => item.id === id);
    if (!game) return false;

    if (!tag) {
      this.errorMessage.set('Nhập nội dung nhãn.');
      return false;
    }
    if (tag.length > GAME_TAG_MAX) {
      this.errorMessage.set(`Nhãn tối đa ${GAME_TAG_MAX} ký tự.`);
      return false;
    }
    if (game.tags.includes(tag)) {
      this.errorMessage.set(`"${game.title}" đã có nhãn này.`);
      return false;
    }
    if (game.tags.length >= MAX_GAME_TAGS) {
      this.errorMessage.set(`Mỗi trò chơi tối đa ${MAX_GAME_TAGS} nhãn.`);
      return false;
    }

    return this.save(
      id,
      this.games().map((item) =>
        item.id === id ? { ...item, tags: [...item.tags, tag] } : item,
      ),
    );
  }

  async removeTag(id: string, tag: string): Promise<boolean> {
    return this.save(
      id,
      this.games().map((item) =>
        item.id === id ? { ...item, tags: item.tags.filter((t) => t !== tag) } : item,
      ),
    );
  }

  private ensureRoom(kind: ProfileGameKind): boolean {
    if (this.slotsLeft()[kind] > 0) {
      return true;
    }
    this.errorMessage.set(
      `Widget "${GAME_KIND_LABELS[kind]}" chỉ chứa được ${gameLimitFor(kind)} trò chơi. ` +
        'Gỡ bớt một cái rồi thử lại.',
    );
    return false;
  }

  private resetDrafts(): void {
    this.pendingKind.set(null);
    this.taggingId.set(null);
    this.draftTitle.set('');
    this.draftCover.set('');
    this.draftTag.set('');
    this.errorMessage.set(null);
  }

  private async save(token: string, games: ProfileGame[]): Promise<boolean> {
    // Trả `false` lặng lẽ khi đang bận — nên template BẮT BUỘC khoá nút theo
    // `busy()`, nếu không người dùng bấm mà không thấy gì xảy ra.
    if (this.busy()) {
      return false;
    }
    this.errorMessage.set(null);
    this.busy.set(token);
    try {
      // `games` thay CẢ danh sách, không phải thêm vào — xem `UpdateProfileRequest`.
      this.store.set(await this.api.update({ games }));
      return true;
    } catch (error) {
      this.errorMessage.set(formatApiError(error));
      return false;
    } finally {
      this.busy.set(null);
    }
  }
}
