// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {MatDialogRef} from '@angular/material/dialog';
import {UI_CONSTANTS, UI_CONSTANTS_TOKEN} from 'src/constants';

import {DeleteDialogComponent} from './delete-dialog.component';

describe('DeleteDialogComponent', () => {
  let component: DeleteDialogComponent;
  let fixture: ComponentFixture<DeleteDialogComponent>;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          declarations: [DeleteDialogComponent],
          providers: [
            {provide: MatDialogRef, useValue: {}},
            {provide: UI_CONSTANTS_TOKEN, useValue: UI_CONSTANTS}
          ]
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DeleteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
