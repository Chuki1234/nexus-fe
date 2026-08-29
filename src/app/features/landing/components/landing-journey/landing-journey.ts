import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  PLATFORM_ID,
  afterNextRender,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RevealDirective } from '../../directives/reveal.directive';

export interface JourneyStep {
  readonly key: 'dm' | 'server' | 'voice' | 'sync';
  readonly index: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
  readonly bullets: readonly string[];
}

/**
 * "Hành trình trong Nexuscord" — storyboard kể tuần tự 5 bước dùng sản phẩm.
 *
 * Cột trái là các bước cuộn dọc; cột phải là sân khấu dính (sticky) đổi mock UI
 * theo bước đang ở giữa màn hình. Bước active xác định bằng IntersectionObserver
 * (chỉ ở trình duyệt, SSR-safe) — không animate cũng đọc được toàn bộ nội dung.
 */
@Component({
  selector: 'app-landing-journey',
  imports: [RevealDirective],
  templateUrl: './landing-journey.html',
  styleUrl: './landing-journey.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingJourney implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);
  private readonly stepEls = viewChildren<ElementRef<HTMLElement>>('step');
  private observer: IntersectionObserver | null = null;

  protected readonly activeStep = signal(0);

  protected readonly steps: readonly JourneyStep[] = [
    {
      key: 'dm',
      index: '01',
      eyebrow: 'Nhắn tin',
      title: 'Bắt đầu từ một cuộc trò chuyện.',
      body: 'Nhắn tin riêng với bất kỳ ai và chia sẻ mọi thứ: ảnh, video, giọng nói, tài liệu, GIF và sticker. Tin nhắn hiển thị ngay khi bạn gửi — mượt mà và gần gũi như đang trò chuyện trực tiếp.',
      bullets: ['Chia sẻ ảnh, video, tài liệu, GIF, sticker', 'Nhắc tên để gọi đúng người', 'Tin nhắn hiển thị tức thì'],
    },
    {
      key: 'server',
      index: '02',
      eyebrow: 'Cộng đồng',
      title: 'Một không gian riêng cho cả cộng đồng.',
      body: 'Khi cộng đồng lớn dần, máy chủ giúp bạn tổ chức mọi thứ gọn gàng: chia thành các kênh theo chủ đề, kênh trò chuyện và kênh thoại. Kéo-thả để sắp xếp đúng theo cách bạn muốn.',
      bullets: ['Kênh trò chuyện & kênh thoại riêng', 'Kéo-thả sắp xếp linh hoạt', 'Không gian riêng cho mỗi cộng đồng'],
    },
    {
      key: 'voice',
      index: '03',
      eyebrow: 'Thoại & Video',
      title: 'Kết nối bằng giọng nói và hình ảnh.',
      body: 'Tham gia kênh thoại để trò chuyện cùng nhau ngay lập tức — micro, camera và chia sẻ màn hình, tất cả đều mượt mà. Bạn luôn biết ai đang nói, và mỗi phòng có khung chat riêng để trao đổi song song.',
      bullets: ['Gọi thoại & video chất lượng cao', 'Chia sẻ màn hình dễ dàng', 'Khung chat riêng trong mỗi phòng'],
    },
    {
      key: 'sync',
      index: '04',
      eyebrow: 'Luôn cập nhật',
      title: 'Mọi thứ luôn được cập nhật, ở bất cứ đâu.',
      body: 'Ai đang trực tuyến, tin nhắn mới, thông báo chưa đọc — tất cả luôn hiển thị chính xác. Chuyển giữa điện thoại và máy tính, bạn vẫn có đúng một trải nghiệm, không cần tải lại.',
      bullets: ['Biết ngay ai đang trực tuyến', 'Tin nhắn mới hiển thị tức thì', 'Nhất quán trên mọi thiết bị'],
    },
  ];

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    afterNextRender(
      () => {
        const els = this.stepEls();
        if (els.length === 0 || typeof IntersectionObserver === 'undefined') return;

        this.observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              const idx = Number((entry.target as HTMLElement).dataset['idx']);
              if (!Number.isNaN(idx)) this.activeStep.set(idx);
            }
          },
          // Băng hẹp giữa màn hình: bước nào chạm giữa thì thành active.
          { rootMargin: '-48% 0px -48% 0px', threshold: 0 },
        );

        els.forEach((ref) => this.observer?.observe(ref.nativeElement));
      },
      { injector: this.injector },
    );
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
