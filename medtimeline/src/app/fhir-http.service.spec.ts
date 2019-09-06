// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {HttpClient, HttpClientModule} from '@angular/common/http';
import {TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {DateTime, Interval} from 'luxon';

import {DiagnosticReportCode, DiagnosticReportCodeGroup} from './clinicalconcepts/diagnostic-report-code';
import {DisplayGrouping} from './clinicalconcepts/display-grouping';
import {LOINCCode} from './clinicalconcepts/loinc-code';
import {RxNormCode} from './clinicalconcepts/rx-norm';
import {MedicationAdministration, RawMedicationAdministration} from './fhir-data-classes/medication-administration';
import {FhirHttpService} from './fhir-http.service';
import {ChartType} from './graphtypes/graph/graph.component';
import {makeSampleObservationJson} from './test_utils';

describe('FhirHttpService', () => {
  let service: FhirHttpService;
  let clientReadyCallback: (any) => void;
  let clientError: (any) => void;
  const smartApi = {
    patient: {api: {search: () => {}, nextPage: () => {}}},
    tokenResponse: {access_token: 'access_token'}
  };
  const code = new LOINCCode(
      '44123', new DisplayGrouping('concept', 'red'), 'lbl1', true);
  const diagnosticCodeGroup = new DiagnosticReportCodeGroup(
      service, 'radiology', [DiagnosticReportCode.fromCodeString('RADRPT')],
      new DisplayGrouping('lbl', 'red'), ChartType.DIAGNOSTIC);
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

  const fullDiagnosticResponse = {
    headers: (requestId) => '1234',
    data: {
      link: [],
      entry: [
        {
          resource: {
            category: {text: 'RADRPT'},
            code: {text: 'RADRPT'},
            effectiveDateTime: '2018-08-22T22:31:02.000Z',
            id: 'id1',
            presentedForm: [
              {contentType: 'text/html', url: 'url'},
            ],
            resourceType: 'DiagnosticReport',
            status: 'unknown',
          }
        },
        {
          resource: {
            category: {text: 'RADRPT'},
            code: {text: 'RADRPT'},
            effectiveDateTime: '2018-08-24T22:31:02.000Z',
            id: 'id2',
            presentedForm: [
              {contentType: 'text/html', url: 'url'},
            ],
            resourceType: 'DiagnosticReport',
            status: 'final',
          }
        },
      ]
    }
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
    service = new FhirHttpService(
        null, smartOnFhirClient, TestBed.get(DomSanitizer),
        TestBed.get(HttpClient));
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
             expect(searchSpy).toHaveBeenCalledTimes(1);
             expect(service.lastMedicationRefreshTime).toBeDefined();
             expect(service.medicationAdministrationsByCode).toBeDefined();
             expect(service.medicationRefreshInProgress).toBeUndefined();
             done();
           });
     });

  it('getAnnotatedDiagnosticReport should return AnnotatedDiagnosticReport ' +
         'and call getAttachment()',
     (done: DoneFn) => {
       // We are not actually calling the getAttachment or search
       // functions. We are setting a default return value.
       const serviceSpy = spyOn(service, 'getAttachment')
                              .and.returnValue(Promise.resolve('mockhtml'));
       const diagnosticReadSpy =
           spyOn(smartApi.patient.api, 'search')
               .and.returnValue(Promise.resolve(fullDiagnosticResponse));
       clientReadyCallback(smartApi);
       service.getAnnotatedDiagnosticReports(diagnosticCodeGroup, dateRange)
           .then(annotatedReports => {
             expect(annotatedReports.length).toBe(2);
             expect(diagnosticReadSpy.calls.count()).toBe(1);
             expect(annotatedReports[0].report.id).toEqual('id1');
             expect(annotatedReports[1].report.id).toEqual('id2');
             for (const annotatedR of annotatedReports) {
               expect(annotatedR.attachmentHtml).toEqual('mockhtml');
             }
             expect(serviceSpy).toHaveBeenCalled();
             done();
           });
     });

  it('getAnnotatedDiagnosticReport should return AnnotatedDiagnosticReport ' +
         'with undefined attachmentHtml if the presentedForm does not exist',
     (done: DoneFn) => {
       const diagnosticResponseWithoutPresentedForm = {
         headers: (requestId) => '1234',
         data: {
           link: [],
           entry: [{
             resource: {
               category: {text: 'RADRPT'},
               code: {text: 'RADRPT'},
               effectiveDateTime: '2018-08-22T22:31:02.000Z',
               id: 'id123',
               resourceType: 'DiagnosticReport',
               status: 'unknown',
             }
           }]
         }
       };
       const diagnosticReadSpy =
           spyOn(smartApi.patient.api, 'search')
               .and.returnValue(
                   Promise.resolve(diagnosticResponseWithoutPresentedForm));
       clientReadyCallback(smartApi);
       service.getAnnotatedDiagnosticReports(diagnosticCodeGroup, dateRange)
           .then(annotatedReports => {
             expect(annotatedReports.length).toBe(1);
             expect(diagnosticReadSpy.calls.count()).toBe(1);
             expect(annotatedReports[0].report.id).toEqual('id123');
             expect(annotatedReports[0].attachmentHtml).toBeUndefined();
             done();
           });
     });

  it('getAnnotatedDiagnosticReport should return AnnotatedDiagnosticReport ' +
         'with undefined attachmentHtml if the presentedForm type is not text/html',
     (done: DoneFn) => {
       const diagnosticResponseWithWrongContentType = {
         headers: (requestId) => '1234',
         data: {
           link: [],
           entry: [{
             resource: {
               category: {text: 'RADRPT'},
               code: {text: 'RADRPT'},
               effectiveDateTime: '2018-08-22T22:31:02.000Z',
               id: 'id123',
               presentedForm: [
                 {contentType: 'wrongtype', url: 'url'},
               ],
               resourceType: 'DiagnosticReport',
               status: 'unknown',
             }
           }]
         }
       };
       const diagnosticReadSpy =
           spyOn(smartApi.patient.api, 'search')
               .and.returnValue(
                   Promise.resolve(diagnosticResponseWithWrongContentType));
       clientReadyCallback(smartApi);
       service.getAnnotatedDiagnosticReports(diagnosticCodeGroup, dateRange)
           .then(annotatedReports => {
             expect(annotatedReports.length).toBe(1);
             expect(diagnosticReadSpy.calls.count()).toBe(1);
             expect(annotatedReports[0].report.id).toEqual('id123');
             expect(annotatedReports[0].attachmentHtml).toBeUndefined();
             done();
           });
     });

  it('getAnnotatedDiagnosticReport should filter out reports with status' +
         ' of EnteredInError',
     (done: DoneFn) => {
       const diagnosticResponseErrorStatus = {
         headers: (requestId) => '1234',
         data: {
           link: [],
           entry: [
             {
               resource: {
                 category: {text: 'RADRPT'},
                 code: {text: 'RADRPT'},
                 effectiveDateTime: '2018-08-22T22:31:02.000Z',
                 id: 'id123',
                 resourceType: 'DiagnosticReport',
                 status: 'final',
               }
             },
             {
               // This should not be returned
               resource: {
                 category: {text: 'RADRPT'},
                 code: {text: 'RADRPT'},
                 effectiveDateTime: '2018-08-23T22:31:02.000Z',
                 id: 'idwrong',
                 resourceType: 'DiagnosticReport',
                 status: 'entered-in-error',
               }
             }
           ]
         }
       };
       const diagnosticReadSpy =
           spyOn(smartApi.patient.api, 'search')
               .and.returnValue(Promise.resolve(diagnosticResponseErrorStatus));
       clientReadyCallback(smartApi);
       service.getAnnotatedDiagnosticReports(diagnosticCodeGroup, dateRange)
           .then(annotatedReports => {
             // One of the input has 'entered-in-error' status and an annotated
             // diagnostic report should not be created.
             expect(annotatedReports.length).toBe(1);
             expect(diagnosticReadSpy.calls.count()).toBe(1);
             expect(annotatedReports[0].report.id).toEqual('id123');
             done();
           });
     });

  it('getAttachment should correctly catch error if there is a faulty url',
     (done: DoneFn) => {
       // We are calling the original getAttachment function to check the error
       // message in the html calls
       const serviceSpy = spyOn(service, 'getAttachment').and.callThrough();
       const diagnosticReadSpy =
           spyOn(smartApi.patient.api, 'search')
               .and.returnValue(Promise.resolve(fullDiagnosticResponse));
       clientReadyCallback(smartApi);
       service.getAnnotatedDiagnosticReports(diagnosticCodeGroup, dateRange)
           .then(annotatedReports => {
             expect(annotatedReports.length).toBe(2);
             expect(diagnosticReadSpy.calls.count()).toBe(1);
             expect(annotatedReports[0].report.id).toEqual('id1');
             expect(annotatedReports[1].report.id).toEqual('id2');
             for (const annotatedR of annotatedReports) {
               expect(annotatedR.attachmentHtml)
                   .toEqual(
                       'Http failure response for http://localhost:9876/url: 404 Not Found');
             }
             expect(serviceSpy).toHaveBeenCalled();
             done();
           });
     });
});
