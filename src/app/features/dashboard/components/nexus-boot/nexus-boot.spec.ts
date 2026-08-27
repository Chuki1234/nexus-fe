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

  it('dùng status semantics, brand product và không dựng spinner', () => {
    fixture.detectChanges();

    const boot = fixture.nativeElement.querySelector('[data-nexus-boot="angular"]');
    const brandLogo = boot.querySelector('.nexus-boot__brand-logo') as HTMLImageElement;

    expect(component).toBeTruthy();
    expect(boot.getAttribute('role')).toBe('status');
    expect(boot.getAttribute('aria-live')).toBe('polite');
    expect(boot.getAttribute('aria-label')).toBe('Nexus đang tải');
    expect(boot.textContent).toContain('Đang mở không gian trò chuyện');
    expect(brandLogo.getAttribute('src')).toBe('/assets/nexus-brand-transparent.png');
    expect(boot.querySelectorAll('.nexus-boot__beam')).toHaveLength(2);
    expect(boot.querySelector('mat-spinner, svg')).toBeNull();
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
