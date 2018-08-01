// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';

import {MicrobioGraphComponent} from './microbio-graph.component';

describe('MicrobioGraphComponent', () => {
  let component: MicrobioGraphComponent;
  let fixture: ComponentFixture<MicrobioGraphComponent>;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule(
            {declarations: [MicrobioGraphComponent], providers: [DomSanitizer]})
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
