// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {MatDialog} from '@angular/material';

import {CustomizableGraphComponent} from './customizable-graph.component';

describe('CustomizableGraphComponent', () => {
  let component: CustomizableGraphComponent;
  let fixture: ComponentFixture<CustomizableGraphComponent>;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          declarations: [CustomizableGraphComponent],
          providers: [{provide: MatDialog, useValue: null}]
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CustomizableGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('findDialogCoordinate should correctly calculate new dialog position if necessary',
     () => {
       const originalXPosition = window.innerWidth;
       const originalYPosition = window.innerHeight;
       expect(component.findDialogCoordinates(
                  originalXPosition, originalYPosition)[0])
           .toEqual(
               window.innerWidth -
               Number(component.dialogWidth.replace('px', '')));
       expect(component.findDialogCoordinates(
                  originalXPosition, originalYPosition)[1])
           .toEqual(
               window.innerHeight -
               Number(component.dialogHeight.replace('px', '')));
     });
});
