
// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, TestBed} from '@angular/core/testing';
import {DateTime, Interval} from 'luxon';

import {labResult, vitalSign} from '../clinicalconcepts/display-grouping';
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

  beforeEach(async(() => {
    TestBed
        .configureTestingModule(
            {providers: [{provide: FhirService, useValue: {}}]})
        .compileComponents();
  }));

  it('AxisGroup should prefer constructor values for label and display group ' +
         ' over those provided in axes',
     () => {
       const resourceCodeList = [
         new LOINCCode('44123', labResult, 'label1', true),
         new LOINCCode('44123', labResult, 'label1', true),
       ];

       const axis1 = new Axis(
           fhirServiceStub,
           new LOINCCodeGroup(
               fhirServiceStub, 'lbl', resourceCodeList, labResult,
               ChartType.LINE),
           dateRange, this.domSanitizer);

       const axis = new AxisGroup([axis1], 'constructor label', vitalSign);

       expect(axis.label).toEqual('constructor label');
       expect(axis.displayGroup).toEqual(vitalSign);
     });

  it('AxisGroup should set label from contained axes if not provided', () => {
    const resourceCodeList = [
      new LOINCCode('44123', labResult, 'label1', true),
      new LOINCCode('44123', labResult, 'label1', true),
    ];

    const axis1 = new Axis(
        fhirServiceStub,
        new LOINCCodeGroup(
            fhirServiceStub, 'lbl', resourceCodeList, labResult,
            ChartType.LINE),
        dateRange, this.domSanitizer, 'axislbl');

    const axis = new AxisGroup([axis1]);

    expect(axis.label).toEqual('axislbl');
  });

  it('AxisGroup should set display group from contained axes if not provided',
     () => {
       const resourceCodeList = [
         new LOINCCode('44123', labResult, 'label1', true),
         new LOINCCode('44123', labResult, 'label1', true),
       ];

       const axis1 = new Axis(
           fhirServiceStub,
           new LOINCCodeGroup(
               fhirServiceStub, 'lbl', resourceCodeList, labResult,
               ChartType.LINE),
           dateRange, this.domSanitizer);

       const axis = new AxisGroup([axis1], 'label');

       expect(axis.displayGroup).toEqual(labResult);
     });


  it('AxisGroup should throw error if no label provided and labels do not match',
     () => {
       const resourceCodeList = [
         new LOINCCode('44123', labResult, 'label1', true),
         new LOINCCode('44123', labResult, 'label1', true),
       ];

       const axis1 = new Axis(
           fhirServiceStub,
           new LOINCCodeGroup(
               fhirServiceStub, 'lbl', resourceCodeList, labResult,
               ChartType.LINE),
           dateRange, this.domSanitizer, 'Label A');

       const axis2 = new Axis(
           fhirServiceStub,
           new LOINCCodeGroup(
               fhirServiceStub, 'lbl', resourceCodeList, labResult,
               ChartType.LINE),
           dateRange, this.domSanitizer, 'Label B');

       const constructor = () => {
         const axis = new AxisGroup([axis1, axis2]);
       };
       expect(constructor).toThrowError();
     });


  it('AxisGroup should throw error if no display group provided ' +
         'and display groups do not match.',
     () => {
       const resourceCodeList1 = [
         new LOINCCode('44123', labResult, 'label1', true),
       ];

       const resourceCodeList2 = [
         new LOINCCode('44123', vitalSign, 'label1', true),
       ];

       const axis1 = new Axis(
           fhirServiceStub,
           new LOINCCodeGroup(
               fhirServiceStub, 'lbl', resourceCodeList1, labResult,
               ChartType.LINE),
           dateRange, this.domSanitizer, 'Label A');

       const axis2 = new Axis(
           fhirServiceStub,
           new LOINCCodeGroup(
               fhirServiceStub, 'lbl', resourceCodeList2, vitalSign,
               ChartType.LINE),
           dateRange, this.domSanitizer, 'Label A');

       const constructor = () => {
         const axis = new AxisGroup([axis1, axis2]);
       };
       expect(constructor).toThrowError();
     });
});
