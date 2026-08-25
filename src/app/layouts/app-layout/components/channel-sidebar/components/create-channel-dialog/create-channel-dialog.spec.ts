import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ServersApiService } from '../../../../../../core/api/servers-api.service';
import { ServersStore } from '../../../../../../core/servers/servers.store';
import {
  CreateChannelDialog,
  CreateChannelDialogData,
} from './create-channel-dialog';

describe('CreateChannelDialog', () => {
  let fixture: ComponentFixture<CreateChannelDialog>;
  let component: CreateChannelDialog;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  let mockServersApi: { createChannel: ReturnType<typeof vi.fn> };
  let serversStore: ServersStore;

  const defaultData: CreateChannelDialogData = {
    serverId: 'server-1',
    serverName: 'ITSS Lab',
    defaultType: 'text',
  };

  const mount = async (data: CreateChannelDialogData = defaultData) => {
    mockDialogRef = { close: vi.fn() };
    mockServersApi = { createChannel: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CreateChannelDialog],
      providers: [
        ServersStore,
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: ServersApiService, useValue: mockServersApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateChannelDialog);
    component = fixture.componentInstance;
    serversStore = TestBed.inject(ServersStore);
    fixture.detectChanges();
    return fixture;
  };

  it('khởi tạo với loại kênh mặc định được truyền vào từ data', async () => {
    await mount({ serverId: 's-1', defaultType: 'voice' });

    expect(component['channelType']()).toBe('voice');
    const radios = fixture.nativeElement.querySelectorAll('[role="radio"]');
    expect(radios[1].getAttribute('aria-checked')).toBe('true');
    expect(radios[0].getAttribute('aria-checked')).toBe('false');
  });

  it('chuyển đổi loại kênh khi click vào radio card', async () => {
    await mount();

    expect(component['channelType']()).toBe('text');

    const voiceRadio = fixture.nativeElement.querySelectorAll('[role="radio"]')[1] as HTMLButtonElement;
    voiceRadio.click();
    fixture.detectChanges();

    expect(component['channelType']()).toBe('voice');
    expect(voiceRadio.getAttribute('aria-checked')).toBe('true');
  });

  it('nút Tạo kênh bị disabled khi tên kênh rỗng', async () => {
    await mount();

    const submitBtn = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it('tự động chuẩn hóa slug cho kênh chữ (khoảng trắng thành dấu gạch ngang)', async () => {
    await mount();

    const input = fixture.nativeElement.querySelector('#create-channel-name-input') as HTMLInputElement;
    input.value = 'Thảo Luận Chung';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component['formattedChannelName']()).toBe('thảo-luận-chung');
    expect(component['isNameValid']()).toBe(true);
  });

  it('tạo kênh thành công gọi serversApi, nạp vào ServersStore và đóng dialog', async () => {
    await mount();

    const mockCreated = {
      id: 'c-new-99',
      name: 'thông-báo-mới',
      type: 'text' as const,
      topic: 'Chủ đề quan trọng',
      unread: false,
      mentionCount: 0,
    };
    mockServersApi.createChannel.mockResolvedValue(mockCreated);

    const nameInput = fixture.nativeElement.querySelector('#create-channel-name-input') as HTMLInputElement;
    nameInput.value = 'thông-báo-mới';
    nameInput.dispatchEvent(new Event('input'));

    const topicInput = fixture.nativeElement.querySelector('#create-channel-topic-input') as HTMLInputElement;
    topicInput.value = 'Chủ đề quan trọng';
    topicInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockServersApi.createChannel).toHaveBeenCalledWith(
      'server-1',
      'thông-báo-mới',
      'text',
      'Chủ đề quan trọng',
    );
    expect(serversStore.channelsOf('server-1')).toContainEqual({
      ...mockCreated,
      categoryId: 'cat-text',
    });
    expect(mockDialogRef.close).toHaveBeenCalledWith({
      ...mockCreated,
      categoryId: 'cat-text',
    });
  });

  it('hiển thị thông báo lỗi inline khi API tạo kênh thất bại', async () => {
    await mount();

    mockServersApi.createChannel.mockRejectedValue(
      new Error('Tên kênh đã tồn tại trong máy chủ này'),
    );

    const nameInput = fixture.nativeElement.querySelector('#create-channel-name-input') as HTMLInputElement;
    nameInput.value = 'trùng-tên';
    nameInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component['errorMessage']()).toContain('Tên kênh đã tồn tại');
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'Tên kênh đã tồn tại',
    );
    expect(mockDialogRef.close).not.toHaveBeenCalled();
  });
});
