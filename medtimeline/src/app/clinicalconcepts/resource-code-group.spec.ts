// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime, Interval} from 'luxon';

import {AnnotatedObservation} from '../fhir-data-classes/annotated-observation';
import {Observation} from '../fhir-data-classes/observation';
import {ObservationSet} from '../fhir-data-classes/observation-set';
import {ChartType} from '../graphtypes/graph/graph.component';
import {StubFhirService} from '../test_utils';

import {labResult} from './display-grouping';
import {LOINCCode} from './loinc-code';
import {AbstractResourceCodeGroup, ResourceCode, ResourceCodeGroup} from './resource-code-group';
import {ResourceCodeManager} from './resource-code-manager';

const interval = Interval.fromDateTimes(
    DateTime.fromISO('2012-08-04T11:00:00.000Z').toUTC(),
    DateTime.fromISO('2012-08-05T11:00:00.000Z').toUTC());

const REQUEST_ID = '1234';
const returnedObservations: AnnotatedObservation[] = [
  new AnnotatedObservation(new Observation(
      {
        code: {
          text: 'Temperature',
          coding: [{system: LOINCCode.CODING_STRING, code: '8310-5'}]
        },
        valueQuantity: {value: 97},
        effectiveDateTime: '2012-08-04T12:00:00.000Z'
      },
      REQUEST_ID)),
  new AnnotatedObservation(new Observation(
      {
        code: {
          text: 'Temperature',
          coding: [{system: LOINCCode.CODING_STRING, code: '8310-5'}]
        },
        valueQuantity: {value: 98},
        effectiveDateTime: '2012-08-04T15:00:00.000Z'
      },
      REQUEST_ID))
];
const returnedObservationSets =
    new Array(new ObservationSet(returnedObservations));

class StubCachedResourceCodeGroup extends
    AbstractResourceCodeGroup<ObservationSet, AnnotatedObservation> {
  getResourceFromFhir(dateRange: Interval): Promise<AnnotatedObservation[]> {
    return Promise.resolve(returnedObservations);
  }
  formatRawResults(rawResults: AnnotatedObservation[]):
      Promise<ObservationSet[]> {
    return Promise.resolve(new Array(new ObservationSet(rawResults)));
  }
}

describe('ResourceCodeGroup', () => {
  it('should correctly determine whether it should be shown if any ResourceCode is marked as default.',
     () => {
       // These ResourceCodes have mixed showByDefault fields.
       const resourceCodes = ResourceCodeManager.labLoincs;
       const resourceCodeGroup = new ResourceCodeGroup(
           null, 'label', resourceCodes, labResult, ChartType.LINE);
       expect(resourceCodeGroup.showByDefault).toBeTruthy();
     });
});
