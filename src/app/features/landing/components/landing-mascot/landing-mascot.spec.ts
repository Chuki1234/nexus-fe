import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LandingMascot } from './landing-mascot';

describe('LandingMascot', () => {
  let component: LandingMascot;
  let fixture: ComponentFixture<LandingMascot>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingMascot],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingMascot);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
