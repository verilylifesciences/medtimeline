// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {DraggablecardComponent} from './draggablecard.component';

describe('DraggablecardComponent', () => {
  let component: DraggablecardComponent;
  let fixture: ComponentFixture<DraggablecardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({declarations: [DraggablecardComponent]})
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DraggablecardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
