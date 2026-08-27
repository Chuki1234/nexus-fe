import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SensitiveMediaGuard } from './sensitive-media-guard';

describe('SensitiveMediaGuard', () => {
  let fixture: ComponentFixture<SensitiveMediaGuard>;
  let component: SensitiveMediaGuard;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SensitiveMediaGuard],
    }).compileComponents();

    fixture = TestBed.createComponent(SensitiveMediaGuard);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('không che khi sensitive=false', () => {
    fixture.componentRef.setInput('sensitive', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sensitive-scrim')).toBeNull();
  });

  it('che khi sensitive=true, và bỏ che sau khi reveal()', () => {
    fixture.componentRef.setInput('sensitive', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sensitive-scrim')).not.toBeNull();

    component['reveal']();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sensitive-scrim')).toBeNull();
  });
});
