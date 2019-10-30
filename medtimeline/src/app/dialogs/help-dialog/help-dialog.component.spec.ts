import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {MatDialog, MatDialogRef, MatDividerModule, MatIconModule, MatStepperModule} from '@angular/material';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import {HelpDialogComponent} from './help-dialog.component';

describe('HelpDialogComponent', () => {
  let component: HelpDialogComponent;
  let fixture: ComponentFixture<HelpDialogComponent>;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          declarations: [HelpDialogComponent],
          imports: [
            MatIconModule, MatStepperModule, MatDividerModule,
            BrowserAnimationsModule
          ],
          providers: [
            {provide: MatDialog, useValue: null},
            {provide: MatDialogRef, useValue: null},
          ]
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HelpDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
