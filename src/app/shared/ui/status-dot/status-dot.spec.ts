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

  it('áp dụng đúng mã màu cho từng trạng thái hiện diện', async () => {
    const fixture = await mount();
    // online: emerald/mint (#22c55e)
    expect(fixture.nativeElement.querySelector('span').className).toContain('bg-[#22c55e]');

    fixture.componentInstance.presence.set('idle');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('span').className).toContain('bg-[#f59e0b]');

    fixture.componentInstance.presence.set('dnd');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('span').className).toContain('bg-[#ef4444]');

    fixture.componentInstance.presence.set('offline');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('span').className).toContain('bg-[#64748b]');
  });
});
