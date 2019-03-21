// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {ActivatedRoute} from '@angular/router';
import {of} from 'rxjs';

import {DebuggerComponent} from './debugger.component';

describe('DebuggerComponent', () => {
  let component: DebuggerComponent;
  let fixture: ComponentFixture<DebuggerComponent>;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          declarations: [DebuggerComponent],
          providers:
              [{provide: ActivatedRoute, useValue: {queryParams: of({})}}],
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DebuggerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
