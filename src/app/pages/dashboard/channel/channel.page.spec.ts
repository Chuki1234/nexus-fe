import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ChannelPage } from './channel.page';

describe('ChannelPage', () => {
  const mount = async (path: string) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'c/:serverId/:channelId', component: ChannelPage }]),
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/c/${path}`);
    return harness;
  };

  it('kênh chữ có ô soạn tin', async () => {
    const harness = await mount('itss/do-an');

    expect(harness.routeNativeElement!.textContent).toContain('đồ-án');
    expect(harness.routeNativeElement!.querySelector('app-message-composer')).toBeTruthy();
  });

  it('kênh thoại KHÔNG có ô soạn tin', async () => {
    const harness = await mount('itss/standup');

    expect(harness.routeNativeElement!.textContent).toContain('Chưa có ai trong kênh thoại này');
    expect(harness.routeNativeElement!.querySelector('app-message-composer')).toBeFalsy();
  });

  it('kênh không tồn tại thì báo rõ', async () => {
    const harness = await mount('itss/khong-co-that');

    expect(harness.routeNativeElement!.textContent).toContain('Không tìm thấy kênh này');
  });
});
