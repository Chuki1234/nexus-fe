import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServersApiService } from '../../../../../../core/api/servers-api.service';
import { InviteChannelDialog, InviteChannelDialogData } from './invite-channel-dialog';

describe('InviteChannelDialog', () => {
  let component: InviteChannelDialog;
  let fixture: ComponentFixture<InviteChannelDialog>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  let mockServersApi: {
    getInviteCandidates: ReturnType<typeof vi.fn>;
    createInviteLink: ReturnType<typeof vi.fn>;
    createDirectInvitation: ReturnType<typeof vi.fn>;
  };

  const mockData: InviteChannelDialogData = {
    serverId: 'srv-1',
    serverName: 'testmaychu',
    channelName: 'chung',
  };

  const mockCandidates = [
    { userId: 'f-1', displayName: 'Lộc Nguyễn', username: 'locnguyen', avatarUrl: null, status: 'online' },
    { userId: 'f-2', displayName: 'Nghiện Khó Phai', username: 'nghienkhophai', avatarUrl: null, status: 'offline' },
  ];

  beforeEach(async () => {
    mockDialogRef = { close: vi.fn() };
    mockServersApi = {
      getInviteCandidates: vi.fn().mockResolvedValue(mockCandidates),
      createInviteLink: vi.fn().mockResolvedValue({
        code: 'wCWvey9XP',
        inviteUrl: 'https://nexuscord.app/invite/wCWvey9XP',
      }),
      createDirectInvitation: vi.fn().mockResolvedValue({ id: 'inv-1' }),
    };

    await TestBed.configureTestingModule({
      imports: [InviteChannelDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: mockData },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: ServersApiService, useValue: mockServersApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InviteChannelDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('phải được tạo thành công và render thông tin máy chủ, kênh', () => {
    expect(component).toBeDefined();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Mời bạn bè vào testmaychu');
    expect(el.textContent).toContain('#chung');
  });

  it('lọc danh sách bạn bè theo từ khóa tìm kiếm', () => {
    component.searchQuery.set('Lộc');
    fixture.detectChanges();
    expect(component.filteredFriends().length).toBe(1);
    expect(component.filteredFriends()[0].displayName).toBe('Lộc Nguyễn');
  });

  it('gửi lời mời trực tiếp và cập nhật trạng thái khi bấm nút Mời', async () => {
    await component.inviteFriend('f-1');
    expect(mockServersApi.createDirectInvitation).toHaveBeenCalledWith('srv-1', 'f-1');
    expect(component.getFriendState('f-1')).toBe('sent');
  });

  it('sao chép liên kết mời thành công', async () => {
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });

    await component.copyLink();
    expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith('https://nexuscord.app/invite/wCWvey9XP');
    expect(component.copied()).toBe(true);
  });
});
