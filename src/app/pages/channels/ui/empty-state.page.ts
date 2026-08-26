import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Màn hình khi chưa chọn phòng nào — `/channels/@me` không kèm id.
 *
 * Ở màn hẹp, cột danh sách bị ẩn nên đây là chỗ duy nhất người dùng thấy; câu
 * hướng dẫn vì thế phải nói được cả trường hợp đó.
 */
@Component({
  selector: 'app-channels-empty',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Xem ghi chú ở DmLayoutPage: thẻ tuỳ biến mặc định là display:inline.
  host: { class: 'flex min-w-0 flex-1' },
  template: `
    <div class="flex h-dvh min-w-0 flex-1 items-center justify-center bg-canvas px-6">
      <div class="max-w-md text-center">
        <p class="text-eyebrow text-mute uppercase">Nexus</p>
        <h1 class="mt-2 text-display-md text-ink-strong">Chưa chọn cuộc trò chuyện</h1>
        <p class="mt-2 text-body-md text-body">
          Chọn một người ở cột bên trái để nhắn riêng, hoặc bấm một máy chủ ở dải ngoài cùng để vào
          kênh chung.
        </p>
      </div>
    </div>
  `,
})
export class ChannelsEmptyPage {}
