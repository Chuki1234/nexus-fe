import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type CanActivateFn, provideRouter, Router } from '@angular/router';

import {
  NEXUS_BOOT_EXIT_DURATION,
  NEXUS_BOOT_MIN_VISIBLE,
  NEXUS_BOOT_PREVIEW_VISIBLE,
  NEXUS_BOOT_REVEAL_DELAY,
  NexusBootState,
} from './nexus-boot-state';

@Component({ template: '' })
class TestRoute {}

const SLOW_NAVIGATION = 420;
const slowGuard: CanActivateFn = () =>
  new Promise<boolean>((resolve) => setTimeout(() => resolve(true), SLOW_NAVIGATION));

describe('NexusBootState', () => {
  let service: NexusBootState;
  let router: Router;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: TestRoute },
          { path: 'channels/slow', component: TestRoute, canActivate: [slowGuard] },
          { path: 'channels/other', component: TestRoute, canActivate: [slowGuard] },
          { path: 'channels/preview', component: TestRoute },
        ]),
      ],
    });
    service = TestBed.inject(NexusBootState);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('navigation nhanh kết thúc trước reveal delay nên không flash loader', async () => {
    await router.navigateByUrl('/login');
    await vi.advanceTimersByTimeAsync(NEXUS_BOOT_REVEAL_DELAY + 1);

    expect(service.visible()).toBe(false);
  });

  it('navigation chậm hiện loader rồi thoát sau minimum visible time', async () => {
    const navigation = router.navigateByUrl('/channels/slow');

    await vi.advanceTimersByTimeAsync(NEXUS_BOOT_REVEAL_DELAY);
    expect(service.visible()).toBe(true);
    expect(service.leaving()).toBe(false);

    await vi.advanceTimersByTimeAsync(SLOW_NAVIGATION - NEXUS_BOOT_REVEAL_DELAY);
    await navigation;
    await vi.advanceTimersByTimeAsync(NEXUS_BOOT_MIN_VISIBLE + NEXUS_BOOT_EXIT_DURATION);

    expect(service.visible()).toBe(false);
    expect(service.leaving()).toBe(false);
  });

  it('đi từ route ngoài vào Dashboard có loader nhưng đổi kênh nội bộ thì không', async () => {
    await router.navigateByUrl('/login');

    const dashboardEntry = router.navigateByUrl('/channels/slow');
    await vi.advanceTimersByTimeAsync(NEXUS_BOOT_REVEAL_DELAY);
    expect(service.visible()).toBe(true);
    await vi.advanceTimersByTimeAsync(SLOW_NAVIGATION - NEXUS_BOOT_REVEAL_DELAY);
    await dashboardEntry;
    await vi.advanceTimersByTimeAsync(NEXUS_BOOT_MIN_VISIBLE + NEXUS_BOOT_EXIT_DURATION);
    expect(service.visible()).toBe(false);

    const internalNavigation = router.navigateByUrl('/channels/other');
    await vi.advanceTimersByTimeAsync(SLOW_NAVIGATION);
    await internalNavigation;

    expect(service.visible()).toBe(false);
  });

  it('boot-preview=1 giữ hiệu ứng đủ lâu để kiểm tra bằng DevTools', async () => {
    await router.navigateByUrl('/channels/preview?boot-preview=1');

    expect(service.visible()).toBe(true);
    await vi.advanceTimersByTimeAsync(NEXUS_BOOT_PREVIEW_VISIBLE - 1);
    expect(service.leaving()).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(service.leaving()).toBe(true);
    await vi.advanceTimersByTimeAsync(NEXUS_BOOT_EXIT_DURATION);
    expect(service.visible()).toBe(false);
  });
});
