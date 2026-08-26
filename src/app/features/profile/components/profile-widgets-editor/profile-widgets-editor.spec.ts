import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileWidgetsEditor } from './profile-widgets-editor';

describe('ProfileWidgetsEditor', () => {
  let component: ProfileWidgetsEditor;
  let fixture: ComponentFixture<ProfileWidgetsEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileWidgetsEditor],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileWidgetsEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
