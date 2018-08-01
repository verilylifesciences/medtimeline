// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime, Interval} from 'luxon';
import {Observation} from '../fhir-data-classes/observation';
import {ObservationSet} from '../fhir-data-classes/observation-set';
import {ChartType} from '../graphtypes/graph/graph.component';
import {StubFhirService} from '../test_utils';

import {LOINCCode} from './loinc-code';
import {CachedResourceCodeGroup, ResourceCode} from './resource-code-group';

const interval = Interval.fromDateTimes(
    DateTime.fromISO('2012-08-04T11:00:00.000Z').toUTC(),
    DateTime.fromISO('2012-08-05T11:00:00.000Z').toUTC());

const returnedObservationSet: ObservationSet[] = new Array(new ObservationSet([
  new Observation({
    code: {
      text: 'Temperature',
      coding: [{system: LOINCCode.CODING_STRING, code: '8310-5'}]
    },
    valueQuantity: {value: 97},
  }),
  new Observation({
    code: {
      text: 'Temperature',
      coding: [{system: LOINCCode.CODING_STRING, code: '8310-5'}]
    },
    valueQuantity: {value: 98},
  })
]));

class StubCachedResourceCodeGroup extends
    CachedResourceCodeGroup<ObservationSet> {
  getResourceFromFhir(dateRange: Interval): Promise<ObservationSet[]> {
    if (dateRange === interval) {
      return Promise.resolve(returnedObservationSet);
    } else {
      throw Error('Bad date range.');
    }
  }
}

describe('ResourceCodeGroup', () => {
  it('should correctly determine whether it should be shown if any ResourceCode is marked as default.',
     () => {
         // TODO(b/119677148) : Right now there is no "Card" that has multiple
         // axes, so  there's no case where a Card has a ResourceCodeGroup[]
         // with length > 1. So, I haven't checked if the card should be shown
         // based on whether any of them are default, etc.
     });
});

describe('CachedResourceCodeGroup', () => {
  it('if uncached should call service and return cached', (done: DoneFn) => {
    const stub = new StubCachedResourceCodeGroup(
        new StubFhirService(), 'rsc_label', new Array<ResourceCode>(),
        undefined /* concept group */, ChartType.SCATTER);

    const result = stub.getResourceSet(interval);

    result.then(res => {
      expect(res).toEqual(returnedObservationSet);
      done();
    });
  });

  it('if cached, should not call for the FHIR resource again',
     (done: DoneFn) => {
       const stub = new StubCachedResourceCodeGroup(
           new StubFhirService(), 'rsc_label', new Array<ResourceCode>(),
           undefined /* concept group */, ChartType.SCATTER);

       spyOn(stub, 'getResourceFromFhir').and.callThrough();

       stub.getResourceSet(interval)
           .then(result => {
             expect(result).toEqual(returnedObservationSet);
           })
           .then(x => {
             return stub.getResourceSet(interval);
           })
           .then(result => {
             expect(result).toEqual(returnedObservationSet);
             // The FHIR call should have only been called once. The first
             // time it got stored in the cache; the second time since the
             // value was in the cache it shouldn't have been called.
             expect(stub.getResourceFromFhir).toHaveBeenCalledTimes(1);
             done();
           });
     });
});
