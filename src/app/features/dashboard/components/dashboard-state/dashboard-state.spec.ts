import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardState } from './dashboard-state';

describe('DashboardState', () => {
  let component: DashboardState;
  let fixture: ComponentFixture<DashboardState>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardState],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardState);
    component = fixture.componentInstance;
  });

  it('loading list dùng skeleton đúng hình dạng và semantics, không dùng spinner', () => {
    fixture.componentRef.setInput('state', 'loading');
    fixture.componentRef.setInput('layout', 'list');
    fixture.detectChanges();

    const state = fixture.nativeElement.querySelector('[data-dashboard-state=loading]');
    expect(state.getAttribute('role')).toBe('status');
    expect(state.getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.querySelectorAll('.skeleton-row')).toHaveLength(5);
    expect(fixture.nativeElement.querySelector('mat-spinner')).toBeNull();
  });

  it('loading chat dựng skeleton timeline thay vì danh sách bạn bè', () => {
    fixture.componentRef.setInput('state', 'loading');
    fixture.componentRef.setInput('layout', 'chat');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.skeleton-message')).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('.skeleton-search')).toBeNull();
  });

  it('error dùng alert, copy cụ thể và phát action thử lại', () => {
    const action = vi.fn();
    fixture.componentInstance.action.subscribe(action);
    fixture.componentRef.setInput('state', 'error');
    fixture.detectChanges();

    const state = fixture.nativeElement.querySelector('[data-dashboard-state=error]');
    const button = state.querySelector('button') as HTMLButtonElement;
    expect(state.getAttribute('role')).toBe('alert');
    expect(state.textContent).toContain('Chưa tải được dữ liệu');
    expect(button.textContent).toContain('Thử lại');

    button.click();
    expect(action).toHaveBeenCalledOnce();
  });

  it('offline là banner gọn và không dựng panel blocking', () => {
    fixture.componentRef.setInput('state', 'offline');
    fixture.detectChanges();

    const state = fixture.nativeElement.querySelector('[data-dashboard-state=offline]');
    expect(state.classList.contains('dashboard-state--banner')).toBe(true);
    expect(state.getAttribute('role')).toBe('status');
    expect(state.textContent).toContain('Nội dung đang mở vẫn xem được');
    expect(fixture.nativeElement.querySelector('.state-panel')).toBeNull();
  });
});
