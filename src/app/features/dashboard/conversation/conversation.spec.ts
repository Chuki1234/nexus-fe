import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ConversationPage } from './conversation';

describe('ConversationPage', () => {
  const mount = async (id: string) => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'dm/:conversationId', component: ConversationPage }])],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/dm/${id}`);
    return harness;
  };

  it('mở đúng cuộc trò chuyện theo id trên URL', async () => {
    const harness = await mount('ho-be');

    expect(harness.routeNativeElement!.textContent).toContain('ho_be');
    expect(harness.routeNativeElement!.textContent).toContain('shut the fckup');
  });

  it('id không tồn tại thì báo rõ thay vì màn hình trắng', async () => {
    const harness = await mount('khong-co-that');

    expect(harness.routeNativeElement!.textContent).toContain('Không tìm thấy cuộc trò chuyện');
  });
});
