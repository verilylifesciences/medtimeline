// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {HttpClientModule} from '@angular/common/http';
import {async, TestBed} from '@angular/core/testing';
import {DateTime, Interval} from 'luxon';

import {AnnotatedDiagnosticReport} from '../../fhir-resources/annotated/annotated-diagnostic-report';
import {DiagnosticReport} from '../../fhir-resources/diagnostic-report';
import {FhirService} from '../../fhir-server/fhir.service';
import {ChartType} from '../../graphs/graphtypes/graph/graph.component';
import {makeDiagnosticReports, StubFhirService} from '../../utils/test_utils';
import {ConceptFileConfiguration} from '../concept-file-configuration';
import {ResourceCodeCreator} from '../resource-code-creator';

import {DiagnosticReportCode, DiagnosticReportCodeGroup} from './diagnostic-report-code';
import {DisplayGrouping} from './display-grouping';

const interval = Interval.fromDateTimes(
    DateTime.fromISO('2019-02-10T11:00:00.000Z').toUTC(),
    DateTime.fromISO('2019-02-15T11:00:00.000Z').toUTC());
const REQUEST_ID = '1234';
let diagnosticCodeGroup;
let stubFhir;

class DiagnosticReportStubFhirService extends StubFhirService {
  diagnosticReports: DiagnosticReport[];

  constructor() {
    super(TestBed.get(ResourceCodeCreator));
  }

  getAnnotatedDiagnosticReports(
      codeGroup: DiagnosticReportCodeGroup, dateRange: Interval,
      limitCount?: number): Promise<AnnotatedDiagnosticReport[]> {
    const annotatedReportsArr = new Array<Promise<AnnotatedDiagnosticReport>>();
    // Only check the code for radiologyReports
    if (codeGroup.resourceCodes.includes(
            DiagnosticReportCode.fromCodeString('RADRPT'))) {
      for (const report of this.diagnosticReports) {
        annotatedReportsArr.push(this.addAttachment(report));
      }
      return Promise.all(annotatedReportsArr)
          .then(annotatedReport => annotatedReport);
    }
  }
}

describe('DiagnosticReportCode', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule],
      providers: [
        ResourceCodeCreator,
        {provide: FhirService, useClass: DiagnosticReportStubFhirService},
        {
          provide: ConceptFileConfiguration,
          useValue: new ConceptFileConfiguration()
        },
      ]
    });
    (TestBed.get(ResourceCodeCreator) as ResourceCodeCreator)
        .loadAllConcepts.then(() => {
          stubFhir = TestBed.get(FhirService);
          diagnosticCodeGroup = new DiagnosticReportCodeGroup(
              stubFhir, 'radiology',
              [DiagnosticReportCode.fromCodeString('RADRPT')],
              new DisplayGrouping('lbl', 'red'), ChartType.DIAGNOSTIC);
        });
  }));

  it('should correctly create AnnotatedDiagnosticReport and call getAttachment()',
     (done: DoneFn) => {
       stubFhir.diagnosticReports = makeDiagnosticReports();
       const spy = spyOn(stubFhir, 'getAttachment').and.callThrough();
       diagnosticCodeGroup.getResourceFromFhir(interval).then(
           (annotatedReports: AnnotatedDiagnosticReport[]) => {
             expect(annotatedReports.length).toBe(2);
             for (let i = 0; i < annotatedReports.length; i++) {
               expect(annotatedReports[i].report)
                   .toEqual(stubFhir.diagnosticReports[i]);
               expect(annotatedReports[i].attachmentHtml).toBeDefined();
               expect(spy).toHaveBeenCalled();
             }
             done();
           });
     });

  it('should correctly create AnnotatedDiagnosticReport with undefined attachmentHtml' +
         ' if the presentedForm contentType does not equal text/html',
     (done: DoneFn) => {
       stubFhir.diagnosticReports = [new DiagnosticReport(
           {
             code: {text: 'RADRPT'},
             presentedForm: [
               {
                 contentType: 'wrongValue',
                 url: 'assets/demo_data/test_radReport/radReport_mockXRay.html'
               },
               {contentType: 'wrongValue', url: 'url'}
             ],
             status: 'unknown',
           },
           REQUEST_ID)];
       const spy = spyOn(stubFhir, 'getAttachment').and.callThrough();
       diagnosticCodeGroup.getResourceFromFhir(interval).then(
           annotatedReports => {
             expect(annotatedReports.length).toBe(1);
             for (let i = 0; i < annotatedReports.length; i++) {
               expect(annotatedReports[i].report)
                   .toEqual(stubFhir.diagnosticReports[i]);
               expect(annotatedReports[i].attachmentHtml).toBeUndefined();
               expect(spy).not.toHaveBeenCalled();
             }
             done();
           });
     });

  it('should correctly create AnnotatedDiagnosticReport with undefined attachmentHtml' +
         ' if the presentedForm does not exist',
     (done: DoneFn) => {
       stubFhir.diagnosticReports = [new DiagnosticReport(
           {
             code: {text: 'RADRPT'},
             status: 'unknown',
           },
           REQUEST_ID)];
       const spy = spyOn(stubFhir, 'getAttachment').and.callThrough();
       diagnosticCodeGroup.getResourceFromFhir(interval).then(
           (annotatedReports: AnnotatedDiagnosticReport[]) => {
             expect(annotatedReports.length).toBe(1);
             for (let i = 0; i < annotatedReports.length; i++) {
               expect(annotatedReports[i].report)
                   .toEqual(stubFhir.diagnosticReports[i]);
               expect(annotatedReports[i].attachmentHtml).toBeUndefined();
               expect(spy).not.toHaveBeenCalled();
             }
             done();
           });
     });

  it('should correctly return error message if the presentedForm does not ' +
         'contain a correct url',
     (done: DoneFn) => {
       stubFhir.diagnosticReports = [new DiagnosticReport(
           {
             code: {text: 'RADRPT'},
             presentedForm: [
               {contentType: 'text/html', url: 'wrong_url'},
             ],
             status: 'unknown',
           },
           REQUEST_ID)];
       const failureMessage = '404 Not Found.';
       const spy = spyOn(stubFhir, 'getAttachment')
                       .and.returnValue(Promise.resolve(failureMessage));
       diagnosticCodeGroup.getResourceFromFhir(interval).then(
           annotatedReports => {
             expect(annotatedReports.length).toBe(1);
             for (let i = 0; i < annotatedReports.length; i++) {
               expect(annotatedReports[i].report)
                   .toEqual(stubFhir.diagnosticReports[i]);
               expect(annotatedReports[i].attachmentHtml)
                   .toEqual(failureMessage);
               expect(spy).toHaveBeenCalled();
             }
             done();
           });
     });
});
