import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SectionLabel } from './section-label';

@Component({
  imports: [SectionLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-section-label text="Tin nhắn trực tiếp">
      <button slot="action" type="button">Thêm</button>
    </app-section-label>
  `,
})
class Host {}

describe('SectionLabel', () => {
  const mount = async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  };

  it('là thẻ tiêu đề để nằm đúng cây heading của trang', async () => {
    const fixture = await mount();

    expect(fixture.nativeElement.querySelector('h3')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Tin nhắn trực tiếp');
  });

  it('nhận nút hành động chiếu vào bên phải', async () => {
    const fixture = await mount();

    expect(fixture.nativeElement.querySelector('h3 button')?.textContent).toContain('Thêm');
  });
});
