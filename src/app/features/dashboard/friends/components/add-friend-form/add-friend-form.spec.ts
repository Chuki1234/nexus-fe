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

  it('không cho gửi khi chưa nhập tên', () => {
    const fixture = mount();
    const button = fixture.nativeElement.querySelector(
      'button[type=submit]',
    ) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
  });

  it('emit username đã chuẩn hóa để page gọi API thật', () => {
    const fixture = mount();
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = '  Will.Test  ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(submitted).toHaveBeenCalledWith('will.test');
    expect(fixture.nativeElement.textContent).toContain(
      'Lời mời sẽ xuất hiện ở mục Chờ duyệt',
    );
  });

  it('khóa gửi khi pending hoặc demo và hiển thị phản hồi API', () => {
    const fixture = mount();
    fixture.componentRef.setInput('pending', true);
    fixture.componentRef.setInput('feedback', 'Đã gửi lời mời.');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      'button[type=submit]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Đang gửi');
    expect(fixture.nativeElement.querySelector('[role=status]').textContent).toContain(
      'Đã gửi lời mời',
    );

    fixture.componentRef.setInput('pending', false);
    fixture.componentRef.setInput('demoMode', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Tắt dữ liệu demo để gửi lời mời thật',
    );
  });
});
