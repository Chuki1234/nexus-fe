import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../directives/reveal.directive';

interface BentoCard {
  readonly icon: string;
  readonly title: string;
  readonly body: string;
}

@Component({
  selector: 'app-landing-bento',
  imports: [RevealDirective],
  templateUrl: './landing-bento.html',
  styleUrl: './landing-bento.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingBento {
  protected readonly cards: readonly BentoCard[] = [
    {
      icon: 'badge',
      title: 'Hồ sơ của riêng bạn',
      body: 'Ảnh đại diện, ảnh bìa, dòng trạng thái và màu sắc riêng — thể hiện cá tính của bạn trong mọi cộng đồng.',
    },
    {
      icon: 'edit_note',
      title: 'Toàn quyền với tin nhắn',
      body: 'Chỉnh sửa, ghim, thu hồi hay chuyển tiếp tin nhắn — chỉ với một thao tác.',
    },
    {
      icon: 'emoji_emotions',
      title: 'Sticker & GIF',
      body: 'Thêm cảm xúc cho cuộc trò chuyện với kho sticker và GIF phong phú.',
    },
    {
      icon: 'shield',
      title: 'Phân quyền linh hoạt',
      body: 'Trao quyền phù hợp cho từng thành viên — ai quản lý, ai trò chuyện — chi tiết đến từng kênh.',
    },
    {
      icon: 'link',
      title: 'Mời thành viên bằng link',
      body: 'Mở rộng cộng đồng bằng link mời, kèm giới hạn lượt dùng và thời hạn tùy chỉnh.',
    },
    {
      icon: 'devices',
      title: 'Nhất quán trên mọi thiết bị',
      body: 'Đăng nhập ở bất cứ đâu vẫn có đúng một trải nghiệm: tin chưa đọc, hội thoại và bạn bè luôn nhất quán.',
    },
  ];
}
