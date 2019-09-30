
// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {DateTime, Interval} from 'luxon';

import {DisplayGrouping, labResult, vitalSign} from '../clinicalconcepts/display-grouping';
import {LOINCCode, LOINCCodeGroup} from '../clinicalconcepts/loinc-code';
import {FhirService} from '../fhir.service';
import {StubFhirService} from '../test_utils';

import {Axis} from './axis';
import {AxisGroup} from './axis-group';
import {ChartType} from './graph/graph.component';


describe('AxisGroup', () => {
  const fhirServiceStub = new StubFhirService();
  const dateRangeStart = '2018-09-09T00:00:00.00';
  const dateRangeEnd = '2018-09-18T00:00:00.00';
  const dateRange = Interval.fromDateTimes(
      DateTime.fromISO(dateRangeStart), DateTime.fromISO(dateRangeEnd));
  const getDataFromFhir = () => {};

  const testLoincCode =
      new LOINCCode('axisGroupTest', new DisplayGrouping('label'), 'label');

  beforeEach(async(() => {
    TestBed
        .configureTestingModule(
            {providers: [{provide: FhirService, useValue: {}}]})
        .compileComponents();
  }));

  it('should prefer constructor values for label and display group ' +
         ' over those provided in axes',
     () => {
       const resourceCodeList = [testLoincCode];

       const axis1 = new Axis(
           fhirServiceStub, TestBed.get(DomSanitizer),
           new LOINCCodeGroup(
               fhirServiceStub, 'lbl', resourceCodeList, labResult,
               ChartType.LINE));

       const axis = new AxisGroup([axis1], 'constructor label', vitalSign);

       expect(axis.label).toEqual('constructor label');
       expect(axis.displayGroup).toEqual(vitalSign);
     });

  it('should set label from contained axes if not provided', () => {
    const resourceCodeList = [testLoincCode];

    const axis1 = new Axis(
        fhirServiceStub, TestBed.get(DomSanitizer),
        new LOINCCodeGroup(
            fhirServiceStub, 'loincCodeLabel', resourceCodeList, labResult,
            ChartType.LINE),
        'axisLbl');

    const axis = new AxisGroup([axis1]);

    expect(axis.label).toEqual('axisLbl');
  });

  it('should set display group from contained axes if not provided', () => {
    const resourceCodeList = [testLoincCode];

    const axis1 = new Axis(
        fhirServiceStub, TestBed.get(DomSanitizer),
        new LOINCCodeGroup(
            fhirServiceStub, 'lbl', resourceCodeList, labResult,
            ChartType.LINE));

    const axis = new AxisGroup([axis1], 'label');

    expect(axis.displayGroup).toEqual(labResult);
  });


  it('should throw error if no label provided and labels do not match', () => {
    const resourceCodeList = [testLoincCode];

    const axis1 = new Axis(
        fhirServiceStub, TestBed.get(DomSanitizer),
        new LOINCCodeGroup(
            fhirServiceStub, 'lbl', resourceCodeList, labResult,
            ChartType.LINE),
        'Label A');

    const axis2 = new Axis(
        fhirServiceStub, TestBed.get(DomSanitizer),
        new LOINCCodeGroup(
            fhirServiceStub, 'lbl', resourceCodeList, labResult,
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
           fhirServiceStub, TestBed.get(DomSanitizer),
           new LOINCCodeGroup(
               fhirServiceStub, 'lbl', resourceCodeList1, labResult,
               ChartType.LINE),
           'Label A');

       const axis2 = new Axis(
           fhirServiceStub, TestBed.get(DomSanitizer),
           new LOINCCodeGroup(
               fhirServiceStub, 'lbl', resourceCodeList2, vitalSign,
               ChartType.LINE),
           'Label A');

       const constructor = () => {
         const axis = new AxisGroup([axis1, axis2]);
       };
       expect(constructor).toThrowError();
     });
});
