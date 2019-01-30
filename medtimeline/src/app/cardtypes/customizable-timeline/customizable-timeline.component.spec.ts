// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {MatCardModule, MatDialog, MatIconModule} from '@angular/material';
import {CustomizableGraphComponent} from 'src/app/graphtypes/customizable-graph/customizable-graph.component';

import {CardComponent} from '../card/card.component';

import {CustomizableTimelineComponent} from './customizable-timeline.component';

describe('CustomizableTimelineComponent', () => {
  let component: CustomizableTimelineComponent;
  let fixture: ComponentFixture<CustomizableTimelineComponent>;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          imports: [MatCardModule, MatIconModule],
          declarations: [
            CustomizableTimelineComponent,
            CustomizableGraphComponent,
            CardComponent,
          ],
          providers: [{provide: MatDialog, useValue: null}]
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CustomizableTimelineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
