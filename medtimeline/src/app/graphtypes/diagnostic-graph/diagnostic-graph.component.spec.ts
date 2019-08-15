// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {ChartsModule} from 'ng2-charts';
import {UI_CONSTANTS, UI_CONSTANTS_TOKEN} from 'src/constants';

import {DiagnosticGraphComponent} from './diagnostic-graph.component';

describe('DiagnosticGraphComponent', () => {
  let component: DiagnosticGraphComponent;
  let fixture: ComponentFixture<DiagnosticGraphComponent>;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          declarations: [DiagnosticGraphComponent],
          imports: [ChartsModule],
          providers: [{provide: UI_CONSTANTS_TOKEN, useValue: UI_CONSTANTS}]
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DiagnosticGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
