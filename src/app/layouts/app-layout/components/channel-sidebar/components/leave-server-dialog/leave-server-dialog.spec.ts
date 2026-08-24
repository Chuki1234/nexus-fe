import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ServersApiService } from '../../../../../../core/api/servers-api.service';
import { ServerCapabilitiesService } from '../../../../../../core/servers/server-capabilities.service';
import { ServersStore } from '../../../../../../core/servers/servers.store';
import { LeaveServerDialog } from './leave-server-dialog';

describe('LeaveServerDialog', () => {
  let component: LeaveServerDialog;
  let fixture: ComponentFixture<LeaveServerDialog>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  let mockServersApi: { leaveServer: ReturnType<typeof vi.fn> };
  let serversStore: ServersStore;
  let capabilitiesService: ServerCapabilitiesService;

  beforeEach(async () => {
    mockDialogRef = { close: vi.fn() };
    mockServersApi = { leaveServer: vi.fn().mockResolvedValue({ success: true, serverId: 'srv-1', alreadyLeft: false }) };

    await TestBed.configureTestingModule({
      imports: [LeaveServerDialog],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { serverId: 'srv-1', serverName: 'Server Test' },
        },
        { provide: ServersApiService, useValue: mockServersApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LeaveServerDialog);
    component = fixture.componentInstance;
    serversStore = TestBed.inject(ServersStore);
    capabilitiesService = TestBed.inject(ServerCapabilitiesService);
    fixture.detectChanges();
  });

  it('phải được tạo thành công', () => {
    expect(component).toBeTruthy();
    expect(component.serverName).toBe('Server Test');
  });

  it('rời máy chủ thành công và cập nhật store', async () => {
    serversStore.hydrateServers([
      { id: 'srv-1', name: 'Server Test', iconUrl: null, channels: [] },
    ]);
    expect(serversStore.serverOf('srv-1')).toBeDefined();

    await component.onConfirmLeave();

    expect(mockServersApi.leaveServer).toHaveBeenCalledWith('srv-1');
    expect(serversStore.serverOf('srv-1')).toBeUndefined();
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });

  it('xử lý lỗi khi rời máy chủ thất bại (ví dụ Owner cố rời)', async () => {
    mockServersApi.leaveServer.mockRejectedValue(new Error('Chủ sở hữu không thể rời máy chủ'));

    await component.onConfirmLeave();

    expect(component.errorMessage()).toBeTruthy();
    expect(mockDialogRef.close).not.toHaveBeenCalled();
    expect(component.isSubmitting()).toBe(false);
  });
});
