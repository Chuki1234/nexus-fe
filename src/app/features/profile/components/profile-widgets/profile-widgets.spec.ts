import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProfileWidgets } from './profile-widgets';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const fixture = TestBed.createComponent(ProfileWidgets);
  return { fixture, root: fixture.nativeElement as HTMLElement };
}

describe('ProfileWidgets', () => {
  /**
   * Mặc định RỖNG. Component không được tự bịa trò chơi: hồ sơ người khác mà
   * hiện sẵn "The Finals · 142 giờ" thì người xem tưởng đó là dữ liệu thật.
   */
  it('không truyền gì thì hiện trạng thái rỗng, không bịa trò chơi', () => {
    const { fixture, root } = setup();
    fixture.componentRef.setInput('ownerName', 'Luke');
    fixture.detectChanges();

    expect(root.textContent).toContain('Luke chưa khoe trò chơi nào.');
    expect(root.textContent).toContain('Chưa có trò chơi yêu thích nào.');
    expect(root.querySelectorAll('img').length).toBe(0);
  });

  it('hiện trò chơi và nhãn khi được truyền vào', () => {
    const { fixture, root } = setup();
    fixture.componentRef.setInput('rotatingGames', [
      {
        id: 'rotation:valorant',
        kind: 'rotation',
        title: 'VALORANT',
        cover: 'https://x/v.png',
        tags: ['FPS', '684 giờ'],
      },
    ]);
    fixture.componentRef.setInput('likedGames', [
      { id: 'like:elden-ring', kind: 'like', title: 'Elden Ring', cover: 'https://x/e.png', tags: [] },
    ]);
    fixture.detectChanges();

    expect(root.textContent).toContain('VALORANT');
    expect(root.textContent).toContain('684 giờ');
    expect(root.querySelectorAll('img').length).toBe(2);
  });

  /**
   * Bản chỉ đọc: nút xoá trò chơi / xoá nhãn chỉ được có ở tab Cài đặt. Lọt ra
   * trang `/u/:username` thì người xem tưởng mình sửa được hồ sơ người khác.
   */
  it('không có nút xoá nào — đây là bản chỉ đọc', () => {
    const { fixture, root } = setup();
    fixture.componentRef.setInput('rotatingGames', [
      { id: 'rotation:valorant', kind: 'rotation', title: 'VALORANT', cover: 'https://x/v.png', tags: ['FPS'] },
    ]);
    fixture.detectChanges();

    expect(root.textContent).not.toContain('✕');
    expect(root.textContent).not.toContain('+ Tag');
    expect(root.textContent).not.toContain('+ Widget');
  });

  it('hai tab chưa dùng được thì nói thẳng thay vì bày khung rỗng', () => {
    const { fixture, root } = setup();
    fixture.detectChanges();

    const activityTab = [...root.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Hoạt động',
    );
    activityTab?.click();
    fixture.detectChanges();

    expect(root.textContent).toContain('Nhật ký hoạt động chưa dùng được.');
  });
});
