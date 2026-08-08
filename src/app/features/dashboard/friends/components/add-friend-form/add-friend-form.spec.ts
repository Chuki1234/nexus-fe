import { TestBed } from '@angular/core/testing';
import { AddFriendForm } from './add-friend-form';

describe('AddFriendForm', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddFriendForm],
    }).compileComponents();
  });

  it('không cho gửi khi chưa nhập tên', () => {
    const fixture = TestBed.createComponent(AddFriendForm);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button[type=submit]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('nói rõ chỉ mô phỏng UI sau khi submit hợp lệ', () => {
    const fixture = TestBed.createComponent(AddFriendForm);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'will';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role=status]').textContent).toContain('will');
    expect(fixture.nativeElement.textContent).toContain('chưa gửi dữ liệu');
  });
});
