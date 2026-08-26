import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { OverflowMarquee } from './overflow-marquee';

@Component({
  imports: [OverflowMarquee],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-overflow-marquee [text]="text()" />`,
})
class Host {
  readonly text = signal('Một nhãn rất dài cần được đọc đầy đủ');
}

describe('OverflowMarquee', () => {
  const mount = async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };

  it('render nguyên văn nội dung để screen reader và title có dữ liệu đầy đủ', async () => {
    const fixture = await mount();
    expect(fixture.nativeElement.textContent).toContain('Một nhãn rất dài cần được đọc đầy đủ');
  });

  it('chỉ bật marquee khi chiều rộng nội dung vượt quá container', async () => {
    const fixture = await mount();
    const debug = fixture.debugElement.query(By.directive(OverflowMarquee));
    const component = debug.componentInstance as OverflowMarquee;
    const host = debug.nativeElement as HTMLElement;
    const track = host.querySelector('.overflow-marquee__track') as HTMLElement;

    Object.defineProperty(host, 'clientWidth', { configurable: true, value: 100 });
    Object.defineProperty(track, 'scrollWidth', { configurable: true, value: 230 });
    component.refresh();
    fixture.detectChanges();

    expect(host.classList.contains('overflow-marquee--overflowing')).toBe(true);
    expect(host.style.getPropertyValue('--overflow-marquee-offset')).toBe('-130px');
    expect(host.getAttribute('title')).toContain('Một nhãn rất dài');
  });

  it('giữ chữ ngắn đứng yên và không tạo tooltip thừa', async () => {
    const fixture = await mount();
    const debug = fixture.debugElement.query(By.directive(OverflowMarquee));
    const component = debug.componentInstance as OverflowMarquee;
    const host = debug.nativeElement as HTMLElement;
    const track = host.querySelector('.overflow-marquee__track') as HTMLElement;

    Object.defineProperty(host, 'clientWidth', { configurable: true, value: 240 });
    Object.defineProperty(track, 'scrollWidth', { configurable: true, value: 120 });
    component.refresh();
    fixture.detectChanges();

    expect(host.classList.contains('overflow-marquee--overflowing')).toBe(false);
    expect(host.getAttribute('title')).toBeNull();
  });
});