// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {Interval} from 'luxon';

import {DisplayGrouping} from '../../conceptmappings/resource-codes/display-grouping';
import {LOINCCode, LOINCCodeGroup} from '../../conceptmappings/resource-codes/loinc-code';
import {ResourceCodeGroup} from '../../conceptmappings/resource-codes/resource-code-group';
import {RxNormCode} from '../../conceptmappings/resource-codes/rx-norm';
import {FhirService} from '../../fhir-server/fhir.service';
import {makeSampleDiscreteObservation, makeSampleObservation} from '../../utils/test_utils';

import {Axis} from './axis';
import {ChartType} from './graph/graph.component';


describe('Axis', () => {
  let fhirServiceStub: any;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule(
            {providers: [{provide: FhirService, useValue: fhirServiceStub}]})
        .compileComponents();
    fhirServiceStub = {
      // Should throw an error, since the Observations' y-values/results are of
      // mixed types.
      getObservationsForCodeGroup:
          (codeGroup: LOINCCodeGroup, dates: Interval) => {
            return Promise.all([
              [makeSampleObservation(10, this.dateRangeStart)],
              [makeSampleDiscreteObservation('result', this.dateRangeStart)]
            ]);
          },
    };
  }));

  it('should throw error if resource code types do not match.', () => {
    const resourceCodeList = [
      LOINCCode.fromCodeString('44123'), RxNormCode.fromCodeString('308182')
    ];

    const constructor = () => {
      const axis = new Axis(
          fhirServiceStub, TestBed.get(DomSanitizer),
          new ResourceCodeGroup(
              fhirServiceStub, 'lbl', resourceCodeList,
              new DisplayGrouping('concept', 'red'), ChartType.LINE),
          'lbl');
    };
    expect(constructor).toThrowError();
  });
});
