import {
  Directive,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  input,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { registerGsap, prefersReducedMotion } from '../animation/gsap-context';

/**
 * `[appReveal]` — hiệu ứng lộ dần BÁM THEO VỊ TRÍ CUỘN (scrub), dùng chung cho
 * mọi section của landing. Tiến độ animation gắn thẳng vào scroll giữa `revealStart`
 * và `revealEnd`: cuộn xuống → hiện dần, cuộn ngược lên → thu lại ẩn — như tua
 * video tới/lui. SSR-safe: server render bình thường, chỉ browser mới gắn ScrollTrigger.
 *
 * - `revealY`      : quãng trượt lên (px), mặc định 32
 * - `revealStagger`: nếu > 0, animate các con trực tiếp lần lượt thay vì cả khối
 * - `revealStart`  : điểm bắt đầu hiện (bám scroll), mặc định 'top 90%'
 * - `revealEnd`    : điểm hiện xong (bám scroll), mặc định 'top 55%'
 * - `revealScrub`  : độ "bám" scroll — true = dính chặt, số = làm mượt (mặc định 0.6)
 */
@Directive({
  selector: '[appReveal]',
})
export class RevealDirective {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);
  private readonly platformId = inject(PLATFORM_ID);

  readonly revealY = input<number>(32);
  readonly revealStagger = input<number>(0);
  readonly revealStart = input<string>('top 90%');
  readonly revealEnd = input<string>('top 55%');
  readonly revealScrub = input<number | boolean>(0.6);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    afterNextRender(
      () => {
        const el = this.host.nativeElement;
        if (prefersReducedMotion()) return; // Giữ nguyên hiển thị, không animate.

        const gsap = registerGsap();
        const stagger = this.revealStagger();
        const targets =
          stagger > 0 && el.children.length > 0 ? Array.from(el.children) : el;

        gsap.from(targets as gsap.TweenTarget, {
          opacity: 0,
          y: this.revealY(),
          // Linear để tiến độ ánh xạ THẲNG theo cuộn (cảm giác tua video).
          ease: 'none',
          stagger: stagger > 0 ? stagger : 0,
          scrollTrigger: {
            trigger: el,
            start: this.revealStart(),
            end: this.revealEnd(),
            // scrub: tiến độ gắn vào scroll — cuộn xuống hiện, cuộn lên thu lại.
            scrub: this.revealScrub(),
          },
        });
      },
      { injector: this.injector },
    );
  }
}
