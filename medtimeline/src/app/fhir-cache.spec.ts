import {HttpClientModule} from '@angular/common/http';
import {TestBed} from '@angular/core/testing';
import {DateTime, Interval} from 'luxon';

import {FhirCache} from './fhir-cache';
import {RawResource, ResultClassWithTimestamp} from './fhir-resource-set';

const dateRange: Interval = Interval.fromDateTimes(
    DateTime.fromISO('2012-08-23T00:00:00.00'),
    DateTime.fromISO('2012-08-26T00:00:00.00'));

class StubFhirCache extends FhirCache<ResultClassWithTimestamp> {
  cache;

  createFunction(result) {
    return new ResultClassWithTimestamp(
        result.json.label, result.requestId,
        this.getTimestampFromRawResource(result));
  }

  getTimestampFromRawResource(result) {
    return DateTime.fromISO(result.json.effectiveDateTime);
  }

  getQueryParams(dateRange) {
    return {type: 'fake'};
  }
}

const RAW_RESPONSE = {
  headers: (requestId) => '12345',
  data: {
    link: [],
    entry: [
      {
        resource:
            {label: 'result1', effectiveDateTime: '2012-08-24T00:00:00.00'}
      },
      {
        resource:
            {label: 'result2', effectiveDateTime: '2012-08-25T00:00:00.00'}
      }
    ]
  }
};

const RESPONSE_WITH_NEXT_PAGE = {
  headers: (requestId) => '6789',
  data: {
    link: [{relation: 'next'}],
    entry: [
      {
        resource:
            {label: 'result3', effectiveDateTime: '2012-08-26T01:00:00.00'}
      },
      {
        resource:
            {label: 'result4', effectiveDateTime: '2012-08-26T10:00:00.00'}
      }
    ]
  }
};

const RESULT_OBJECTS = [
  new ResultClassWithTimestamp(
      'result1', '12345', DateTime.fromISO('2012-08-24T00:00:00.00')),
  new ResultClassWithTimestamp(
      'result2', '12345', DateTime.fromISO('2012-08-25T00:00:00.00')),
];

describe('FhirCache', () => {
  let fhirCache: StubFhirCache;
  let clientReadyCallback: (any) => void;
  let clientError: (any) => void;

  const smartApi = {
    patient: {
      api: {search: () => Promise.resolve(), nextPage: () => Promise.resolve()}
    },
    tokenResponse: {access_token: 'access_token_cache'}
  };

  beforeEach(() => {
    TestBed.configureTestingModule({imports: [HttpClientModule]});
    const smartOnFhirClient = {
      oauth2: {
        ready: (smart, err) => {
          clientReadyCallback = smart;
          clientError = err;
        }
      }
    };
    const smartApiPromise = new Promise(
        (resolve, reject) => smartOnFhirClient.oauth2.ready(
            smart => resolve(smart), err => reject(err)));
    fhirCache = new StubFhirCache(smartApiPromise);
  });

  it('should bubble error to getResource when smart api promise is rejected',
     (done: DoneFn) => {
       spyOn(smartApi.patient.api, 'search');
       clientError('api failed');
       fhirCache.getResource(dateRange).catch(err => {
         expect(err).toBe('api failed');
         expect(smartApi.patient.api.search).not.toHaveBeenCalled();
         done();
       });
     });

  it('if getResource is called before smart API promise is resolved, it returns the results.',
     (done: DoneFn) => {
       clientReadyCallback(smartApi);
       const searchSpy = spyOn(smartApi.patient.api, 'search')
                             .and.returnValue(Promise.resolve(RAW_RESPONSE));
       fhirCache.getResource(dateRange).then(res => {
         expect(res).toEqual(RESULT_OBJECTS);
         expect(searchSpy).toHaveBeenCalledTimes(1);
         done();
       });
       clientReadyCallback(smartApi);
     });

  it('fetchAllFromFhir should resolve multiple pages of calls to the API',
     (done: DoneFn) => {
       clientReadyCallback(smartApi);
       const searchSpy =
           spyOn(smartApi.patient.api, 'search')
               .and.returnValue(Promise.resolve(RESPONSE_WITH_NEXT_PAGE));
       const nextPageSpy = spyOn(smartApi.patient.api, 'nextPage')
                               .and.returnValues(
                                   Promise.resolve(RESPONSE_WITH_NEXT_PAGE),
                                   Promise.resolve(RAW_RESPONSE));
       fhirCache.getResource(dateRange).then(results => {
         expect(searchSpy.calls.count()).toBe(1);
         expect(nextPageSpy.calls.count()).toBe(2);
         expect(results.length).toBe(6);
         done();
       });
     });

  it('if all uncached should call FHIR service a single time and cache should be updated',
     (done: DoneFn) => {
       clientReadyCallback(smartApi);
       const searchSpy = spyOn(smartApi.patient.api, 'search')
                             .and.returnValue(Promise.resolve(RAW_RESPONSE));
       const result = fhirCache.getResource(dateRange);

       result.then(res => {
         expect(res).toEqual(RESULT_OBJECTS);
         expect(fhirCache.cache.get('2012-08-23')).toEqual([]);
         const rawResource1 =
             new RawResource(RAW_RESPONSE.data.entry[0].resource, '12345');
         expect(fhirCache.cache.get('2012-08-24')).toEqual([rawResource1]);
         const rawResource2 =
             new RawResource(RAW_RESPONSE.data.entry[1].resource, '12345');
         expect(fhirCache.cache.get('2012-08-25')).toEqual([rawResource2]);
         expect(fhirCache.cache.get('2012-08-26')).toEqual([]);
         expect(searchSpy).toHaveBeenCalledTimes(1);
         done();
       });
     });

  it('if all days in date range are cached, should not call for the FHIR resource again.',
     (done: DoneFn) => {
       clientReadyCallback(smartApi);
       const searchSpy = spyOn(smartApi.patient.api, 'search')
                             .and.returnValue(Promise.resolve(RAW_RESPONSE));
       fhirCache.getResource(dateRange)
           .then(result => {
             expect(result).toEqual(RESULT_OBJECTS);
           })
           .then(x => {
             return fhirCache.getResource(dateRange);
           })
           .then(result => {
             expect(result).toEqual(RESULT_OBJECTS);
             // The FHIR call should have only been called once. The first
             // time it got stored in the cache; the second time since the
             // value was in the cache it shouldn't have been called.
             expect(searchSpy).toHaveBeenCalledTimes(1);

             // we expect the cache to still contain all information.
             expect(fhirCache.cache.get('2012-08-23')).toEqual([]);
             const rawResource1 =
                 new RawResource(RAW_RESPONSE.data.entry[0].resource, '12345');
             expect(fhirCache.cache.get('2012-08-24')).toEqual([rawResource1]);
             const rawResource2 =
                 new RawResource(RAW_RESPONSE.data.entry[1].resource, '12345');
             expect(fhirCache.cache.get('2012-08-25')).toEqual([rawResource2]);
             expect(fhirCache.cache.get('2012-08-26')).toEqual([]);
             done();
           });
     });

  it('if today is requested, it should not be added to the cache.',
     (done: DoneFn) => {
       clientReadyCallback(smartApi);
       const now = DateTime.utc();
       const todayResponse = {
         headers: (requestId) => '12345',
         data: {
           link: [],
           entry: [
             {resource: {label: 'result1', effectiveDateTime: now.toISOTime()}}
           ]
         }
       };

       const searchSpy = spyOn(smartApi.patient.api, 'search')
                             .and.returnValue(Promise.resolve(todayResponse));

       // just get data for today.
       const result = fhirCache.getResource(
           Interval.fromDateTimes(now.startOf('day'), now.endOf('day')));

       result.then(res => {
         expect(searchSpy).toHaveBeenCalledTimes(1);
         expect(res).toEqual([new ResultClassWithTimestamp(
             'result1', '12345', DateTime.fromISO(now.toISOTime()))]);
         expect(Array.from(fhirCache.cache.keys())).toEqual(new Array());
         done();
       });
     });

  it('if part of a date range is in the cache, call FHIR for dates not in the cache.',
     (done: DoneFn) => {
       clientReadyCallback(smartApi);
       const cachedRawResource = new RawResource(
           {label: 'cached', effectiveDateTime: '2012-08-06T07:00:00.000Z'},
           '9999');
       fhirCache.cache.set('2012-08-05', []);
       fhirCache.cache.set('2012-08-06', [cachedRawResource]);
       const intervalToGet = Interval.fromDateTimes(
           DateTime.fromISO('2012-08-04T00:00:00.000Z').toUTC(),
           DateTime.fromISO('2012-08-07T23:00:00.000Z').toUTC());

       const response1 = {
         headers: (requestId) => '12345',
         data: {
           link: [],
           entry: [{
             resource: {
               label: 'result1',
               effectiveDateTime: '2012-08-04T06:00:00.000Z'
             }
           }]
         }
       };

       const response2 = {
         headers: (requestId) => '78910',
         data: {
           link: [],
           entry: [{
             resource: {
               label: 'result2',
               effectiveDateTime: '2012-08-07T12:00:00.000Z'
             }
           }]
         }
       };

       const searchSpy =
           spyOn(smartApi.patient.api, 'search')
               .and.returnValues(
                   Promise.resolve(response1), Promise.resolve(response2));
       const result = fhirCache.getResource(intervalToGet);

       result.then(res => {
         const expectedResults = [
           new ResultClassWithTimestamp(
               'result1', '12345',
               DateTime.fromISO('2012-08-04T06:00:00.000Z')),
           new ResultClassWithTimestamp(
               'cached', '9999', DateTime.fromISO('2012-08-06T07:00:00.000Z')),
           new ResultClassWithTimestamp(
               'result2', '78910', DateTime.fromISO('2012-08-07T12:00:00.000Z'))
         ];
         expect(res).toEqual(expectedResults);
         expect(fhirCache.cache.get('2012-08-04')).toEqual([new RawResource(
             response1.data.entry[0].resource, '12345')]);
         expect(fhirCache.cache.get('2012-08-05')).toEqual([]);
         expect(fhirCache.cache.get('2012-08-06')).toEqual([cachedRawResource]);
         expect(fhirCache.cache.get('2012-08-07')).toEqual([new RawResource(
             response2.data.entry[0].resource, '78910')]);
         expect(searchSpy).toHaveBeenCalledTimes(2);
         done();
       });
     });

  it('if an error is raised when data is fetched, the error is bubbled and the cache is unchanged.',
     (done: DoneFn) => {
       clientReadyCallback(smartApi);
       // throw an error the second time search is called.
       const searchSpy = spyOn(smartApi.patient.api, 'search')
                             .and.returnValue(Promise.reject(Error('error')));

       fhirCache.getResource(dateRange).catch(err => {
         expect(Array.from(fhirCache.cache.keys()).length).toEqual(0);
         expect(searchSpy).toHaveBeenCalledTimes(1);
         done();
       });
     });

  it('if an error is raised when data is formatted, the error is bubbled but the cache is updated.',
     (done: DoneFn) => {
       clientReadyCallback(smartApi);
       spyOn(fhirCache, 'createFunction').and.throwError('error');
       const searchSpy = spyOn(smartApi.patient.api, 'search')
                             .and.returnValues(Promise.resolve(RAW_RESPONSE));
       fhirCache.getResource(dateRange).catch(err => {
         expect(fhirCache.cache.get('2012-08-23')).toEqual([]);
         const rawResource1 =
             new RawResource(RAW_RESPONSE.data.entry[0].resource, '12345');
         expect(fhirCache.cache.get('2012-08-24')).toEqual([rawResource1]);
         const rawResource2 =
             new RawResource(RAW_RESPONSE.data.entry[1].resource, '12345');
         expect(fhirCache.cache.get('2012-08-25')).toEqual([rawResource2]);
         expect(fhirCache.cache.get('2012-08-26')).toEqual([]);
         expect(searchSpy).toHaveBeenCalledTimes(1);
         done();
       });
     });
});
