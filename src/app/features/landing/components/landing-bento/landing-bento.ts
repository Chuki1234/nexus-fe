import { ChangeDetectionStrategy, Component } from '@angular/core';

interface BentoCard {
  readonly icon: string;
  readonly title: string;
  readonly body: string;
}

@Component({
  selector: 'app-landing-bento',
  imports: [],
  templateUrl: './landing-bento.html',
  styleUrl: './landing-bento.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingBento {
  protected readonly cards: readonly BentoCard[] = [
    {
      icon: 'forum',
      title: 'Tin nhắn riêng',
      body: 'Nhắn 1-1 với bất kỳ ai, tách biệt khỏi máy chủ.',
    },
    {
      icon: 'sensors',
      title: 'Trạng thái hiện diện',
      body: 'Thấy ai đang online, rời đi hay đang bận — cập nhật tức thì.',
    },
    {
      icon: 'done_all',
      title: 'Đã đọc chính xác',
      body: 'Đếm chưa đọc lấy từ read state, đúng cả khi mở nhiều tab.',
    },
    {
      icon: 'emoji_emotions',
      title: 'Sticker',
      body: 'Thêm sắc thái với sticker, kèm ghi nguồn theo nhà cung cấp.',
    },
    {
      icon: 'link',
      title: 'Link mời',
      body: 'Mời thành viên bằng link có hạn dùng và thời hạn rõ ràng.',
    },
    {
      icon: 'notifications_active',
      title: 'Thông báo trong ứng dụng',
      body: 'Huy hiệu và sự kiện socket — không phụ thuộc push bên ngoài.',
    },
  ];
}
