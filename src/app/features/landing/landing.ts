import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LandingNav } from './components/landing-nav/landing-nav';
import { LandingHero } from './components/landing-hero/landing-hero';
import { LandingLogos } from './components/landing-logos/landing-logos';
import { LandingFeatureRow, FeatureRow } from './components/landing-feature-row/landing-feature-row';
import { LandingBento } from './components/landing-bento/landing-bento';
import { LandingQuote } from './components/landing-quote/landing-quote';
import { LandingCta } from './components/landing-cta/landing-cta';
import { LandingFooter } from './components/landing-footer/landing-footer';

/**
 * Trang landing công khai của Nexus (route gốc khi chưa đăng nhập).
 *
 * Đây là codebase nền: page chỉ ráp các section con và giữ dữ liệu tĩnh cho
 * các feature-row. Các thành viên phát triển tiếp bằng cách chỉnh dữ liệu bên
 * dưới hoặc thay markup trong từng section — không nhồi markup chi tiết vào đây.
 *
 * Layout theo campsite.com; style theo DESIGN-nexuscord-hybrid (dark deep-teal).
 * Chuỗi hiển thị hiện hardcode để làm nền — bước i18n (@ngx-translate) là pha sau.
 */
@Component({
  selector: 'app-landing',
  imports: [
    LandingNav,
    LandingHero,
    LandingLogos,
    LandingFeatureRow,
    LandingBento,
    LandingQuote,
    LandingCta,
    LandingFooter,
  ],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing {
  /** Các hàng tính năng xen kẽ trái/phải — cấu trúc nhịp giống campsite. */
  protected readonly features: readonly FeatureRow[] = [
    {
      variant: 'channels',
      anchor: 'features',
      eyebrow: 'Máy chủ & Kênh',
      title: 'Mọi cuộc trò chuyện, đúng chỗ của nó.',
      body: 'Dựng máy chủ cho cộng đồng, chia thành các kênh theo chủ đề. Cấu trúc Máy chủ → Kênh → Tin nhắn giữ mọi thứ gọn gàng khi nhóm lớn dần.',
      bullets: ['Kênh văn bản & giọng nói', 'Danh mục kéo-thả', 'Tin nhắn riêng 1-1'],
      reverse: false,
    },
    {
      variant: 'realtime',
      anchor: 'realtime',
      eyebrow: 'Thời gian thực',
      title: 'Tin nhắn đến ngay khoảnh khắc được gửi.',
      body: 'Socket giữ mọi người cùng nhịp. Giao diện lạc quan hiển thị tin của bạn tức thì, tự đồng bộ khi mạng chập chờn, không bao giờ tạo bản trùng.',
      bullets: ['Hiển thị lạc quan tức thì', 'Tự nối lại khi rớt mạng', 'Trạng thái đã đọc chính xác'],
      reverse: true,
    },
    {
      variant: 'voice',
      eyebrow: 'Voice & Video',
      title: 'Ghé kênh thoại, nghe thấy nhau ngay.',
      body: 'Kênh giọng nói độ trễ thấp cho những buổi trò chuyện ngẫu hứng. Thấy ai đang nói, ai đang nghe — không cần lên lịch, chỉ cần nhấp vào.',
      bullets: ['Âm thanh độ trễ thấp', 'Chỉ báo người đang nói', 'Chia sẻ màn hình'],
      reverse: false,
    },
    {
      variant: 'rbac',
      anchor: 'security',
      eyebrow: 'Phân quyền',
      title: 'Trao đúng quyền cho đúng người.',
      body: 'Vai trò kiểu bitfield tính quyền hiệu lực theo lớp @everyone → vai trò → thành viên. Link mời có hạn dùng và thời hạn để mở cửa cộng đồng an toàn.',
      bullets: ['Vai trò tuỳ chỉnh', 'Ghi đè theo kênh', 'Link mời có kiểm soát'],
      reverse: true,
    },
  ];
}
