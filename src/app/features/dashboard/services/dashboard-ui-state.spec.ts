import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { DashboardUiState, parseDashboardUiState } from './dashboard-ui-state';

@Component({ template: '' })
class TestRoute {}

describe('DashboardUiState', () => {
  let service: DashboardUiState;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: TestRoute }])],
    });
    service = TestBed.inject(DashboardUiState);
    router = TestBed.inject(Router);
  });

  it('query hợp lệ thành state typed còn giá trị lạ trở về ready', () => {
    expect(parseDashboardUiState('loading')).toBe('loading');
    expect(parseDashboardUiState('offline')).toBe('offline');
    expect(parseDashboardUiState('khong-hop-le')).toBe('ready');
    expect(parseDashboardUiState(null)).toBe('ready');
  });

  it('phân biệt state blocking và banner kết nối', async () => {
    await router.navigateByUrl('/channels/@me?ui-state=error');

    expect(service.state()).toBe('error');
    expect(service.blockingState()).toBe('error');
    expect(service.connectionState()).toBeNull();

    await router.navigateByUrl('/channels/@me?ui-state=reconnecting');

    expect(service.state()).toBe('reconnecting');
    expect(service.blockingState()).toBeNull();
    expect(service.connectionState()).toBe('reconnecting');
  });

  it('clear preview chỉ xoá ui-state và giữ query khác', async () => {
    await router.navigateByUrl('/channels/@me?ui-state=offline&filter=unread');
    await service.clearPreview();

    expect(service.state()).toBe('ready');
    expect(router.url).toContain('filter=unread');
    expect(router.url).not.toContain('ui-state');
  });
});
