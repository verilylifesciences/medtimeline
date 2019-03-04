// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';

import {ConfirmSaveComponent} from './confirm-save.component';

describe('ConfirmSaveComponent', () => {
  let component: ConfirmSaveComponent;
  let fixture: ComponentFixture<ConfirmSaveComponent>;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          declarations: [ConfirmSaveComponent],
          providers: [
            {provide: MatDialogRef, useValue: {}},
            {provide: MAT_DIALOG_DATA, useValue: {}}
          ]
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfirmSaveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
