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

  it('không dựng kênh giả khi tài khoản mới chưa có server', async () => {
    const fixture = await mount('server-chua-tai');

    expect(fixture.nativeElement.textContent).toContain('chưa có kênh nào');
    expect(fixture.nativeElement.querySelectorAll('a').length).toBe(0);
    expect(fixture.nativeElement.textContent).not.toContain('Kênh chữ');
    expect(fixture.nativeElement.textContent).not.toContain('Kênh thoại');
  });
});
