// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {MatDialog, MatDialogRef} from '@angular/material';

import {IfuDialogComponent} from './ifu-dialog.component';

describe('IfuDialogComponent', () => {
  let component: IfuDialogComponent;
  let fixture: ComponentFixture<IfuDialogComponent>;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          declarations: [IfuDialogComponent],
          providers: [
            {provide: MatDialog, useValue: null},
            {provide: MatDialogRef, useValue: null},
          ]
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(IfuDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
