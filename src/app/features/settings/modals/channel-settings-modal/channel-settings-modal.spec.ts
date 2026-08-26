import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChannelSummary } from '../../../../core/servers/server.models';
import { ServersStore } from '../../../../core/servers/servers.store';
import { ServersApiService } from '../../../../core/api/servers-api.service';
import { ChannelSettingsModal, ChannelSettingsModalData } from './channel-settings-modal';

describe('ChannelSettingsModal', () => {
  let component: ChannelSettingsModal;
  let fixture: ComponentFixture<ChannelSettingsModal>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  let mockServersApi: {
    updateChannel: ReturnType<typeof vi.fn>;
    deleteChannel: ReturnType<typeof vi.fn>;
  };
  let serversStore: ServersStore;

  const mockChannel: ChannelSummary = {
    id: 'chn-1',
    name: 'tuitentai',
    type: 'text',
    topic: 'Kênh trò chuyện chung',
    unread: false,
    mentionCount: 0,
  };

  const mockData: ChannelSettingsModalData = {
    channel: mockChannel,
    serverId: 'srv-1',
  };

  beforeEach(async () => {
    mockDialogRef = { close: vi.fn() };
    mockServersApi = {
      updateChannel: vi.fn().mockResolvedValue({
        id: 'chn-1',
        name: 'tuitentai-pro',
        type: 'text',
        topic: 'Chủ đề mới',
      }),
      deleteChannel: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [ChannelSettingsModal],
      providers: [
        ServersStore,
        { provide: MAT_DIALOG_DATA, useValue: mockData },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: ServersApiService, useValue: mockServersApi },
      ],
    }).compileComponents();

    serversStore = TestBed.inject(ServersStore);
    serversStore.setChannels('srv-1', [mockChannel]);

    fixture = TestBed.createComponent(ChannelSettingsModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('phải được tạo thành công và render tên kênh trong form Tổng quan', () => {
    expect(component).toBeDefined();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Tổng quan');
    expect(component.channelName()).toBe('tuitentai');
  });

  it('phát hiện dirty khi người dùng thay đổi tên kênh', () => {
    expect(component.isDirty()).toBe(false);
    component.channelName.set('tuitentai-vip');
    fixture.detectChanges();
    expect(component.isDirty()).toBe(true);
  });

  it('resetChanges khôi phục lại giá trị ban đầu của kênh', () => {
    component.channelName.set('tuitentai-moi');
    component.resetChanges();
    expect(component.channelName()).toBe('tuitentai');
    expect(component.isDirty()).toBe(false);
  });

  it('saveChanges gọi serversApi.updateChannel và cập nhật ServersStore', async () => {
    component.channelName.set('tuitentai-pro');
    component.channelTopic.set('Chủ đề mới');
    await component.saveChanges();

    expect(mockServersApi.updateChannel).toHaveBeenCalledWith('srv-1', 'chn-1', {
      name: 'tuitentai-pro',
      topic: 'Chủ đề mới',
    });
    expect(component.saveNotice()).toContain('Đã lưu thay đổi');
  });
});
