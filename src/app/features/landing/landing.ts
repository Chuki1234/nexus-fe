import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  OnDestroy,
  PLATFORM_ID,
  afterNextRender,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import Lenis from 'lenis';
import { LandingNav } from './components/landing-nav/landing-nav';
import { LandingHero } from './components/landing-hero/landing-hero';
import { LandingLogos } from './components/landing-logos/landing-logos';
import { LandingJourney } from './components/landing-journey/landing-journey';
import { LandingBento } from './components/landing-bento/landing-bento';
import { LandingQuote } from './components/landing-quote/landing-quote';
import { LandingCta } from './components/landing-cta/landing-cta';
import { LandingFooter } from './components/landing-footer/landing-footer';
import { RevealDirective } from './directives/reveal.directive';
import { registerGsap, prefersReducedMotion, gsap, ScrollTrigger } from './animation/gsap-context';

/**
 * Trang landing công khai của Nexus (route gốc khi chưa đăng nhập).
 *
 * Page ráp các section và làm chủ vòng đời smooth-scroll (Lenis) + đồng bộ với
 * GSAP ScrollTrigger. Toàn bộ chỉ chạy ở trình duyệt (SSR-safe): server render
 * tĩnh, hydrate xong mới khởi tạo animation; huỷ sạch khi rời trang.
 *
 * Style theo DESIGN-nexuscord-hybrid (dark deep-teal + xanh MongoDB, mascot tắc kè).
 */
@Component({
  selector: 'app-landing',
  imports: [
    LandingNav,
    LandingHero,
    LandingLogos,
    LandingJourney,
    LandingBento,
    LandingQuote,
    LandingCta,
    LandingFooter,
    RevealDirective,
  ],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);
  private lenis: Lenis | null = null;
  private tickerFn: ((time: number) => void) | null = null;

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    afterNextRender(
      () => {
        registerGsap();

        // Không dùng smooth-scroll khi người dùng bật "giảm chuyển động".
        if (prefersReducedMotion()) return;

        try {
          this.lenis = new Lenis({
            duration: 1.1,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
          });

          // Lenis lái nhịp cuộn → ScrollTrigger phải cập nhật theo mỗi frame.
          this.lenis.on('scroll', () => ScrollTrigger.update());
          this.tickerFn = (time: number) => this.lenis?.raf(time * 1000);
          gsap.ticker.add(this.tickerFn);
          gsap.ticker.lagSmoothing(0);
        } catch {
          // Môi trường không hỗ trợ (test/SSR biên) — bỏ smooth-scroll, trang vẫn chạy.
          this.lenis = null;
        }
      },
      { injector: this.injector },
    );
  }

  ngOnDestroy(): void {
    if (this.tickerFn) {
      gsap.ticker.remove(this.tickerFn);
      this.tickerFn = null;
    }
    this.lenis?.destroy();
    this.lenis = null;
    // Dọn mọi ScrollTrigger của trang để không rò rỉ sang route khác.
    if (isPlatformBrowser(this.platformId)) {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    }
  }
}
