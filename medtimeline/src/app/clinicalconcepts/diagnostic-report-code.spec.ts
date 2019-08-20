// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime, Interval} from 'luxon';

import {ChartType} from '../graphtypes/graph/graph.component';
import {makeDiagnosticReports} from '../test_utils';
import {HttpClient, HttpClientModule} from '@angular/common/http';

import {DisplayGrouping} from './display-grouping';
import {DiagnosticReportCode, DiagnosticReportCodeGroup} from './diagnostic-report-code';
import {AnnotatedDiagnosticReport} from '../fhir-data-classes/annotated-diagnostic-report';
import {MockFhirService} from '../mock-fhir.service';
import {TestBed} from '@angular/core/testing';
import {DiagnosticReport} from '../fhir-data-classes/diagnostic-report';

const interval = Interval.fromDateTimes(
    DateTime.fromISO('2019-02-10T11:00:00.000Z').toUTC(),
    DateTime.fromISO('2019-02-15T11:00:00.000Z').toUTC());
const REQUEST_ID = '1234';

class DiagnosticReportStubFhirService extends MockFhirService {
  diagnosticReports: DiagnosticReport[];

  getAnnotatedDiagnosticReports(codes: DiagnosticReportCodeGroup,
      dateRange: Interval): Promise<AnnotatedDiagnosticReport[]> {
    const annotatedReportsArr = new Array<Promise<AnnotatedDiagnosticReport>>();
    // Only check the code for radiologyReports
    if (codes.resourceCodes.includes(DiagnosticReportCode.fromCodeString('RADRPT'))) {
      for (const report of this.diagnosticReports) {
        annotatedReportsArr.push(this.addAttachment(report));
      }
        return Promise.all(annotatedReportsArr).then(annotatedReport => annotatedReport);
    }
  }
}

describe('DiagnosticReportCode', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule]
    });
  });

  it('should correctly create AnnotatedDiagnosticReport and call getAttachment()' +
        ' in the mockFhirService', (done: DoneFn) => {
      const stubFhir = new DiagnosticReportStubFhirService(TestBed.get(HttpClient));
      stubFhir.diagnosticReports = makeDiagnosticReports();
      const diagnosticCodeGroup = new DiagnosticReportCodeGroup(
        stubFhir, 'radiology',
        [DiagnosticReportCode.fromCodeString('RADRPT')],
        new DisplayGrouping('lbl', 'red'), ChartType.DIAGNOSTIC);

      const spy = spyOn(stubFhir, 'getAttachment').and.callThrough();
      diagnosticCodeGroup.getResourceFromFhir(interval).then(annotatedReports => {
        expect(annotatedReports.length).toBe(2);
        for (let  i = 0; i < annotatedReports.length; i++) {
          expect(annotatedReports[i].report).toEqual(stubFhir.diagnosticReports[i]);
          expect(spy).toHaveBeenCalled();
        }
      done();
     });
   });

  it('should correctly create AnnotatedDiagnosticReport with undefined attachmentHtml' +
        ' if the presentedForm contentType does not equal text/html', (done: DoneFn) => {
      const stubFhir = new DiagnosticReportStubFhirService(TestBed.get(HttpClient));
      stubFhir.diagnosticReports =
      [
        new DiagnosticReport(
          {
            code: {
                text: 'RADRPT'
            },
            presentedForm: [
                {
                    contentType: 'wrongValue',
                    url: 'assets/demo_data/test_radReport/radReport_mockXRay.html'
                },
                {
                    contentType: 'wrongValue',
                    url: 'url'
                }
            ],
            status: 'unknown',
          }
          , REQUEST_ID)];
      const diagnosticCodeGroup = new DiagnosticReportCodeGroup(
        stubFhir, 'radiology',
        [DiagnosticReportCode.fromCodeString('RADRPT')],
        new DisplayGrouping('lbl', 'red'), ChartType.DIAGNOSTIC);

      const spy = spyOn(stubFhir, 'getAttachment').and.callThrough();
      diagnosticCodeGroup.getResourceFromFhir(interval).then(annotatedReports => {
        expect(annotatedReports.length).toBe(1);
        for (let  i = 0; i < annotatedReports.length; i++) {
          expect(annotatedReports[i].report).toEqual(stubFhir.diagnosticReports[i]);
          expect(annotatedReports[i].attachmentHtml).toBeUndefined();
          expect(spy).not.toHaveBeenCalled();
        }
      done();
     });
   });

  it('should correctly create AnnotatedDiagnosticReport with undefined attachmentHtml' +
        ' if the presentedForm does not exist', (done: DoneFn) => {
      const stubFhir = new DiagnosticReportStubFhirService(TestBed.get(HttpClient));
      stubFhir.diagnosticReports =
      [
        new DiagnosticReport(
          {
            code: {
                text: 'RADRPT'
            },
            status: 'unknown',
          }
          , REQUEST_ID)];
      const diagnosticCodeGroup = new DiagnosticReportCodeGroup(
        stubFhir, 'radiology',
        [DiagnosticReportCode.fromCodeString('RADRPT')],
        new DisplayGrouping('lbl', 'red'), ChartType.DIAGNOSTIC);

      const spy = spyOn(stubFhir, 'getAttachment').and.callThrough();
      diagnosticCodeGroup.getResourceFromFhir(interval).then(annotatedReports => {
        expect(annotatedReports.length).toBe(1);
        for (let  i = 0; i < annotatedReports.length; i++) {
          expect(annotatedReports[i].report).toEqual(stubFhir.diagnosticReports[i]);
          expect(annotatedReports[i].attachmentHtml).toBeUndefined();
          expect(spy).not.toHaveBeenCalled();
        }
      done();
     });
   });

  it('should correctly return error message if the presentedForm does not ' +
      'contain a correct url', (done: DoneFn) => {
    const stubFhir = new DiagnosticReportStubFhirService(TestBed.get(HttpClient));
    stubFhir.diagnosticReports =
    [
      new DiagnosticReport(
        {
          code: {
              text: 'RADRPT'
          },
          presentedForm: [
              {
                  contentType: 'text/html',
                  url: 'wrong_url'
              },
          ],
          status: 'unknown',
        }
        , REQUEST_ID)];
    const diagnosticCodeGroup = new DiagnosticReportCodeGroup(
      stubFhir, 'radiology',
      [DiagnosticReportCode.fromCodeString('RADRPT')],
      new DisplayGrouping('lbl', 'red'), ChartType.DIAGNOSTIC);

    const spy = spyOn(stubFhir, 'getAttachment').and.callThrough();
    diagnosticCodeGroup.getResourceFromFhir(interval).then(annotatedReports => {
      expect(annotatedReports.length).toBe(1);
      for (let  i = 0; i < annotatedReports.length; i++) {
        expect(annotatedReports[i].report).toEqual(stubFhir.diagnosticReports[i]);
        expect(annotatedReports[i].attachmentHtml)
          .toEqual('Http failure response for http://localhost:9876/wrong_url: 404 Not Found');
        expect(spy).toHaveBeenCalled();
      }
    done();
    });
  });

});
