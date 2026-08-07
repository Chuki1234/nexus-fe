import { TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ChannelList } from './channel-list';

describe('ChannelList', () => {
  const mount = async (serverId: string) => {
    await TestBed.configureTestingModule({
      imports: [ChannelList],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(ChannelList);
    (fixture.componentRef as ComponentRef<ChannelList>).setInput('serverId', serverId);
    fixture.detectChanges();
    return fixture;
  };

  it('nhóm kênh theo loại và đặt tiêu đề cho từng nhóm', async () => {
    const fixture = await mount('itss');

    expect(fixture.nativeElement.textContent).toContain('Kênh chữ');
    expect(fixture.nativeElement.textContent).toContain('Kênh thoại');
    expect(fixture.nativeElement.textContent).toContain('đồ-án');
    expect(fixture.nativeElement.textContent).toContain('Standup');
  });

  it('bỏ hẳn tiêu đề của nhóm rỗng', async () => {
    // 'peak' chỉ có kênh chữ — hiện tiêu đề "Kênh thoại" trên danh sách trống là rác.
    const fixture = await mount('peak');

    expect(fixture.nativeElement.textContent).toContain('Kênh chữ');
    expect(fixture.nativeElement.textContent).not.toContain('Kênh thoại');
  });

  it('server không tồn tại thì nói rõ thay vì để trống', async () => {
    const fixture = await mount('khong-co-that');

    expect(fixture.nativeElement.textContent).toContain('chưa có kênh nào');
  });
});
