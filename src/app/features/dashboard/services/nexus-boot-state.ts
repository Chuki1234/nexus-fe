import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationCancel,
  NavigationCancellationCode,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  NavigationStart,
  Router,
} from '@angular/router';

export const NEXUS_BOOT_REVEAL_DELAY = 160;
export const NEXUS_BOOT_MIN_VISIBLE = 680;
export const NEXUS_BOOT_PREVIEW_VISIBLE = 2400;
export const NEXUS_BOOT_EXIT_DURATION = 220;

@Injectable({
  providedIn: 'root',
})
export class NexusBootState {
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);

  private readonly visibleState = signal(false);
  private readonly leavingState = signal(false);

  readonly visible = this.visibleState.asReadonly();
  readonly leaving = this.leavingState.asReadonly();

  private currentUrl = this.router.url;
  private initialNavigation = !this.router.navigated;
  private cycleActive = false;
  private cycleComplete = false;
  private preview = false;
  private shownAt = 0;
  private revealTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private exitTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (!this.isBrowser) {
      return;
    }

    if (this.initialNavigation) {
      this.startCycle(this.router.url);
    }

    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.onNavigationStart(event.url);
        return;
      }

      if (event instanceof NavigationEnd) {
        this.currentUrl = event.urlAfterRedirects;
        this.initialNavigation = false;
        this.finishCycle();
        return;
      }

      if (event instanceof NavigationCancel) {
        if (
          event.code === NavigationCancellationCode.Redirect ||
          event.code === NavigationCancellationCode.SupersededByNewNavigation
        ) {
          return;
        }
        this.initialNavigation = false;
        this.finishCycle();
        return;
      }

      if (event instanceof NavigationError || event instanceof NavigationSkipped) {
        this.initialNavigation = false;
        this.finishCycle();
      }
    });

    this.destroyRef.onDestroy(() => this.clearTimers());
  }

  private onNavigationStart(nextUrl: string): void {
    if (this.initialNavigation) {
      this.enablePreviewIfRequested(nextUrl);
      return;
    }

    if (this.isDashboardUrl(nextUrl) && !this.isDashboardUrl(this.currentUrl)) {
      this.startCycle(nextUrl);
    }
  }

  private startCycle(url: string): void {
    this.clearTimers();
    this.cycleActive = true;
    this.cycleComplete = false;
    this.preview = this.hasPreviewQuery(url);
    this.shownAt = 0;
    this.visibleState.set(false);
    this.leavingState.set(false);

    if (this.preview) {
      this.reveal();
      return;
    }

    this.revealTimer = setTimeout(() => this.reveal(), NEXUS_BOOT_REVEAL_DELAY);
  }

  private enablePreviewIfRequested(url: string): void {
    if (!this.cycleActive || this.preview || !this.hasPreviewQuery(url)) {
      return;
    }

    this.preview = true;
    this.clearTimer('reveal');
    this.reveal();
  }

  private reveal(): void {
    if (!this.cycleActive || this.visibleState()) {
      return;
    }

    this.clearTimer('reveal');
    this.shownAt = Date.now();
    this.visibleState.set(true);

    if (this.cycleComplete) {
      this.scheduleExit();
    }
  }

  private finishCycle(): void {
    if (!this.cycleActive) {
      return;
    }

    this.cycleComplete = true;
    if (!this.visibleState()) {
      if (this.preview) {
        this.reveal();
      } else {
        this.clearTimer('reveal');
        this.cycleActive = false;
      }
      return;
    }

    this.scheduleExit();
  }

  private scheduleExit(): void {
    if (this.hideTimer || !this.visibleState()) {
      return;
    }

    const minimumVisible = this.preview ? NEXUS_BOOT_PREVIEW_VISIBLE : NEXUS_BOOT_MIN_VISIBLE;
    const remaining = Math.max(0, minimumVisible - (Date.now() - this.shownAt));

    this.hideTimer = setTimeout(() => {
      this.hideTimer = null;
      this.leavingState.set(true);
      this.exitTimer = setTimeout(() => {
        this.exitTimer = null;
        this.visibleState.set(false);
        this.leavingState.set(false);
        this.cycleActive = false;
      }, NEXUS_BOOT_EXIT_DURATION);
    }, remaining);
  }

  private hasPreviewQuery(url: string): boolean {
    return this.router.parseUrl(url).queryParamMap.get('boot-preview') === '1';
  }

  private isDashboardUrl(url: string): boolean {
    return this.router.parseUrl(url).root.children['primary']?.segments[0]?.path === 'channels';
  }

  private clearTimers(): void {
    this.clearTimer('reveal');
    this.clearTimer('hide');
    this.clearTimer('exit');
  }

  private clearTimer(timer: 'reveal' | 'hide' | 'exit'): void {
    const key = `${timer}Timer` as const;
    const handle = this[key];
    if (handle) {
      clearTimeout(handle);
      this[key] = null;
    }
  }
}
