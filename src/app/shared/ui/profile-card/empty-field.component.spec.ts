import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { EmptyFieldComponent } from './empty-field.component';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideRouter([])],
  });

  const fixture = TestBed.createComponent(EmptyFieldComponent);
  fixture.componentRef.setInput('selfLabel', 'Bạn chưa viết gì.');
  fixture.componentRef.setInput('otherLabel', 'Người này chưa cập nhật.');
  fixture.componentRef.setInput('ctaLabel', 'Thêm ngay');
  return fixture;
}

describe('EmptyFieldComponent', () => {
  it('chủ hồ sơ thấy chữ mời điền kèm nút đi tới trang sửa', () => {
    const fixture = setup();
    fixture.componentRef.setInput('isSelf', true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Bạn chưa viết gì.');
    const link = el.querySelector('a');
    expect(link?.textContent?.trim()).toBe('Thêm ngay');
    expect(link?.getAttribute('href')).toContain('/settings/profile');
  });

  it('người xem không phải chủ chỉ thấy chữ trung tính, KHÔNG có nút sửa', () => {
    const fixture = setup();
    fixture.componentRef.setInput('isSelf', false);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Người này chưa cập nhật.');
    expect(el.textContent).not.toContain('Thêm ngay');
    expect(el.querySelector('a')).toBeNull();
  });

  it('chế độ editing (bảng xem trước) bỏ nút đi tới trang sửa dù đang là chủ', () => {
    const fixture = setup();
    fixture.componentRef.setInput('isSelf', true);
    fixture.componentRef.setInput('editing', true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Bạn chưa viết gì.');
    expect(el.querySelector('a')).toBeNull();
  });

  it('neo đúng fragment khi có focusFragment', () => {
    const fixture = setup();
    fixture.componentRef.setInput('isSelf', true);
    fixture.componentRef.setInput('focusFragment', 'bio');
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector('a');
    expect(link?.getAttribute('href')).toBe('/settings/profile#bio');
  });
});
