import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShellData } from '../../../../../../core/api/shell-data';
import { InviteChannelDialog, InviteChannelDialogData } from './invite-channel-dialog';

describe('InviteChannelDialog', () => {
  let component: InviteChannelDialog;
  let fixture: ComponentFixture<InviteChannelDialog>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  let mockShellData: {
    conversations: ReturnType<
      typeof signal<
        Array<{ id: string; name: string; statusMessage: string | null; presence: string; unread: boolean }>
      >
    >;
  };

  const mockData: InviteChannelDialogData = {
    serverName: 'testmaychu',
    channelName: 'chung',
  };

  beforeEach(async () => {
    mockDialogRef = { close: vi.fn() };
    mockShellData = {
      conversations: signal([
        { id: 'f-1', name: 'Lộc Nguyễn', statusMessage: null, presence: 'online', unread: false },
        { id: 'f-2', name: 'Nghiện Khó Phai', statusMessage: null, presence: 'offline', unread: false },
      ]),
    };

    await TestBed.configureTestingModule({
      imports: [InviteChannelDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: mockData },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: ShellData, useValue: mockShellData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InviteChannelDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
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
    expect(component.filteredFriends()[0].name).toBe('Lộc Nguyễn');
  });

  it('cập nhật trạng thái invited khi bấm nút Mời', () => {
    component.inviteFriend('f-1');
    const friend = component.friends().find((f) => f.id === 'f-1');
    expect(friend?.invited).toBe(true);
  });

  it('sao chép liên kết mời thành công', async () => {
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });

    await component.copyLink();
    expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith('https://nexus.gg/c/wCWvey9XP');
    expect(component.copied()).toBe(true);
  });
});
