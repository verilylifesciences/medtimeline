// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {DateTime, Interval} from 'luxon';

import {DisplayGrouping} from './clinicalconcepts/display-grouping';
import {LOINCCode} from './clinicalconcepts/loinc-code';
import {RxNormCode} from './clinicalconcepts/rx-norm';
import {MedicationAdministration, RawMedicationAdministration} from './fhir-data-classes/medication-administration';
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

  const fullMedicationResponse = {
    headers: (requestId) => '1234',
    data: {
      link: [],
      entry: [
        {
          resource: {
            medicationCodeableConcept: {
              coding: [{system: RxNormCode.CODING_STRING, code: '11124'}],
              text: 'vancomycin'
            },
            effectiveTimeDateTime: '2018-08-21T00:00:00.00'
          },
        },
        {
          resource: {
            medicationCodeableConcept: {
              coding: [{system: RxNormCode.CODING_STRING, code: '1596450'}],
              text: 'gentamicin'
            },
            effectiveTimeDateTime: '2018-08-22T00:00:00.00'
          }
        },
        {
          resource: {
            medicationCodeableConcept: {
              coding: [{system: RxNormCode.CODING_STRING, code: 'other'}],
              text: 'other'
            },
            effectiveTimeDateTime: '2018-08-23T00:00:00.00'
          }
        }
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

  it('getAllRawMedicationAdministrations should fetch all medicationAdministrations if never been refreshed.',
     (done: DoneFn) => {
       const searchSpy =
           spyOn(smartApi.patient.api, 'search')
               .and.returnValue(Promise.resolve(fullMedicationResponse));
       clientReadyCallback(smartApi);
       service.getAllRawMedicationAdministrations().then(response => {
         const responseKeys = Array.from(response.keys());
         expect(responseKeys.length).toEqual(2);
         expect(response.get(RxNormCode.fromCodeString('11124') as RxNormCode))
             .toEqual([new RawMedicationAdministration(
                 fullMedicationResponse.data.entry[0].resource, '1234')]);
         expect(
             response.get(RxNormCode.fromCodeString('1596450') as RxNormCode))
             .toEqual([new RawMedicationAdministration(
                 fullMedicationResponse.data.entry[1].resource, '1234')]);
         expect(service.lastMedicationRefreshTime).toBeDefined();
         expect(service.medicationRefreshInProgress).toBeUndefined();
         done();
       });
     });

  it('getAllRawMedicationAdministrations should not fetch medication administrations twice if called in succession.',
     (done: DoneFn) => {
       const searchSpy =
           spyOn(smartApi.patient.api, 'search')
               .and.returnValue(Promise.resolve(fullMedicationResponse));
       clientReadyCallback(smartApi);
       const results = [
         service.getAllRawMedicationAdministrations(),
         service.getAllRawMedicationAdministrations()
       ];
       Promise.all(results).then(responses => {
         expect(responses[0]).toEqual(responses[1]);
         const responseKeys = Array.from(responses[0].keys());
         expect(responseKeys.length).toEqual(2);
         expect(searchSpy).toHaveBeenCalledTimes(1);
         expect(service.lastMedicationRefreshTime).toBeDefined();
         expect(service.medicationRefreshInProgress).toBeUndefined();
         done();
       });
     });

  it('getAllRawMedicationAdministrations only get incremental refresh if lastMedicationRefresh is defined.',
     (done: DoneFn) => {
       const searchSpy =
           spyOn(smartApi.patient.api, 'search')
               .and.returnValue(Promise.resolve(fullMedicationResponse));

       // set last refresh date to 10 minutes ago.
       service.lastMedicationRefreshTime = DateTime.utc().minus({minutes: 10});
       service.medicationAdministrationsByCode = new Map([[
         RxNormCode.fromCodeString('11124') as RxNormCode,
         [new RawMedicationAdministration(
             fullMedicationResponse.data.entry[0].resource, '7890')]
       ]]);

       clientReadyCallback(smartApi);
       service.getAllRawMedicationAdministrations().then(response => {
         expect(Array.from(response.keys()).length).toEqual(2);

         // should have been updated with additional results.
         expect(response.get(RxNormCode.fromCodeString('11124') as RxNormCode))
             .toEqual([
               new RawMedicationAdministration(
                   fullMedicationResponse.data.entry[0].resource, '7890'),
               new RawMedicationAdministration(
                   fullMedicationResponse.data.entry[0].resource, '1234')
             ]);
         expect(
             response.get(RxNormCode.fromCodeString('1596450') as RxNormCode))
             .toEqual([new RawMedicationAdministration(
                 fullMedicationResponse.data.entry[1].resource, '1234')]);
         done();
         expect(searchSpy).toHaveBeenCalledTimes(1);
         done();
       });
     });

  it('getAllRawMedicationAdministrations should bubble up errors.',
     (done: DoneFn) => {
       const searchSpy = spyOn(smartApi.patient.api, 'search')
                             .and.returnValue(Promise.reject(Error('error')));
       // set last refresh date to 10 minutes ago.
       service.lastMedicationRefreshTime = DateTime.utc().minus({minutes: 10});
       service.medicationAdministrationsByCode = new Map([[
         RxNormCode.fromCodeString('11124') as RxNormCode,
         [new RawMedicationAdministration(
             fullMedicationResponse.data.entry[0].resource, '7890')]
       ]]);
       clientReadyCallback(smartApi);
       service.getAllRawMedicationAdministrations().catch(error => {
         service.medicationRefreshInProgress = undefined;
         done();
       });
     });

  it('getMedicationAdministrationsWithCodes should fetch all medications if full fetch has never happened.',
     (done: DoneFn) => {
       const searchSpy =
           spyOn(smartApi.patient.api, 'search')
               .and.returnValue(Promise.resolve(fullMedicationResponse));
       const rxCode1 = RxNormCode.fromCodeString('11124') as RxNormCode;
       clientReadyCallback(smartApi);
       service.getMedicationAdministrationsWithCodes([rxCode1], dateRange)
           .then(results => {
             expect(searchSpy).toHaveBeenCalledTimes(1);
             expect(service.lastMedicationRefreshTime).toBeDefined();
             expect(service.medicationAdministrationsByCode).toBeDefined();
             expect(service.medicationRefreshInProgress).toBeUndefined();
             expect(results).toEqual([new MedicationAdministration(
                 fullMedicationResponse.data.entry[0].resource, '1234')]);
             done();
           });
     });


  it('getMedicationAdministrationsWithCodes should use cache if date range before last refresh date',
     (done: DoneFn) => {
       const searchSpy = spyOn(smartApi.patient.api, 'search');
       // set last refresh date right now.
       service.lastMedicationRefreshTime = DateTime.utc();
       const rxCode1 = RxNormCode.fromCodeString('11124') as RxNormCode;
       const rxCode2 = RxNormCode.fromCodeString('1596450') as RxNormCode;
       const medAdminOutOfDateRangeData = {
         medicationCodeableConcept: {
           coding: [{system: RxNormCode.CODING_STRING, code: '11124'}],
           text: 'vancomycin'
         },
         effectiveTimeDateTime: '2019-08-21T00:00:00.00'
       };
       const medicationAdminsCode1 = [
         new RawMedicationAdministration(
             fullMedicationResponse.data.entry[0].resource, '7890'),
         new RawMedicationAdministration(medAdminOutOfDateRangeData, '7890')
       ];
       const medicationAdminsCode2 = [new RawMedicationAdministration(
           fullMedicationResponse.data.entry[1].resource, '7890')];

       service.medicationAdministrationsByCode = new Map([
         [rxCode1, medicationAdminsCode1], [rxCode2, medicationAdminsCode2]
       ]);

       clientReadyCallback(smartApi);
       service
           .getMedicationAdministrationsWithCodes([rxCode1, rxCode2], dateRange)
           .then(results => {
             expect(searchSpy).not.toHaveBeenCalled();
             expect(results).toEqual([
               medicationAdminsCode1[0].convertToMedicationAdministration(),
               medicationAdminsCode2[0].convertToMedicationAdministration()
             ]);
             done();
           });
     });

  it('getMedicationAdministrationsWithCodes should do an incremental fetch for data if full refresh has happened but it was last refreshed before the date range.',
     (done: DoneFn) => {
       const searchSpy =
           spyOn(smartApi.patient.api, 'search')
               .and.returnValue(Promise.resolve(fullMedicationResponse));

       const previousRefreshDate = DateTime.fromISO('2018-08-20T01:00:00.00');
       service.lastMedicationRefreshTime = previousRefreshDate;
       const rxCode1 = RxNormCode.fromCodeString('11124') as RxNormCode;
       const medAdminAlreadyInCache = [new RawMedicationAdministration(
           {
             medicationCodeableConcept: {
               coding: [{system: RxNormCode.CODING_STRING, code: '11124'}],
               text: 'vancomycin'
             },
             effectiveTimeDateTime: '2018-08-20T01:00:00.00'
           },
           '7890')];

       service.medicationAdministrationsByCode =
           new Map([[rxCode1, medAdminAlreadyInCache]]);

       clientReadyCallback(smartApi);
       service.getMedicationAdministrationsWithCodes([rxCode1], dateRange)
           .then(results => {
             expect(searchSpy).toHaveBeenCalledTimes(1);
             const expectedAdmins = [
               medAdminAlreadyInCache[0].convertToMedicationAdministration(),
               new MedicationAdministration(
                   fullMedicationResponse.data.entry[0].resource, '1234')
             ];
             expect(results).toEqual(expectedAdmins);
             expect(service.lastMedicationRefreshTime)
                 .not.toEqual(previousRefreshDate);
             expect(service.medicationAdministrationsByCode.get(rxCode1))
                 .toEqual([
                   medAdminAlreadyInCache[0],
                   new RawMedicationAdministration(
                       fullMedicationResponse.data.entry[0].resource, '1234')
                 ]);
             expect(service.medicationRefreshInProgress).toBeUndefined();
             done();
           });
     });

  it('getMedicationAdministrationsWithCodes should not fail if invalid medication is not within dateRange.',
     (done: DoneFn) => {
       const resultsWithInvalidMedication = [].concat(
           fullMedicationResponse.data.entry, [{
             resource: {
               medicationCodeableConcept: {
                 coding: [{system: RxNormCode.CODING_STRING, code: '11124'}],
               },
               effectiveTimeDateTime: '2019-08-21T00:00:00.00'
             },
           }]);
       const response = {
         headers: (requestId) => '1234',
         data: {link: [], entry: resultsWithInvalidMedication}
       };

       const searchSpy = spyOn(smartApi.patient.api, 'search')
                             .and.returnValue(Promise.resolve(response));

       const rxCode1 = RxNormCode.fromCodeString('11124') as RxNormCode;
       clientReadyCallback(smartApi);
       service.getMedicationAdministrationsWithCodes([rxCode1], dateRange)
           .then(results => {
             expect(searchSpy).toHaveBeenCalledTimes(1);
             expect(service.lastMedicationRefreshTime).toBeDefined();
             expect(service.medicationAdministrationsByCode).toBeDefined();
             expect(service.medicationRefreshInProgress).toBeUndefined();
             expect(results).toEqual([new MedicationAdministration(
                 fullMedicationResponse.data.entry[0].resource, '1234')]);
             done();
           });
     });

  it('getMedicationAdministrationsWithCodes should fail if invalid medication is within dateRange.',
     (done: DoneFn) => {
       const resultsWithInvalidMedication = [].concat(
           fullMedicationResponse.data.entry, [{
             resource: {
               medicationCodeableConcept: {
                 coding: [{system: RxNormCode.CODING_STRING, code: '11124'}],
               },
               effectiveTimeDateTime: '2018-08-21T00:00:00.00'
             },
           }]);
       const response = {
         headers: (requestId) => '1234',
         data: {link: [], entry: resultsWithInvalidMedication}
       };

       const searchSpy = spyOn(smartApi.patient.api, 'search')
                             .and.returnValue(Promise.resolve(response));

       const rxCode1 = RxNormCode.fromCodeString('11124') as RxNormCode;
       clientReadyCallback(smartApi);
       service.getMedicationAdministrationsWithCodes([rxCode1], dateRange)
           .catch(error => {
             console.log(error);
             expect(searchSpy).toHaveBeenCalledTimes(1);
             expect(service.lastMedicationRefreshTime).toBeDefined();
             expect(service.medicationAdministrationsByCode).toBeDefined();
             expect(service.medicationRefreshInProgress).toBeUndefined();
             done();
           });
     });
});
