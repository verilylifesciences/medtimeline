
// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {HttpClientModule} from '@angular/common/http';
import {async, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {ResourceCodeCreator} from 'src/app/conceptmappings/resource-code-creator';

import {FhirService} from '../../fhir-server/fhir.service';
import {DisplayGrouping, labResult, vitalSign} from '../../conceptmappings/resource-codes/display-grouping';
import {LOINCCode, LOINCCodeGroup} from '../../conceptmappings/resource-codes/loinc-code';
import {StubFhirService} from '../../utils/test_utils';

import {Axis} from './axis';
import {AxisGroup} from './axis-group';
import {ChartType} from './graph/graph.component';


describe('AxisGroup', () => {
  const testLoincCode =
      new LOINCCode('axisGroupTest', new DisplayGrouping('label'), 'label');

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          imports: [HttpClientModule],
          providers: [
            {provide: FhirService, useClass: StubFhirService},
            ResourceCodeCreator
          ]
        })
        .compileComponents();
  }));

  it('should prefer constructor values for label and display group ' +
         ' over those provided in axes',
     () => {
       const resourceCodeList = [testLoincCode];

       const axis1 = new Axis(
           TestBed.get(FhirService), TestBed.get(DomSanitizer),
           new LOINCCodeGroup(
               TestBed.get(FhirService), 'lbl', resourceCodeList, labResult,
               ChartType.LINE));

       const axis = new AxisGroup([axis1], 'constructor label', vitalSign);

       expect(axis.label).toEqual('constructor label');
       expect(axis.displayGroup).toEqual(vitalSign);
     });

  it('should set label from contained axes if not provided', () => {
    const resourceCodeList = [testLoincCode];

    const axis1 = new Axis(
        TestBed.get(FhirService), TestBed.get(DomSanitizer),
        new LOINCCodeGroup(
            TestBed.get(FhirService), 'loincCodeLabel', resourceCodeList,
            labResult, ChartType.LINE),
        'axisLbl');

    const axis = new AxisGroup([axis1]);

    expect(axis.label).toEqual('axisLbl');
  });

  it('should set display group from contained axes if not provided', () => {
    const resourceCodeList = [testLoincCode];

    const axis1 = new Axis(
        TestBed.get(FhirService), TestBed.get(DomSanitizer),
        new LOINCCodeGroup(
            TestBed.get(FhirService), 'lbl', resourceCodeList, labResult,
            ChartType.LINE));

    const axis = new AxisGroup([axis1], 'label');

    expect(axis.displayGroup).toEqual(labResult);
  });


  it('should throw error if no label provided and labels do not match', () => {
    const resourceCodeList = [testLoincCode];

    const axis1 = new Axis(
        TestBed.get(FhirService), TestBed.get(DomSanitizer),
        new LOINCCodeGroup(
            TestBed.get(FhirService), 'lbl', resourceCodeList, labResult,
            ChartType.LINE),
        'Label A');

    const axis2 = new Axis(
        TestBed.get(FhirService), TestBed.get(DomSanitizer),
        new LOINCCodeGroup(
            TestBed.get(FhirService), 'lbl', resourceCodeList, labResult,
            ChartType.LINE),
        'Label B');

    const constructor = () => {
      const axis = new AxisGroup([axis1, axis2]);
    };
    expect(constructor).toThrowError();
  });


  it('should throw error if no display group provided ' +
         'and display groups do not match.',
     () => {
       const resourceCodeList1 = [testLoincCode];

       const resourceCodeList2 = [testLoincCode];

       const axis1 = new Axis(
           TestBed.get(FhirService), TestBed.get(DomSanitizer),
           new LOINCCodeGroup(
               TestBed.get(FhirService), 'lbl', resourceCodeList1, labResult,
               ChartType.LINE),
           'Label A');

       const axis2 = new Axis(
           TestBed.get(FhirService), TestBed.get(DomSanitizer),
           new LOINCCodeGroup(
               TestBed.get(FhirService), 'lbl', resourceCodeList2, vitalSign,
               ChartType.LINE),
           'Label A');

       const constructor = () => {
         const axis = new AxisGroup([axis1, axis2]);
       };
       expect(constructor).toThrowError();
     });
});
