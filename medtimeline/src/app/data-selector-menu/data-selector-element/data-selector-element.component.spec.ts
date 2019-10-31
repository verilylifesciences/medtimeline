// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {MatListModule} from '@angular/material/list';
import {UI_CONSTANTS, UI_CONSTANTS_TOKEN} from 'src/constants';

import {labResult} from '../../conceptmappings/resource-codes/display-grouping';
import {AxisGroup} from '../../graphs/graphtypes/axis-group';

import {DataSelectorElementComponent} from './data-selector-element.component';

describe('DataSelectorElementComponent', () => {
  let component: DataSelectorElementComponent;
  let fixture: ComponentFixture<DataSelectorElementComponent>;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          imports: [MatListModule],
          declarations: [DataSelectorElementComponent],
          providers: [{provide: UI_CONSTANTS_TOKEN, useValue: UI_CONSTANTS}]
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DataSelectorElementComponent);
    component = fixture.componentInstance;
    component.axisGroup = new AxisGroup([], 'Label', labResult);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display correct title', () => {
    expect(component.axisGroup.label).toEqual('Label');
  });

  it('should display No Data available if there is no data', (done: DoneFn) => {
    component.axisGroup.dataAvailableInAppTimeScope().then(res => {
      expect(res).toBeFalsy();
      done();
    });
  });
});
