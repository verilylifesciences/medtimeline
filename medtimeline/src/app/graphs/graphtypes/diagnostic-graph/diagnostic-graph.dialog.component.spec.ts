// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, TestBed, inject} from '@angular/core/testing';
import {MatDialogModule, MatDialog, MatIconModule, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import {BrowserDynamicTestingModule} from '@angular/platform-browser-dynamic/testing';
import {DiagnosticGraphDialogComponent} from './diagnostic-graph.dialog.component';
import { OverlayContainer } from '@angular/cdk/overlay';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('DiagnosticGraphDialogComponent', () => {
  let component: DiagnosticGraphDialogComponent;
  let fixture: ComponentFixture<DiagnosticGraphDialogComponent>;
  let dialog: MatDialog;
  let overlayContainer: OverlayContainer;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          declarations: [DiagnosticGraphDialogComponent],
          imports: [
            MatIconModule,
            MatDialogModule,
            BrowserAnimationsModule,
          ],
          providers: [
            {provide: MatDialogRef, useValue: {}},
            {provide: MAT_DIALOG_DATA},
          ]
        });

    TestBed.overrideModule(
      BrowserDynamicTestingModule,
      {set: {entryComponents: [DiagnosticGraphDialogComponent]}});

    fixture = TestBed.createComponent(DiagnosticGraphDialogComponent);
    fixture.detectChanges();

    TestBed.compileComponents();
  }));

  beforeEach(() => {
    component = fixture.componentInstance;
  });

  beforeEach(inject(
    [MatDialog, OverlayContainer], (d: MatDialog, oc: OverlayContainer) => {
      dialog = d;
      overlayContainer = oc;
  }));

  afterEach(() => {
      overlayContainer.ngOnDestroy();
  });

  it('should create', () => {
    component.dialogRef = dialog.open(DiagnosticGraphDialogComponent, {data: {}});
    expect(component).toBeTruthy();
    expect(component.dialogRef).toBeTruthy();
  });

  it('should close when close icon is clicked', () => {
    component.dialogRef = dialog.open(DiagnosticGraphDialogComponent, {data: {}});
    const spy = spyOn(component.dialogRef, 'close').and.callThrough();
    component.onExit();
    expect(spy).toHaveBeenCalled();
  });
});
