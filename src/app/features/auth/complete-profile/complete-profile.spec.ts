import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProfileService } from '../../../core/profile/profile.service';
import { CompleteProfilePage } from './complete-profile';

class ProfileServiceStub {
  complete = vi.fn().mockResolvedValue(undefined);
}

describe('CompleteProfilePage', () => {
  let profile: ProfileServiceStub;

  const mount = async () => {
    profile = new ProfileServiceStub();
    await TestBed.configureTestingModule({
      imports: [CompleteProfilePage],
      providers: [provideRouter([]), { provide: ProfileService, useValue: profile }],
    }).compileComponents();
    const fixture = TestBed.createComponent(CompleteProfilePage);
    fixture.detectChanges();
    return fixture;
  };

  const setInput = (fixture: { nativeElement: HTMLElement }, id: string, value: string) => {
    const input = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  const submit = async (fixture: {
    nativeElement: HTMLElement;
    whenStable: () => Promise<unknown>;
    detectChanges: () => void;
  }) => {
    fixture.nativeElement.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('không gửi gì khi form còn trống', async () => {
    const fixture = await mount();
    await submit(fixture);

    expect(profile.complete).not.toHaveBeenCalled();
  });

  it('chặn tên đăng nhập có ký tự ngoài bộ cho phép', async () => {
    const fixture = await mount();
    setInput(fixture, 'username', 'tên có dấu');
    await submit(fixture);

    expect(profile.complete).not.toHaveBeenCalled();
  });

  it('ô ngày sinh có đủ ba phần ngày / tháng / năm', async () => {
    // OAuth không cung cấp ngày sinh, nên đây là lý do tồn tại của cả trang này.
    const fixture = await mount();
    const selects = fixture.nativeElement.querySelectorAll('select');

    expect(selects.length).toBe(3);
  });
});
