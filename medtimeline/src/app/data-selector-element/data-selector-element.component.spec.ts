// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {MatListModule} from '@angular/material';

import {labResult} from '../clinicalconcepts/display-grouping';
import {ResourceCodesForCard} from '../clinicalconcepts/resource-code-manager';

import {DataSelectorElementComponent} from './data-selector-element.component';

describe('DataSelectorElementComponent', () => {
  let component: DataSelectorElementComponent;
  let fixture: ComponentFixture<DataSelectorElementComponent>;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          imports: [MatListModule],
          declarations: [DataSelectorElementComponent]
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DataSelectorElementComponent);
    component = fixture.componentInstance;
    component.resourceCodesForCard =
        new ResourceCodesForCard([], 'Label', labResult);
    component.conceptGroupKey = labResult;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display correct title', () => {
    expect(component.resourceCodesForCard.label).toEqual('Label');
  });

  it('should display No Data available if there is no data', () => {
    expect(component.resourceCodesForCard.dataAvailable).toBeFalsy();
  });
});
