import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LandingFeatureRow } from './landing-feature-row';

describe('LandingFeatureRow', () => {
  let component: LandingFeatureRow;
  let fixture: ComponentFixture<LandingFeatureRow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingFeatureRow],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingFeatureRow);
    fixture.componentRef.setInput('feature', {
      variant: 'channels',
      eyebrow: 'Test',
      title: 'Test',
      body: 'Test',
      bullets: ['a'],
      reverse: false,
    });
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
