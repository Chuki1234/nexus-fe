import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LandingFooter } from './landing-footer';

describe('LandingFooter', () => {
  let component: LandingFooter;
  let fixture: ComponentFixture<LandingFooter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingFooter],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingFooter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
