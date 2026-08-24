import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ServersApiService } from '../../../../../../core/api/servers-api.service';
import { ServerCapabilitiesService } from '../../../../../../core/servers/server-capabilities.service';
import { ServersStore } from '../../../../../../core/servers/servers.store';
import { DeleteServerDialog } from './delete-server-dialog';

describe('DeleteServerDialog', () => {
  let component: DeleteServerDialog;
  let fixture: ComponentFixture<DeleteServerDialog>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  let mockServersApi: { deleteServer: ReturnType<typeof vi.fn> };
  let serversStore: ServersStore;
  let capabilitiesService: ServerCapabilitiesService;

  beforeEach(async () => {
    mockDialogRef = { close: vi.fn() };
    mockServersApi = { deleteServer: vi.fn().mockResolvedValue({ success: true, serverId: 'srv-1' }) };

    await TestBed.configureTestingModule({
      imports: [DeleteServerDialog],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { serverId: 'srv-1', serverName: 'Server Test' },
        },
        { provide: ServersApiService, useValue: mockServersApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteServerDialog);
    component = fixture.componentInstance;
    serversStore = TestBed.inject(ServersStore);
    capabilitiesService = TestBed.inject(ServerCapabilitiesService);
    fixture.detectChanges();
  });

  it('phải được tạo thành công', () => {
    expect(component).toBeTruthy();
    expect(component.serverName).toBe('Server Test');
    expect(component.isNameMatched()).toBe(false);
  });

  it('chỉ kích hoạt nút xóa khi nhập chính xác 100% tên máy chủ', () => {
    component.confirmControl.setValue('Server');
    expect(component.isNameMatched()).toBe(false);

    component.confirmControl.setValue('Server Test');
    expect(component.isNameMatched()).toBe(true);
  });

  it('xóa máy chủ thành công và cập nhật store', async () => {
    serversStore.hydrateServers([
      { id: 'srv-1', name: 'Server Test', iconUrl: null, channels: [] },
    ]);
    expect(serversStore.serverOf('srv-1')).toBeDefined();

    component.confirmControl.setValue('Server Test');
    await component.onConfirmDelete();

    expect(mockServersApi.deleteServer).toHaveBeenCalledWith('srv-1');
    expect(serversStore.serverOf('srv-1')).toBeUndefined();
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });

  it('xử lý lỗi khi xóa máy chủ thất bại', async () => {
    mockServersApi.deleteServer.mockRejectedValue(new Error('Lỗi kết nối'));

    component.confirmControl.setValue('Server Test');
    await component.onConfirmDelete();

    expect(component.errorMessage()).toBeTruthy();
    expect(mockDialogRef.close).not.toHaveBeenCalled();
    expect(component.isSubmitting()).toBe(false);
  });
});
