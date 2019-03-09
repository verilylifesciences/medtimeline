// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime, Interval} from 'luxon';
import {DisplayGrouping} from './clinicalconcepts/display-grouping';
import {LOINCCode} from './clinicalconcepts/loinc-code';
import {FhirHttpService} from './fhir-http.service';
import {FhirService} from './fhir.service';
import {makeSampleObservationJson} from './test_utils';

describe('FhirService', () => {
  let service: FhirService;
  let clientReadyCallback: (any) => void;
  let clientError: (any) => void;
  const smartApi = {patient: {api: {fetchAll: () => {}}}};
  const code = new LOINCCode(
      '44123', new DisplayGrouping('concept', 'red'), 'lbl1', true);
  const dateRange: Interval = Interval.fromDateTimes(
      DateTime.fromISO('2018-08-20T00:00:00.00'),
      DateTime.fromISO('2018-08-28T00:00:00.00'));
  const SAMPLE_OBSERVATION_SET = new Array(
      makeSampleObservationJson(25, DateTime.utc(2018, 8, 24)),
      makeSampleObservationJson(27, DateTime.utc(2018, 8, 25)));

  beforeEach(() => {
    const smartOnFhirClient = {
      oauth2: {
        ready: (smart, err) => {
          clientReadyCallback = smart;
          clientError = err;
        }
      }
    };
    const domSan = {
      sanitize: () => 'safeString',
      bypassSecurityTrustHtml: () => 'safeString',
      bypassSecurityTrustStyle: () => 'safeString',
      bypassSecurityTrustScript: () => 'safeString',
      bypassSecurityTrustUrl: () => 'safeString',
      bypassSecurityTrustResourceUrl: () => 'safeString',
    };
    service = new FhirHttpService(smartOnFhirClient, domSan);
  });


  it('should resolve getObservationsWithCode promise when API promise ' +
         'resolves before getObservationsWithCode call',
     (done: DoneFn) => {
       const observationReadSpy =
           spyOn(smartApi.patient.api, 'fetchAll')
               .and.returnValue(Promise.resolve(SAMPLE_OBSERVATION_SET));
       clientReadyCallback(smartApi);
       service.getObservationsWithCode(code, dateRange).then(observation => {
         expect(observationReadSpy.calls.count())
             .toBe(1, 'smartApi.observation.fetchAll was called once');
         expect(observation.length).toBe(2);
         expect(observation[0].label).toEqual('Hemoglobin');
         done();
       });
     });

  it('should resolve getObservationsWithCode promise when API promise ' +
         'resolves after getObservationsWithCode call',
     (done: DoneFn) => {
       const observationReadSpy =
           spyOn(smartApi.patient.api, 'fetchAll')
               .and.returnValue(Promise.resolve(SAMPLE_OBSERVATION_SET));
       service.getObservationsWithCode(code, dateRange).then(observation => {
         expect(observationReadSpy.calls.count()).toBe(1);
         expect(observation.length).toBeGreaterThan(0);
         expect(observation[0].label).toEqual('Hemoglobin');
         done();
       });
       clientReadyCallback(smartApi);
     });

  it('should bubble error to getObservationsWithCode when promise is rejected',
     (done: DoneFn) => {
       spyOn(smartApi.patient.api, 'fetchAll');
       clientError('api failed');
       service.getObservationsWithCode(code, dateRange).catch(err => {
         expect(err).toBe('api failed');
         expect(smartApi.patient.api.fetchAll).not.toHaveBeenCalled();
         done();
       });
     });
});
