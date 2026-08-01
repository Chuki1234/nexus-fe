import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FriendsPage } from './friends.page';

describe('FriendsPage', () => {
  const mount = async () => {
    await TestBed.configureTestingModule({
      imports: [FriendsPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(FriendsPage);
    fixture.detectChanges();
    return fixture;
  };

  const timKiem = (fixture: { nativeElement: HTMLElement }, tu: string) => {
    const input = fixture.nativeElement.querySelector('input[type=search]') as HTMLInputElement;
    input.value = tu;
    input.dispatchEvent(new Event('input'));
  };

  it('mặc định liệt kê tất cả bạn bè kèm số đếm', async () => {
    const fixture = await mount();

    expect(fixture.nativeElement.querySelector('h3').textContent).toContain('Tất cả bạn bè — 6');
  });

  it('lọc theo tên khi gõ vào ô tìm kiếm', async () => {
    const fixture = await mount();
    timKiem(fixture, 'ho_be');
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('app-friend-row');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('ho_be');
  });

  it('không ai khớp thì nói rõ đã tìm từ gì', async () => {
    const fixture = await mount();
    timKiem(fixture, 'khong-co-ai-ten-nay');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('khong-co-ai-ten-nay');
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeTruthy();
  });

  it('tab Trực tuyến loại người đang ngoại tuyến', async () => {
    const fixture = await mount();
    const online = fixture.nativeElement.querySelector(
      '[role=group] button',
    ) as HTMLButtonElement;

    const truoc = fixture.nativeElement.querySelectorAll('app-friend-row').length;
    online.click();
    fixture.detectChanges();
    const sau = fixture.nativeElement.querySelectorAll('app-friend-row').length;

    expect(sau).toBeLessThan(truoc);
  });
});
