import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LandingLogos } from './landing-logos';

describe('LandingLogos', () => {
  let component: LandingLogos;
  let fixture: ComponentFixture<LandingLogos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingLogos],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingLogos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
