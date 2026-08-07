import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StatusDot } from './status-dot';

@Component({
  imports: [StatusDot],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-status-dot [presence]="presence()" />`,
})
class Host {
  readonly presence = signal<'online' | 'idle' | 'dnd' | 'offline'>('online');
}

describe('StatusDot', () => {
  const mount = async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  };

  it('đọc thành nhãn tiếng Việt cho từng trạng thái', async () => {
    const fixture = await mount();
    expect(fixture.nativeElement.textContent).toContain('Trực tuyến');

    fixture.componentInstance.presence.set('dnd');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Không làm phiền');

    fixture.componentInstance.presence.set('offline');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ngoại tuyến');
  });

  it('chỉ trạng thái trực tuyến dùng màu nhấn của brand', async () => {
    // DESIGN-voltagent.md: xanh chỉ dành cho CTA và chỉ báo trạng thái sống.
    const fixture = await mount();
    expect(fixture.nativeElement.querySelector('span').className).toContain('bg-primary');

    fixture.componentInstance.presence.set('idle');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('span').className).not.toContain('bg-primary');
  });
});
