import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LandingNav } from './landing-nav';

describe('LandingNav', () => {
  let component: LandingNav;
  let fixture: ComponentFixture<LandingNav>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingNav],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingNav);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
