import { TestBed } from '@angular/core/testing';
import { AddFriendForm } from './add-friend-form';

describe('AddFriendForm', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddFriendForm],
    }).compileComponents();
  });

  const mount = () => {
    const fixture = TestBed.createComponent(AddFriendForm);
    fixture.detectChanges();
    return fixture;
  };

  it('không cho gửi khi chưa nhập tên hoặc chỉ toàn khoảng trắng', () => {
    const fixture = mount();
    const button = fixture.nativeElement.querySelector(
      'button[type=submit]',
    ) as HTMLButtonElement;

    expect(button.disabled).toBe(true);

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = '   ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(button.disabled).toBe(true);
  });

  it('cho phép nhập chữ hoa, không hiện thông báo lỗi validation inline, tự động chuyển chữ thường khi emit', () => {
    const fixture = mount();
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = '  dfggcvL  ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // Không có mat-error nào xuất hiện
    expect(fixture.nativeElement.querySelector('mat-error')).toBeNull();

    const button = fixture.nativeElement.querySelector(
      'button[type=submit]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(false);

    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(submitted).toHaveBeenCalledWith('dfggcvl');
  });

  it('hiển thị thông báo lỗi từ backend khi không tìm thấy người dùng', () => {
    const fixture = mount();
    fixture.componentRef.setInput('error', 'Không tìm thấy người dùng này.');
    fixture.detectChanges();

    const errorBox = fixture.nativeElement.querySelector('[role=alert]');
    expect(errorBox).toBeTruthy();
    expect(errorBox.textContent).toContain('Không tìm thấy người dùng này.');
  });

  it('khóa gửi khi pending và hiển thị phản hồi thành công', () => {
    const fixture = mount();
    fixture.componentRef.setInput('pending', true);
    fixture.componentRef.setInput('feedback', 'Đã gửi lời mời kết bạn tới @dfggcvl.');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      'button[type=submit]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Đang gửi');
    expect(fixture.nativeElement.querySelector('[role=status]').textContent).toContain(
      'Đã gửi lời mời kết bạn',
    );
  });
});
