// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {DateTime, Interval} from 'luxon';

import {DisplayGrouping, microbio} from './clinicalconcepts/display-grouping';
import {LOINCCode} from './clinicalconcepts/loinc-code';
import {FhirHttpService} from './fhir-http.service';
import {makeSampleObservationJson} from './test_utils';

describe('FhirHttpService', () => {
  let service: FhirHttpService;
  let clientReadyCallback: (any) => void;
  let clientError: (any) => void;
  const smartApi = {patient: {api: {search: () => {}, nextPage: () => {}}}};
  const code = new LOINCCode(
      '44123', new DisplayGrouping('concept', 'red'), 'lbl1', true);
  const dateRange: Interval = Interval.fromDateTimes(
      DateTime.fromISO('2018-08-20T00:00:00.00'),
      DateTime.fromISO('2018-08-28T00:00:00.00'));

  const response = {
    headers: (requestId) => '12345',
    data: {
      link: [],
      entry: [
        {resource: makeSampleObservationJson(25, DateTime.utc(2018, 8, 24))},
        {resource: makeSampleObservationJson(25, DateTime.utc(2018, 8, 25))}
      ]
    }
  };

  const responseWithNextPage = {
    headers: (requestId) => '6789',
    data: {
      link: [{relation: 'next'}],
      entry: [
        {resource: makeSampleObservationJson(25, DateTime.utc(2018, 8, 24))},
        {resource: makeSampleObservationJson(25, DateTime.utc(2018, 8, 25))}
      ]
    }
  };

  beforeEach(() => {
    const smartOnFhirClient = {
      oauth2: {
        ready: (smart, err) => {
          clientReadyCallback = smart;
          clientError = err;
        }
      }
    };
    service = new FhirHttpService(
        null, smartOnFhirClient, TestBed.get(DomSanitizer), undefined);
  });


  it('should resolve getObservationsWithCode promise when API promise ' +
         'resolves before getObservationsWithCode call',
     (done: DoneFn) => {
       const observationReadSpy =
           spyOn(smartApi.patient.api, 'search')
               .and.returnValue(Promise.resolve(response));
       clientReadyCallback(smartApi);
       service.getObservationsWithCode(code, dateRange).then(observation => {
         expect(observationReadSpy.calls.count())
             .toBe(1, 'smartApi.observation.search was called once');
         expect(observation.length).toBe(2);
         expect(observation[0].label).toEqual('Hemoglobin');
         done();
       });
     });

  it('should resolve getObservationsWithCode promise when API promise ' +
         'resolves after getObservationsWithCode call',
     (done: DoneFn) => {
       const observationReadSpy =
           spyOn(smartApi.patient.api, 'search')
               .and.returnValue(Promise.resolve(response));
       service.getObservationsWithCode(code, dateRange).then(observation => {
         expect(observationReadSpy.calls.count()).toBe(1);
         expect(observation.length).toBeGreaterThan(0);
         expect(observation[0].label).toEqual('Hemoglobin');
         done();
       });
       clientReadyCallback(smartApi);
     });

  it('should resolve getObservationsWithCode multiple pages of calls to the API',
     (done: DoneFn) => {
       const searchdSpy =
           spyOn(smartApi.patient.api, 'search')
               .and.returnValue(Promise.resolve(responseWithNextPage));
       const nextPageSpy = spyOn(smartApi.patient.api, 'nextPage')
                               .and.returnValues(
                                   Promise.resolve(responseWithNextPage),
                                   Promise.resolve(response));
       service.getObservationsWithCode(code, dateRange).then(observation => {
         expect(searchdSpy.calls.count()).toBe(1);
         expect(nextPageSpy.calls.count()).toBe(2);
         expect(observation.length).toBe(6);
         expect(observation[0].label).toEqual('Hemoglobin');
         expect(observation[0].requestId).toEqual('6789');
         done();
       });
       clientReadyCallback(smartApi);
     });

  it('should bubble error to getObservationsWithCode when promise is rejected',
     (done: DoneFn) => {
       spyOn(smartApi.patient.api, 'search');
       clientError('api failed');
       service.getObservationsWithCode(code, dateRange).catch(err => {
         expect(err).toBe('api failed');
         expect(smartApi.patient.api.search).not.toHaveBeenCalled();
         done();
       });
     });

  it('observationsPresentWithCode should resolve to True if any observations are returned',
     (done: DoneFn) => {
       spyOn(smartApi.patient.api, 'search')
           .and.returnValue(Promise.resolve(responseWithNextPage));
       clientReadyCallback(smartApi);
       service.observationsPresentWithCode(code, dateRange).then(response => {
         expect(response).toBe(true);
         done();
       });
     });

  it('observationsPresentWithCode should resolve to False if no observations are returned',
     (done: DoneFn) => {
       const emptyResponse = {data: {}};
       spyOn(smartApi.patient.api, 'search')
           .and.returnValue(Promise.resolve(emptyResponse));
       clientReadyCallback(smartApi);
       service.observationsPresentWithCode(code, dateRange).then(response => {
         expect(response).toBe(false);
         done();
       });
     });
});
