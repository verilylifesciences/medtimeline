// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime, Interval} from 'luxon';
import {of} from 'rxjs';

import {Observation} from '../fhir-data-classes/observation';
import {ChartType} from '../graphtypes/graph/graph.component';

import {vitalSign} from './display-grouping';
import {LOINCCode, LOINCCodeGroup} from './loinc-code';

const observations: Observation[][] = [[
  new Observation({
    code: {
      text: 'BP',
      coding: [{system: LOINCCode.CODING_STRING, code: '55284-4'}]
    },
    valueQuantity: {value: 97},
  }),
  new Observation({
    code: {
      text: 'BP',
      coding: [{system: LOINCCode.CODING_STRING, code: '55284-4'}]
    },
    valueQuantity: {value: 98},
  }),
  new Observation({
    code: {
      text: 'BP',
      coding: [{system: LOINCCode.CODING_STRING, code: '55284-4'}]
    },
    component: [{
      code: {
        coding: [{system: LOINCCode.CODING_STRING, code: '55284-4'}],
        text: 'Diastolic BP'
      },
      valueQuantity: {value: 69}
    }]
  })
]];

describe('LOINCCodeGroup', () => {
  let fhirServiceStub: any;
  const dateRange = Interval.fromDateTimes(
      DateTime.fromISO('2018-09-03T00:00:00.00'),
      DateTime.fromISO('2018-09-30T00:00:00.00'));

  beforeEach(() => {
    fhirServiceStub = {
      getObservationsForCodeGroup(id: string) {
        return of(observations).toPromise();
      }
    };
  });
  it('should correctly separate list of Observations into ObservationSets if ' +
         'inner components are present',
     () => {
       const loincGroup = new LOINCCodeGroup(
           fhirServiceStub, 'label', [], vitalSign, ChartType.LINE);
       Promise.resolve(loincGroup.getResourceFromFhir(this.interval))
           .then(result => {
             // We should have two ObservationSets; one for the first two
             // Observations corresponding to BP that have values, and one for
             // the inner component of the last Observation.
             expect(result.length).toEqual(2);
             expect(result[0].label).toEqual('BP');
             expect(result[0].resourceList.length).toEqual(2);
             expect(result[1].label).toEqual('Diastolic BP');
             expect(result[1].resourceList.length).toEqual(1);
           });
     });
});
