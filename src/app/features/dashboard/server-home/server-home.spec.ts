import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DashboardUiState } from '../services/dashboard-ui-state';
import { ServerHomePage } from './server-home';

describe('ServerHomePage', () => {
  const mount = async (state: 'ready' | 'missing' = 'ready') => {
    await TestBed.configureTestingModule({
      imports: [ServerHomePage],
      providers: [
        {
          provide: DashboardUiState,
          useValue: {
            blockingState: signal(state === 'missing' ? 'missing' : null).asReadonly(),
            connectionState: signal(null).asReadonly(),
            clearPreview: async () => true,
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ServerHomePage);
    fixture.detectChanges();
    return fixture;
  };

  it('mời người dùng chọn một kênh thay vì để trống', async () => {
    const fixture = await mount();

    expect(fixture.nativeElement.textContent).toContain('Chọn một kênh để bắt đầu');
  });

  it('có thể hiển thị trạng thái nội dung không còn tồn tại', async () => {
    const fixture = await mount('missing');

    expect(fixture.nativeElement.querySelector('[data-dashboard-state="missing"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeNull();
  });
});
