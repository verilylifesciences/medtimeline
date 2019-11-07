// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {HttpClientModule} from '@angular/common/http';
import {TestBed} from '@angular/core/testing';
import {APP_TIMESPAN} from 'src/constants';

import {Encounter} from '../fhir-resources/encounter';

import {EncounterCache} from './fhir-cache';

class StubEncounterCache extends EncounterCache {
  // cache;

  createFunction(result) {
    return new Encounter(result.json, result.requestId);
  }

  getQueryParams(dateRangeParam) {
    return {type: 'fake'};
  }
}

const ENCOUNTER_OUTSIDE_RANGE = {
  headers: (requestId) => '12345',
  data: {
    link: [],
    entry: [{
      resource: {
        id: 'PatientID',
        period: {
          start: APP_TIMESPAN.start.minus({days: 5}),
          end: APP_TIMESPAN.start.minus({days: 2})

        },
        resourceType: 'Encounter',
        status: 'finished',
      }
    }]
  }
};


const ENCOUNTER_IN_RANGE = {
  headers: (requestId) => '12345',
  data: {
    link: [],
    entry: [{
      resource: {
        id: 'PatientID',
        period: {
          // Here we assume APP_TIMESPAN is greater than 2 days
          start: APP_TIMESPAN.start.plus({days: 1}),
          end: APP_TIMESPAN.end.minus({days: 1})
        },
        resourceType: 'Encounter',
        status: 'finished',
      }
    }]
  }
};

const RESULT_OBJECT =
    [new Encounter(ENCOUNTER_IN_RANGE.data.entry[0].resource, '12345')];

describe('EncounterCache', () => {
  let fhirCache: StubEncounterCache;
  const smartApi = {
    patient: {
      api: {search: () => Promise.resolve(), nextPage: () => Promise.resolve()}
    },
    tokenResponse: {access_token: 'access_token_cache'}
  };

  beforeEach(() => {
    TestBed.configureTestingModule({imports: [HttpClientModule]});
    fhirCache = new StubEncounterCache();
  });

  it('loads in an encounter that is in the app timespan', (done: DoneFn) => {
    const searchSpy = spyOn(smartApi.patient.api, 'search')
                          .and.returnValue(Promise.resolve(ENCOUNTER_IN_RANGE));
    fhirCache.getResource(smartApi).then(res => {
      expect(res).toEqual(RESULT_OBJECT);
      expect(searchSpy).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it('does not load in an encounter outside of the app timespan.',
     (done: DoneFn) => {
       const searchSpy =
           spyOn(smartApi.patient.api, 'search')
               .and.returnValue(Promise.resolve(ENCOUNTER_OUTSIDE_RANGE));
       fhirCache.getResource(smartApi).then(res => {
         expect(res).toEqual([]);
         expect(searchSpy).toHaveBeenCalledTimes(1);
         done();
       });
     });
});
