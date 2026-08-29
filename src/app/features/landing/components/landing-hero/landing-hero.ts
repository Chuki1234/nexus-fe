import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  PLATFORM_ID,
  afterNextRender,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LandingMascot } from '../landing-mascot/landing-mascot';
import { registerGsap, prefersReducedMotion } from '../../animation/gsap-context';

interface MockMessage {
  readonly author: string;
  readonly initials: string;
  readonly hue: string;
  readonly text: string;
  readonly time: string;
}

@Component({
  selector: 'app-landing-hero',
  imports: [RouterLink, LandingMascot],
  templateUrl: './landing-hero.html',
  styleUrl: './landing-hero.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingHero implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private onPointerMove: ((e: PointerEvent) => void) | null = null;

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    afterNextRender(
      () => {
        if (prefersReducedMotion()) return;
        const gsap = registerGsap();
        const host = this.hostRef.nativeElement;

        // Intro: chữ trôi lên tuần tự + linh vật bật vào.
        const copy = host.querySelectorAll(
          '.eyebrow, .hero__title, .hero__subtitle, .hero__actions, .hero__note',
        );
        gsap.from(copy, {
          y: 26,
          opacity: 0,
          duration: 0.85,
          ease: 'power3.out',
          stagger: 0.12,
        });
        const mascot = host.querySelector('.hero__mascot');
        if (mascot) {
          gsap.from(mascot, { scale: 0.5, opacity: 0, duration: 0.7, delay: 0.5, ease: 'back.out(1.7)' });
        }

        // Parallax nhẹ theo con trỏ: nghiêng mock 3D + trượt các đốm glow.
        const mock = host.querySelector('.mock') as HTMLElement | null;
        const glowA = host.querySelector('.hero__glow--a') as HTMLElement | null;
        const glowB = host.querySelector('.hero__glow--b') as HTMLElement | null;
        if (!mock) return;

        const rotX = gsap.quickTo(mock, 'rotationX', { duration: 0.6, ease: 'power3' });
        const rotY = gsap.quickTo(mock, 'rotationY', { duration: 0.6, ease: 'power3' });
        const gAx = glowA ? gsap.quickTo(glowA, 'x', { duration: 0.9, ease: 'power3' }) : null;
        const gAy = glowA ? gsap.quickTo(glowA, 'y', { duration: 0.9, ease: 'power3' }) : null;
        const gBx = glowB ? gsap.quickTo(glowB, 'x', { duration: 1.1, ease: 'power3' }) : null;
        const gBy = glowB ? gsap.quickTo(glowB, 'y', { duration: 1.1, ease: 'power3' }) : null;

        this.onPointerMove = (e: PointerEvent) => {
          const r = host.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5; // -0.5..0.5
          const py = (e.clientY - r.top) / r.height - 0.5;
          rotY(px * 9);
          rotX(-py * 7);
          gAx?.(px * -30);
          gAy?.(py * -30);
          gBx?.(px * 24);
          gBy?.(py * 24);
        };
        host.addEventListener('pointermove', this.onPointerMove, { passive: true });
      },
      { injector: this.injector },
    );
  }

  ngOnDestroy(): void {
    if (this.onPointerMove) {
      this.hostRef.nativeElement.removeEventListener('pointermove', this.onPointerMove);
      this.onPointerMove = null;
    }
  }

  /** Tin nhắn giả trong mock — đủ 5 thành viên, trôi vào tuần tự lúc trang tải (chỉ CSS). */
  protected readonly messages: readonly MockMessage[] = [
    {
      author: 'Minh Tài',
      initials: 'MT',
      hue: 'var(--color-brand-green-mid)',
      text: 'Mọi người ơi, deploy xong staging rồi nhé 🚀',
      time: '09:41',
    },
    {
      author: 'Triều Dược',
      initials: 'TD',
      hue: 'var(--color-accent-purple)',
      text: 'Ngon quá! Vào test thử ngay đây',
      time: '09:41',
    },
    {
      author: 'Trường Giang',
      initials: 'TG',
      hue: 'var(--color-accent-orange)',
      text: 'Thấy được ai đang online luôn, mượt thật 🔥',
      time: '09:42',
    },
    {
      author: 'Luke_214',
      initials: 'LK',
      hue: 'var(--color-accent-blue)',
      text: 'Tối nay mở kênh thoại chơi không?',
      time: '09:43',
    },
    {
      author: 'Thế Mon',
      initials: 'TM',
      hue: 'var(--color-accent-pink)',
      text: 'Có mình! Vào luôn nha 🎮',
      time: '09:43',
    },
  ];
}
