import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { DirectServerInvitationDto } from '../../../../../../shared/dto/server-invitations.dto';
import { ServerInvitationItem } from './server-invitation-item';

describe('ServerInvitationItem', () => {
  let fixture: ComponentFixture<ServerInvitationItem>;
  let component: ServerInvitationItem;

  const mockInvitation: DirectServerInvitationDto = {
    id: 'inv-1',
    serverId: 'srv-1',
    serverName: 'Nexus Community',
    serverIconUrl: null,
    inviterId: 'user-1',
    inviterUsername: 'nexus_admin',
    inviterDisplayName: 'Nexus Admin',
    inviterAvatarUrl: null,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServerInvitationItem],
    }).compileComponents();

    fixture = TestBed.createComponent(ServerInvitationItem);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('invitation', mockInvitation);
    fixture.detectChanges();
  });

  it('hiển thị đúng tên server và thông tin người mời', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Nexus Community');
    expect(text).toContain('Nexus Admin');
    expect(text).toContain('@nexus_admin');
  });

  it('phát sự kiện accepted khi bấm nút chấp nhận', () => {
    let emitted: DirectServerInvitationDto | null = null;
    component.accepted.subscribe((inv) => {
      emitted = inv;
    });

    const acceptBtn = fixture.nativeElement.querySelector('.nexus-icon-control--accept');
    acceptBtn.click();

    expect(emitted).toEqual(mockInvitation);
  });

  it('phát sự kiện dismissed khi bấm nút từ chối', () => {
    let emitted: DirectServerInvitationDto | null = null;
    component.dismissed.subscribe((inv) => {
      emitted = inv;
    });

    const dismissBtn = fixture.nativeElement.querySelector('.nexus-icon-control--dismiss');
    dismissBtn.click();

    expect(emitted).toEqual(mockInvitation);
  });
});
