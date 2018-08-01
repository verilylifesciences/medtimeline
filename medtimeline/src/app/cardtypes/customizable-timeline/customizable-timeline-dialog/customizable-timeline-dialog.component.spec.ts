// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MAT_DIALOG_DATA, MatAutocompleteModule, MatButtonModule, MatButtonToggleModule, MatCardModule, MatDatepickerModule, MatDialogModule, MatDialogRef, MatFormFieldModule, MatIconModule, MatInputModule, MatNativeDateModule, MatOptionModule} from '@angular/material';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {DateTime} from 'luxon';

import {CustomizableTimelineDialogComponent} from './customizable-timeline-dialog.component';

describe('CustomizableTimelineDialogComponent', () => {
  let component: CustomizableTimelineDialogComponent;
  let fixture: ComponentFixture<CustomizableTimelineDialogComponent>;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          imports: [
            MatFormFieldModule,
            FormsModule,
            MatDialogModule,
            MatInputModule,
            BrowserAnimationsModule,
            MatIconModule,
            MatDatepickerModule,
            MatOptionModule,
            MatAutocompleteModule,
            MatButtonToggleModule,
            MatButtonModule,
            MatCardModule,
            ReactiveFormsModule,
            MatNativeDateModule,
          ],
          declarations: [CustomizableTimelineDialogComponent],
          providers: [
            {provide: MatDialogRef, useValue: null},
            {provide: MAT_DIALOG_DATA, useValue: DateTime.utc()}
          ]
        })
        .compileComponents();
  }));

  // TODO(b/121256611): Implement testing for the
  // CustomizableTimelineDialogComponent.
  beforeEach(() => {
    fixture = TestBed.createComponent(CustomizableTimelineDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
