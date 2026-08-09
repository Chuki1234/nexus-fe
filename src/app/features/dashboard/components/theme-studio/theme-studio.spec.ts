import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { DashboardAtmosphere } from '../../services/dashboard-appearance';
import { ThemeStudio } from './theme-studio';

@Component({
  imports: [ThemeStudio],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <app-theme-studio [(selected)]="selected" /> `,
})
class Host {
  readonly selected = signal<DashboardAtmosphere>('hybrid');
}

describe('ThemeStudio', () => {
  const mount = async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  };

  it('hiển thị sáu bộ màu trong một radiogroup', async () => {
    const fixture = await mount();
    const options = fixture.nativeElement.querySelectorAll('[role="radio"]');

    expect(fixture.nativeElement.querySelector('[role="radiogroup"]')).toBeTruthy();
    expect(options).toHaveLength(6);
    expect(fixture.nativeElement.querySelectorAll('[data-atmosphere-preview]')).toHaveLength(6);
  });

  it('chỉ đánh dấu đúng bộ màu đang chọn', async () => {
    const fixture = await mount();
    const checked = fixture.nativeElement.querySelectorAll('[role="radio"][aria-checked="true"]');

    expect(checked).toHaveLength(1);
    expect(checked[0].getAttribute('data-atmosphere-option')).toBe('hybrid');
  });

  it('phát lựa chọn mới và cập nhật radio semantics', async () => {
    const fixture = await mount();
    const lagoon = fixture.nativeElement.querySelector(
      '[data-atmosphere-option="lagoon"]',
    ) as HTMLButtonElement;

    lagoon.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.selected()).toBe('lagoon');
    expect(lagoon.getAttribute('aria-checked')).toBe('true');
  });
});
