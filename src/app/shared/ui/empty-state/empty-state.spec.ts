import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EmptyState } from './empty-state';

@Component({
  imports: [EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-empty-state icon="forum" message="Chưa có gì" [title]="title()" />`,
})
class Host {
  readonly title = signal<string | null>(null);
}

describe('EmptyState', () => {
  const mount = async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  };

  it('hiện icon và câu mô tả', async () => {
    const fixture = await mount();

    expect(fixture.nativeElement.textContent).toContain('forum');
    expect(fixture.nativeElement.textContent).toContain('Chưa có gì');
  });

  it('tiêu đề là tuỳ chọn', async () => {
    const fixture = await mount();
    expect(fixture.nativeElement.querySelector('h2')).toBeFalsy();

    fixture.componentInstance.title.set('Kênh thoại');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2').textContent).toContain('Kênh thoại');
  });

  it('không tự ép h-full và card có lớp phân tách khỏi canvas', async () => {
    const fixture = await mount();
    const host = fixture.nativeElement.querySelector('app-empty-state') as HTMLElement;
    const card = host.firstElementChild as HTMLElement;

    expect(host.classList.contains('h-full')).toBe(false);
    expect(card.classList.contains('border-hairline')).toBe(true);
    expect(card.classList.contains('shadow-glow')).toBe(true);
  });
});
