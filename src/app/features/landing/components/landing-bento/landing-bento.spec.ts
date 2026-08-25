import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LandingBento } from './landing-bento';

describe('LandingBento', () => {
  let component: LandingBento;
  let fixture: ComponentFixture<LandingBento>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingBento],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingBento);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
