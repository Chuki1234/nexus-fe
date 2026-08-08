import { TestBed } from '@angular/core/testing';
import type { ConversationSummary } from '../../../../../core/api/shell-data';
import { FriendRequestItem } from './friend-request-item';

describe('FriendRequestItem', () => {
  const REQUEST: ConversationSummary = {
    id: 'loc-nguyen',
    name: 'Lộc Nguyễn',
    statusMessage: 'Đã gửi lời mời',
    presence: 'idle',
    unread: false,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FriendRequestItem],
    }).compileComponents();
  });

  const mount = () => {
    const fixture = TestBed.createComponent(FriendRequestItem);
    fixture.componentRef.setInput('person', REQUEST);
    fixture.detectChanges();
    return fixture;
  };

  it('hiển thị đúng người gửi lời mời', () => {
    const fixture = mount();
    expect(fixture.nativeElement.textContent).toContain('Lộc Nguyễn');
    expect(
      fixture.nativeElement.querySelector('article').classList.contains('nexus-interactive-row'),
    ).toBe(true);
  });

  it('phát id khi chấp nhận', () => {
    const fixture = mount();
    const accepted = vi.fn();
    fixture.componentInstance.accepted.subscribe(accepted);

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(accepted).toHaveBeenCalledWith('loc-nguyen');
    expect(button.classList.contains('nexus-icon-control')).toBe(true);
  });
});
