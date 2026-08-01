import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SearchField } from './search-field';

@Component({
  imports: [SearchField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-search-field placeholder="Tìm kiếm" [(value)]="query" />`,
})
class Host {
  readonly query = signal('');
}

describe('SearchField', () => {
  const mount = async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  };

  it('gõ vào ô thì cập nhật ngược ra ngoài', async () => {
    const fixture = await mount();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    input.value = 'mon';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.query()).toBe('mon');
  });

  it('nút xoá chỉ xuất hiện khi đã có chữ', async () => {
    const fixture = await mount();
    expect(fixture.nativeElement.querySelector('button')).toBeFalsy();

    fixture.componentInstance.query.set('mon');
    fixture.detectChanges();

    const clear = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(clear).toBeTruthy();

    clear.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.query()).toBe('');
  });

  it('không bo tròn hoàn toàn — pill chỉ dành cho thẻ trạng thái', async () => {
    // DESIGN-voltagent.md: "Buttons are tight 6 px rounded rectangles (not pills)".
    const fixture = await mount();
    const box = fixture.nativeElement.querySelector('div') as HTMLElement;

    expect(box.className).toContain('rounded-sm');
    expect(box.className).not.toContain('rounded-pill');
  });
});
