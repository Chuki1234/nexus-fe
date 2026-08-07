import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MemberPanel } from './member-panel';

@Component({
  imports: [MemberPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <app-member-panel name="ho_be" [statusMessage]="status()" presence="dnd" /> `,
})
class Host {
  readonly status = signal<string | null>('shut the fckup');
}

describe('MemberPanel', () => {
  const mount = async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  };

  it('hiện tên và câu trạng thái', async () => {
    const fixture = await mount();

    expect(fixture.nativeElement.querySelector('h2').textContent).toContain('ho_be');
    expect(fixture.nativeElement.textContent).toContain('shut the fckup');
  });

  it('không có câu trạng thái thì bỏ hẳn dòng đó', async () => {
    const fixture = await mount();
    fixture.componentInstance.status.set(null);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('shut the fckup');
  });

  it('có avatar kèm chấm trạng thái', async () => {
    const fixture = await mount();

    expect(fixture.nativeElement.querySelector('app-avatar')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-status-dot')).toBeTruthy();
  });
});
