import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NexusBoot } from './nexus-boot';

describe('NexusBoot', () => {
  let component: NexusBoot;
  let fixture: ComponentFixture<NexusBoot>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NexusBoot],
    }).compileComponents();

    fixture = TestBed.createComponent(NexusBoot);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('dùng status semantics, Nexus Orbit và không dựng spinner hoặc ảnh nặng', () => {
    fixture.detectChanges();

    const boot = fixture.nativeElement.querySelector('[data-nexus-boot="angular"]');
    expect(component).toBeTruthy();
    expect(boot.getAttribute('role')).toBe('status');
    expect(boot.getAttribute('aria-live')).toBe('polite');
    expect(boot.textContent).toContain('Đang nối không gian của bạn');
    expect(boot.querySelectorAll('.nexus-boot__orbit')).toHaveLength(2);
    expect(boot.querySelectorAll('.nexus-boot__node')).toHaveLength(4);
    expect(boot.querySelectorAll('.nexus-boot__orbit > .nexus-boot__node')).toHaveLength(4);
    expect(boot.querySelector('mat-spinner, img, svg')).toBeNull();
  });

  it('nhận leaving state để chạy exit transition', () => {
    fixture.componentRef.setInput('leaving', true);
    fixture.detectChanges();

    expect(
      fixture.nativeElement
        .querySelector('[data-nexus-boot="angular"]')
        .classList.contains('nexus-boot--leaving'),
    ).toBe(true);
  });
});
