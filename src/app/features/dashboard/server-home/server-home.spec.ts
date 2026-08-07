import { TestBed } from '@angular/core/testing';
import { ServerHomePage } from './server-home';

describe('ServerHomePage', () => {
  it('mời người dùng chọn một kênh thay vì để trống', async () => {
    await TestBed.configureTestingModule({ imports: [ServerHomePage] }).compileComponents();
    const fixture = TestBed.createComponent(ServerHomePage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Chọn một kênh để bắt đầu');
  });
});
