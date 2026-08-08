import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

export const DASHBOARD_UI_STATES = [
  'ready',
  'loading',
  'error',
  'offline',
  'reconnecting',
  'forbidden',
  'missing',
] as const;

export type DashboardUiStateName = (typeof DASHBOARD_UI_STATES)[number];
export type DashboardBlockingState = Extract<
  DashboardUiStateName,
  'loading' | 'error' | 'forbidden' | 'missing'
>;
export type DashboardConnectionState = Extract<DashboardUiStateName, 'offline' | 'reconnecting'>;

/** Chuẩn hoá query preview; giá trị lạ luôn trở về giao diện thật. */
export function parseDashboardUiState(value: string | null): DashboardUiStateName {
  return DASHBOARD_UI_STATES.includes(value as DashboardUiStateName)
    ? (value as DashboardUiStateName)
    : 'ready';
}

@Injectable({
  providedIn: 'root',
})
export class DashboardUiState {
  private readonly router = inject(Router);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /**
   * Preview bằng URL để không chèn control phát triển vào toolbar production.
   * Sau này HTTP/socket có thể thay nguồn signal này mà component không cần đổi.
   */
  readonly state = computed(() => {
    const tree = this.router.parseUrl(this.currentUrl());
    return parseDashboardUiState(tree.queryParamMap.get('ui-state'));
  });

  readonly blockingState = computed<DashboardBlockingState | null>(() => {
    const state = this.state();
    return state === 'loading' || state === 'error' || state === 'forbidden' || state === 'missing'
      ? state
      : null;
  });

  readonly connectionState = computed<DashboardConnectionState | null>(() => {
    const state = this.state();
    return state === 'offline' || state === 'reconnecting' ? state : null;
  });

  /** Xoá riêng state preview, giữ nguyên route và các query param khác. */
  clearPreview(): Promise<boolean> {
    const tree = this.router.parseUrl(this.router.url);
    delete tree.queryParams['ui-state'];
    return this.router.navigateByUrl(tree, { replaceUrl: true });
  }
}
