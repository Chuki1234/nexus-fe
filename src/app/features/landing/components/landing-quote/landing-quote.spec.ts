import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LandingQuote } from './landing-quote';

describe('LandingQuote', () => {
  let component: LandingQuote;
  let fixture: ComponentFixture<LandingQuote>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingQuote],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingQuote);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
