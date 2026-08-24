import { TestBed } from '@angular/core/testing';
import type { FriendRequestPerson } from '../../services/friends-store';
import { FriendRequestItem } from './friend-request-item';

describe('FriendRequestItem', () => {
  const REQUEST: FriendRequestPerson = {
    id: 'loc-nguyen',
    username: 'loc.nguyen',
    name: 'Lộc Nguyễn',
    avatarUrl: null,
    statusMessage: 'Đã gửi lời mời',
    presence: 'idle',
    unread: false,
    requestedAt: '2026-08-22T00:00:00.000Z',
    direction: 'incoming',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FriendRequestItem],
    }).compileComponents();
  });

  const mount = (request: FriendRequestPerson = REQUEST) => {
    const fixture = TestBed.createComponent(FriendRequestItem);
    fixture.componentRef.setInput('person', request);
    fixture.detectChanges();
    return fixture;
  };

  it('hiển thị đúng người gửi lời mời', () => {
    const fixture = mount();
    expect(fixture.nativeElement.textContent).toContain('Lộc Nguyễn');
    expect(fixture.nativeElement.textContent).toContain('@loc.nguyen');
    expect(
      fixture.nativeElement.querySelector('article').classList.contains('nexus-interactive-row'),
    ).toBe(true);
  });

  it('phát id khi chấp nhận lời mời đến', () => {
    const fixture = mount();
    const accepted = vi.fn();
    fixture.componentInstance.accepted.subscribe(accepted);

    const button = fixture.nativeElement.querySelector(
      'button[aria-label^="Chấp nhận"]',
    ) as HTMLButtonElement;
    button.click();

    expect(accepted).toHaveBeenCalledWith('loc-nguyen');
    expect(button.classList.contains('nexus-icon-control')).toBe(true);
  });

  it('lời mời đi chỉ có hành động hủy', () => {
    const fixture = mount({ ...REQUEST, direction: 'outgoing' });

    expect(
      fixture.nativeElement.querySelector('button[aria-label^="Chấp nhận"]'),
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector('button[aria-label^="Hủy lời mời"]'),
    ).toBeTruthy();
  });
});
