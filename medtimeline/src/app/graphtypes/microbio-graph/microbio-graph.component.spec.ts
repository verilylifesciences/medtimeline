// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {ChartsModule} from 'ng2-charts';
import {UI_CONSTANTS, UI_CONSTANTS_TOKEN} from 'src/constants';

import {MicrobioGraphComponent} from './microbio-graph.component';

describe('MicrobioGraphComponent', () => {
  let component: MicrobioGraphComponent;
  let fixture: ComponentFixture<MicrobioGraphComponent>;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          declarations: [MicrobioGraphComponent],
          imports: [ChartsModule],
          providers: [{provide: UI_CONSTANTS_TOKEN, useValue: UI_CONSTANTS}]
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MicrobioGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
