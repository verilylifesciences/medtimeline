// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {HttpClient, HttpClientModule} from '@angular/common/http';
import {async, TestBed} from '@angular/core/testing';
import {DateTime, Interval} from 'luxon';

import {ConceptFileConfiguration} from '../conceptmappings/concept-file-configuration';
import {ResourceCodeCreator} from '../conceptmappings/resource-code-creator';
import {DiagnosticReportCode, DiagnosticReportCodeGroup} from '../conceptmappings/resource-codes/diagnostic-report-code';
import {DisplayGrouping} from '../conceptmappings/resource-codes/display-grouping';
import {LOINCCode} from '../conceptmappings/resource-codes/loinc-code';
import {RxNormCode} from '../conceptmappings/resource-codes/rx-norm';
import {ChartType} from '../graphs/graphtypes/graph/graph.component';
import {makeSampleObservationJson} from '../utils/test_utils';

import {DiagnosticReportCache, EncounterCache, MedicationCache} from './fhir-cache';
import {FhirHttpService} from './fhir-http.service';
import {FhirService} from './fhir.service';

class FakeFhirHttpService extends FhirHttpService {
  resetCaches() {
    FhirHttpService.medicationCache = new MedicationCache();
    FhirHttpService.observationCache = new Map();
    FhirHttpService.diagnosticReportCache = new DiagnosticReportCache();
    FhirHttpService.encounterCache = new EncounterCache();
  }
}

describe('FhirHttpService', () => {
  let service: FakeFhirHttpService;
  let clientReadyCallback: (any) => void;
  let clientError: (any) => void;
  const smartApi = {
    patient: {api: {search: () => {}, nextPage: () => {}}},
    tokenResponse: {access_token: 'access_token'}
  };
  let code;
  let diagnosticCodeGroup;

  const dateRange: Interval = Interval.fromDateTimes(
      DateTime.fromISO('2018-08-20T00:00:00.00'),
      DateTime.fromISO('2018-08-28T00:00:00.00'));

  const observationsResponse = {
    headers: (requestId) => '12345',
    data: {
      link: [],
      entry: [
        {resource: makeSampleObservationJson(25, DateTime.utc(2018, 8, 24))},
        {resource: makeSampleObservationJson(25, DateTime.utc(2018, 8, 25))}
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

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule],
      providers: [
        {provide: ResourceCodeCreator, useClass: ResourceCodeCreator},
        {provide: FhirService, useClass: FakeFhirHttpService},
        {
          provide: ConceptFileConfiguration,
          useValue: new ConceptFileConfiguration()
        },
      ]
    });
    (TestBed.get(ResourceCodeCreator) as ResourceCodeCreator)
        .loadAllConcepts.then(() => {
          code = LOINCCode.fromCodeString('718-7');
          diagnosticCodeGroup = new DiagnosticReportCodeGroup(
              service, 'radiology',
              [DiagnosticReportCode.fromCodeString('RADRPT')],
              new DisplayGrouping('lbl', 'red'), ChartType.DIAGNOSTIC);
        });
  }));


  beforeEach(() => {
    const smartOnFhirClient = {
      oauth2: {
        ready: (smart, err) => {
          clientReadyCallback = smart;
          clientError = err;
        }
      }
    };
    service = new FakeFhirHttpService(
        null, smartOnFhirClient, TestBed.get(HttpClient),
        TestBed.get(ResourceCodeCreator));
    service.resetCaches();
  });


  it('should resolve getObservationsWithCode', (done: DoneFn) => {
    const observationReadSpy =
        spyOn(smartApi.patient.api, 'search')
            .and.returnValue(Promise.resolve(observationsResponse));
    clientReadyCallback(smartApi);
    service.getObservationsWithCode(code, dateRange).then(observation => {
      expect(observationReadSpy.calls.count())
          .toBe(1, 'smartApi.observation.search was called once');
      expect(observation.length).toBe(2);
      expect(observation[0].label).toEqual('Hemoglobin');
      done();
    });
  });

  it('observationsPresentWithCode should resolve to True with only 1 fhir call if any observations are returned',
     (done: DoneFn) => {
       const responseWithNextPage = {
         headers: (requestId) => '6789',
         data: {
           link: [{relation: 'next'}],
           entry: [
             {
               resource:
                   makeSampleObservationJson(25, DateTime.utc(2018, 8, 24))
             },
             {
               resource:
                   makeSampleObservationJson(25, DateTime.utc(2018, 8, 25))
             }
           ]
         }
       };
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

  it('should resolve getMedicationAdministrationsWithCode', (done: DoneFn) => {
    const medicationResponse = {
      headers: (requestId) => '6789',
      data: {
        link: [],
        entry: [
          {
            resource: {
              medicationCodeableConcept: {
                coding: [{system: RxNormCode.CODING_STRING, code: '11124'}],
                text: 'vancomycin'
              },
              effectiveTimeDateTime: '2018-08-23T22:30:00.000Z',
              status: 'completed'
            }
          },
          {
            resource: {
              medicationCodeableConcept: {
                coding: [{system: RxNormCode.CODING_STRING, code: '11124'}],
                text: 'vancomycin'
              },
              effectiveTimeDateTime: '2018-08-23T22:00:00.000Z',
              status: 'entered-in-error'
            }
          },
          {
            resource: {
              medicationCodeableConcept: {
                coding: [{system: RxNormCode.CODING_STRING, code: '123'}],
                text: 'fake'
              },
              effectiveTimeDateTime: '2018-08-22T22:31:02.000Z',
              status: 'completed'
            }
          }
        ]
      }
    };
    const medicationReadSpy =
        spyOn(smartApi.patient.api, 'search')
            .and.returnValue(Promise.resolve(medicationResponse));
    clientReadyCallback(smartApi);
    service
        .getMedicationAdministrationsWithCodes(
            [(RxNormCode.fromCodeString('11124') as RxNormCode)], dateRange)
        .then(meds => {
          expect(medicationReadSpy).toHaveBeenCalledTimes(1);
          expect(meds.length).toBe(1);
          expect(meds[0].label).toEqual('vancomycin');
          done();
        });
  });


  it('medicationsPresentWithCode should resolve to True any MedicationAdministrations are returned',
     (done: DoneFn) => {
       const responseWithNextPage = {
         headers: (requestId) => '6789',
         data: {
           link: [],
           entry: [{
             resource: {
               medicationCodeableConcept: {
                 coding: [{system: RxNormCode.CODING_STRING, code: '11124'}],
                 text: 'vancomycin'
               },
               effectiveTimeDateTime: '2018-08-22T22:31:02.000Z',
               status: 'completed'
             }
           }]
         }
       };
       spyOn(smartApi.patient.api, 'search')
           .and.returnValue(Promise.resolve(responseWithNextPage));
       clientReadyCallback(smartApi);
       const rxNorm = (RxNormCode.fromCodeString('11124') as RxNormCode);
       service.medicationsPresentWithCode(rxNorm, dateRange).then(response => {
         expect(response).toBe(true);
         done();
       });
     });

  it('medicationsPresentWithCode should resolve to False if no MedicationAdministrations are returned',
     (done: DoneFn) => {
       const emptyResponse = {
         headers: (requestId) => '6789',
         data: {link: [], entry: []}
       };
       spyOn(smartApi.patient.api, 'search')
           .and.returnValue(Promise.resolve(emptyResponse));
       clientReadyCallback(smartApi);
       service.medicationsPresentWithCode(code, dateRange).then(response => {
         expect(response).toBe(false);
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
             // One of the input has 'entered-in-error' status and an
             // annotated diagnostic report should not be created.
             expect(annotatedReports.length).toBe(1);
             expect(diagnosticReadSpy.calls.count()).toBe(1);
             expect(annotatedReports[0].report.id).toEqual('id123');
             done();
           });
     });

  it('getAttachment should correctly catch error if there is a faulty url',
     (done: DoneFn) => {
       // We are calling the original getAttachment function to check the
       // error message in the html calls
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
