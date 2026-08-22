import { TestBed } from '@angular/core/testing';
import type { ConversationSummary } from '../../../../../core/api/shell-data';
import { ActivityPanel } from './activity-panel';

describe('ActivityPanel', () => {
  const ONLINE: ConversationSummary = {
    id: 'will',
    name: 'Will',
    username: null,
    statusMessage: 'Đang học Angular',
    presence: 'online',
    unread: false,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityPanel],
    }).compileComponents();
  });

  it('hiển thị người đang hoạt động', () => {
    const fixture = TestBed.createComponent(ActivityPanel);
    fixture.componentRef.setInput('people', [ONLINE]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Will');
    expect(fixture.nativeElement.textContent).toContain('Đang học Angular');
    expect(fixture.nativeElement.querySelector('.activity-card')).toBeTruthy();
  });

  it('có empty state khi không ai trực tuyến', () => {
    const fixture = TestBed.createComponent(ActivityPanel);
    fixture.componentRef.setInput('people', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeTruthy();
  });
});
