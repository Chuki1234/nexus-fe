import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ConversationsApiService } from '../../core/api/conversations-api.service';

/**
 * Mở cuộc trò chuyện riêng với một người, từ bất kỳ chỗ nào có hồ sơ của họ.
 *
 * Lý do phải có: route DM là `@me/:conversationId`, nhưng thẻ hồ sơ chỉ biết
 * `username` và `id` người dùng — hai thứ đó KHÔNG phải id cuộc trò chuyện.
 * Thẻ hồ sơ từng trỏ thẳng `routerLink="['/channels/@me', person.username]"`,
 * nên bấm "Nhắn tin" ra `/channels/@me/lukenguyen` và màn hình báo "Không tìm
 * thấy cuộc trò chuyện này". Phải hỏi `POST /conversations/dm` để lấy (hoặc
 * tạo) cuộc trò chuyện giữa hai người rồi mới điều hướng bằng id thật.
 *
 * KHÔNG `providedIn: 'root'`: mỗi thẻ hồ sơ tự giữ trạng thái "đang mở" và câu
 * lỗi của riêng nó. Dùng chung một bản thì bấm ở thẻ này làm nút ở thẻ kia cũng
 * chuyển sang "Đang mở…".
 */
@Injectable()
export class OpenDm {
  private readonly conversationsApi = inject(ConversationsApiService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog, { optional: true });
  private isDestroyed = false;

  /** Đang chờ backend trả id cuộc trò chuyện. */
  readonly opening = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.isDestroyed = true;
    });
  }

  /** `userId` là id người dùng (`PublicProfile.id`), không phải username. */
  async open(userId: string): Promise<void> {
    if (this.opening() || this.isDestroyed) {
      return;
    }

    this.opening.set(true);
    this.errorMessage.set(null);
    try {
      const conversation = await this.conversationsApi.getOrCreateDm(userId);
      if (this.isDestroyed) return;
      this.dialog?.closeAll();
      await this.router.navigate(['/channels/@me', conversation.id]);
    } catch (err: unknown) {
      if (!this.isDestroyed) {
        const error = err as { error?: { message?: string }; message?: string };
        const message =
          error?.error?.message ||
          error?.message ||
          'Không mở được cuộc trò chuyện. Thử lại sau.';
        this.errorMessage.set(message);
      }
    } finally {
      if (!this.isDestroyed) {
        this.opening.set(false);
      }
    }
  }
}
