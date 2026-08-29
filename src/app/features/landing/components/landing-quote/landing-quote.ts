import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../directives/reveal.directive';

interface Testimonial {
  readonly initials: string;
  readonly hue: string;
  readonly name: string;
  readonly role: string;
  readonly text: string;
}

@Component({
  selector: 'app-landing-quote',
  imports: [RevealDirective],
  templateUrl: './landing-quote.html',
  styleUrl: './landing-quote.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingQuote {
  /** 5 lời chứng thực ngang hàng; Trường Giang đặt ở giữa hàng đầu. */
  protected readonly testimonials: readonly Testimonial[] = [
    {
      initials: 'TT',
      hue: 'var(--color-accent-purple)',
      name: 'tuitentai',
      role: 'Thành viên · Gaming Hub',
      text: '“Kênh thoại gần như không có độ trễ, cả nhóm gọi nhau chơi game vẫn nghe rất rõ.”',
    },
    {
      initials: 'TG',
      hue: 'var(--color-accent-orange)',
      name: 'Trường Giang',
      role: 'Thành viên · DevViệt',
      text: '“Cả cộng đồng chuyển sang Nexus trong một buổi chiều. Tin nhắn tới tức thì, kênh thoại lúc nào cũng sẵn, ai cũng thấy nhau online — như ngồi chung một phòng.”',
    },
    {
      initials: 'LK',
      hue: 'var(--color-accent-blue)',
      name: 'Luke_214',
      role: 'Streamer',
      text: '“Mình chia sẻ màn hình cho cả phòng cùng xem, mượt mà mà không cần cài thêm gì.”',
    },
    {
      initials: 'TD',
      hue: 'var(--color-brand-green-mid)',
      name: 'Triều Dược',
      role: 'Chủ máy chủ · Nexus Study',
      text: '“Chỉ mất 30 giây kéo-thả là sắp xong các kênh. Máy chủ của nhóm mình gọn gàng hẳn.”',
    },
    {
      initials: 'TM',
      hue: 'var(--color-accent-pink)',
      name: 'Thế Mon',
      role: 'Thành viên · Lofi Study',
      text: '“Đổi máy liên tục mà tin nhắn và mục chưa đọc vẫn nhất quán — không bỏ lỡ điều gì.”',
    },
  ];
}
