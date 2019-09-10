// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {OverlayContainer} from '@angular/cdk/overlay';
import {async, inject, TestBed} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
// tslint:disable-next-line:max-line-length
import {MAT_DIALOG_DATA, MatAutocompleteModule, MatButtonModule, MatButtonToggleModule, MatCardModule, MatDatepickerModule, MatDialog, MatDialogModule, MatDialogRef, MatFormFieldModule, MatIconModule, MatInputModule, MatNativeDateModule, MatOptionModule} from '@angular/material';
import {BrowserDynamicTestingModule} from '@angular/platform-browser-dynamic/testing';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import {DateTime} from 'luxon';
// tslint:disable-next-line:max-line-length
import {CustomizableGraphAnnotation} from 'src/app/graphtypes/customizable-graph/customizable-graph-annotation';

import {CustomizableTimelineDialogComponent} from './customizable-timeline-dialog.component';

describe('CustomizableTimelineDialogComponent', () => {
  let fixture;
  let dialog: MatDialog;
  let overlayContainer: OverlayContainer;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CustomizableTimelineDialogComponent],
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
        MatDialogModule,
        NgbModule,
      ],
      providers: [
        {provide: MAT_DIALOG_DATA, useValue: DateTime.utc()},
        {provide: MatDialogRef, useValue: {}}
      ]

    });

    TestBed.overrideModule(
        BrowserDynamicTestingModule,
        {set: {entryComponents: [CustomizableTimelineDialogComponent]}});

    fixture = TestBed.createComponent(CustomizableTimelineDialogComponent);
    fixture.detectChanges();

    TestBed.compileComponents();
  }));

  beforeEach(inject(
      [MatDialog, OverlayContainer], (d: MatDialog, oc: OverlayContainer) => {
        dialog = d;
        overlayContainer = oc;
      }));

  afterEach(() => {
    overlayContainer.ngOnDestroy();
  });


  it('should create', () => {
    const dialogRef =
        dialog.open(CustomizableTimelineDialogComponent, {data: {}});
    expect(dialogRef).toBeTruthy();
  });

  it('should create annotation object on close', (done: DoneFn) => {
    const dialogRef =
        dialog.open(CustomizableTimelineDialogComponent, {data: {}})
            .componentInstance as CustomizableTimelineDialogComponent;
    dialogRef.userTitle = 'user title';
    dialogRef.userDescription = 'description';
    dialogRef.selectedColor = dialogRef.listOfColors[1];
    dialogRef.dialogRef.afterClosed().subscribe(result => {
      const annotation = result as CustomizableGraphAnnotation;
      expect(annotation.title).toEqual('user title');
      expect(annotation.description).toEqual('description');
      done();
    });
    dialogRef.onSave();
    fixture.detectChanges();
  });

  it('should return blank annotation on cancel', (done: DoneFn) => {
    const dialogRef =
        dialog.open(CustomizableTimelineDialogComponent, {data: {}})
            .componentInstance as CustomizableTimelineDialogComponent;
    dialogRef.date = DateTime.fromISO('2016-05-25T09:08:34.123').toJSDate();
    dialogRef.userTitle = 'user title';
    dialogRef.userDescription = 'description';
    dialogRef.selectedColor = dialogRef.listOfColors[1];
    dialogRef.dialogRef.afterClosed().subscribe(result => {
      const annotation = result as CustomizableGraphAnnotation;
      expect(annotation).toBeUndefined();
      done();
    });
    dialogRef.onCancel();
    fixture.detectChanges();
  });
});
