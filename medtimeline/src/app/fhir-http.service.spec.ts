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

  it('should resolve medicationsPresentWithCode to true with only one API call if first response has a medication with the given code.',
     (done: DoneFn) => {
       const medicationReponse = {
         data: {
           entry: [{
             resource: {
               medicationCodeableConcept: {
                 coding: [{system: RxNormCode.CODING_STRING, code: '11124'}],
                 text: 'vancomycin'
               }
             }
           }]
         }
       };
       const searchSpy =
           spyOn(smartApi.patient.api, 'search')
               .and.returnValue(Promise.resolve(medicationReponse));
       const nextPageSpy = spyOn(smartApi.patient.api, 'nextPage');

       service
           .medicationsPresentWithCode(
               (RxNormCode.fromCodeString('11124') as RxNormCode), dateRange)
           .then(response => {
             expect(response).toEqual(true);
             expect(searchSpy).toHaveBeenCalledTimes(1);
             expect(nextPageSpy).not.toHaveBeenCalled();
             done();
           });
       clientReadyCallback(smartApi);
     });

  it('should resolve medicationsPresentWithCode to false if first response has no medication with the given code and there is no next page.',
     (done: DoneFn) => {
       const medicationReponse = {
         data: {
           link: [],
           entry: [{
             resource: {
               medicationCodeableConcept: {
                 coding: [{system: RxNormCode.CODING_STRING, code: '1596450'}],
                 text: 'gentamicin'
               }
             }
           }]
         }
       };
       const searchSpy =
           spyOn(smartApi.patient.api, 'search')
               .and.returnValue(Promise.resolve(medicationReponse));
       const nextPageSpy = spyOn(smartApi.patient.api, 'nextPage');

       service
           .medicationsPresentWithCode(
               (RxNormCode.fromCodeString('11124') as RxNormCode), dateRange)
           .then(response => {
             expect(response).toEqual(false);
             expect(searchSpy).toHaveBeenCalledTimes(1);
             expect(nextPageSpy).not.toHaveBeenCalled();
             done();
           });
       clientReadyCallback(smartApi);
     });

  it('should resolve medicationsPresentWithCode to true if second page has medication with given code.',
     (done: DoneFn) => {
       const firstMedicationReponse = {
         data: {
           link: [{relation: 'next'}],
           entry: [{
             resource: {
               medicationCodeableConcept: {
                 coding: [{system: RxNormCode.CODING_STRING, code: '1596450'}],
                 text: 'gentamicin'
               }
             }
           }]
         }
       };

       const secondMedicationReponse = {
         data: {
           entry: [{
             resource: {
               medicationCodeableConcept: {
                 coding: [{system: RxNormCode.CODING_STRING, code: '11124'}],
                 text: 'vancomycin'
               }
             }
           }]
         }
       };
       const searchSpy =
           spyOn(smartApi.patient.api, 'search')
               .and.returnValue(Promise.resolve(firstMedicationReponse));
       const nextPageSpy =
           spyOn(smartApi.patient.api, 'nextPage')
               .and.returnValue(Promise.resolve(secondMedicationReponse));

       service
           .medicationsPresentWithCode(
               (RxNormCode.fromCodeString('11124') as RxNormCode), dateRange)
           .then(response => {
             expect(response).toEqual(true);
             expect(searchSpy).toHaveBeenCalledTimes(1);
             expect(nextPageSpy).toHaveBeenCalledTimes(1);
             done();
           });
       clientReadyCallback(smartApi);
     });

  it('should resolve medicationsPresentWithCode to false if no medication with code on multiple pages.',
     (done: DoneFn) => {
       const firstMedicationReponse = {
         data: {
           link: [{relation: 'next'}],
           entry: [{
             resource: {
               medicationCodeableConcept: {
                 coding: [{system: RxNormCode.CODING_STRING, code: '1596450'}],
                 text: 'gentamicin'
               }
             }
           }]
         }
       };

       const secondMedicationReponse = {
         data: {
           link: [],
           entry: [{
             resource: {
               medicationCodeableConcept: {
                 coding: [{system: RxNormCode.CODING_STRING, code: '1596450'}],
                 text: 'gentamicin'
               }
             }
           }]
         }
       };
       const searchSpy =
           spyOn(smartApi.patient.api, 'search')
               .and.returnValue(Promise.resolve(firstMedicationReponse));
       const nextPageSpy =
           spyOn(smartApi.patient.api, 'nextPage')
               .and.returnValue(Promise.resolve(secondMedicationReponse));

       service
           .medicationsPresentWithCode(
               (RxNormCode.fromCodeString('11124') as RxNormCode), dateRange)
           .then(response => {
             expect(response).toEqual(false);
             expect(searchSpy).toHaveBeenCalledTimes(1);
             expect(nextPageSpy).toHaveBeenCalledTimes(1);
             done();
           });
       clientReadyCallback(smartApi);
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
