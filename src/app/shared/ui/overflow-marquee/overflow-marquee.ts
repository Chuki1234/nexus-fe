import {
  afterNextRender,
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  NgZone,
  PLATFORM_ID,
  signal,
  ViewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-overflow-marquee',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'overflow-marquee',
    '[class.overflow-marquee--overflowing]': 'isOverflowing()',
    '[style.--overflow-marquee-offset]': 'animationOffset()',
    '[style.--overflow-marquee-duration]': 'animationDuration()',
    '[attr.title]': 'isOverflowing() ? text() : null',
  },
  template: `<span #track class="overflow-marquee__track">{{ text() }}</span>`,
  styleUrl: './overflow-marquee.css',
})
export class OverflowMarquee implements AfterViewInit {
  @ViewChild('track', { static: true }) private readonly track?: ElementRef<HTMLElement>;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private resizeObserver: ResizeObserver | null = null;

  readonly text = input.required<string>();
  readonly pixelsPerSecond = input(38);

  protected readonly isOverflowing = signal(false);
  protected readonly animationOffset = signal('0px');
  protected readonly animationDuration = signal('3s');

  constructor() {
    this.destroyRef.onDestroy(() => this.resizeObserver?.disconnect());
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    afterNextRender(() => {
      this.refresh();
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          this.zone.run(() => this.refresh());
        });
        this.resizeObserver.observe(this.host.nativeElement);
        if (this.track) this.resizeObserver.observe(this.track.nativeElement);
      }
    }, { injector: this.injector });
  }

  /** Recalculate after overlays, fonts, or responsive containers change size. */
  refresh(): void {
    const host = this.host.nativeElement;
    const track = this.track?.nativeElement;
    if (!track) return;

    const distance = Math.max(0, Math.ceil(track.scrollWidth - host.clientWidth));
    const overflowing = distance > 1;
    const speed = Math.max(16, this.pixelsPerSecond());
    const durationMs = Math.max(2600, Math.round((distance / speed) * 1000 + 900));

    this.isOverflowing.set(overflowing);
    this.animationOffset.set(overflowing ? `${-distance}px` : '0px');
    this.animationDuration.set(`${durationMs}ms`);
  }
}