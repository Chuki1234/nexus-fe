import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { NexusBootState } from './features/dashboard/services/nexus-boot-state';

describe('App', () => {
  const visible = signal(false);
  const leaving = signal(false);

  beforeEach(async () => {
    visible.set(false);
    leaving.set(false);
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: NexusBootState,
          useValue: { visible: visible.asReadonly(), leaving: leaving.asReadonly() },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('chỉ gắn NexusBoot vào root khi state yêu cầu', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-nexus-boot')).toBeNull();

    visible.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-nexus-boot')).toBeTruthy();

    leaving.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.nexus-boot--leaving')).toBeTruthy();
  });
});
