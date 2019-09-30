// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime} from 'luxon';

import {DiagnosticReportCode} from '../clinicalconcepts/diagnostic-report-code';

import {AnnotatedDiagnosticReport} from './annotated-diagnostic-report';
import {DiagnosticReport, DiagnosticServiceSectionCodes} from './diagnostic-report';

const REQUEST_ID = '1234';

const SAMPLE_RADIOLOGY = {
  category: {text: 'RADRPT'},
  code: {text: 'RADRPT'},
  effectiveDateTime: '2019-02-11T20:03:09.000Z',
  encounter: {reference: 'Encounter/2787906'},
  id: '5153487',
  issued: '2019-02-11T20:03:21.000Z',
  meta: {lastUpdated: '2019-02-11T20:03:21.000Z', versionId: '3'},
  performer: {display: 'Interfaced-Unknown'},
  presentedForm: [
    {
      contentType: 'text/html',
      url:
          'https://fhir-open.sandboxcerner.com/dstu2/0b8a0111-e8e6-4c26-a91c-5069cbc6b1ca/Binary/TR-5153487'
    },
    {
      contentType: 'application/pdf',
      url:
          'https://fhir-open.sandboxcerner.com/dstu2/0b8a0111-e8e6-4c26-a91c-5069cbc6b1ca/Binary/XR-5153487'
    }
  ],
  request: [{reference: 'ProcedureRequest/18954087'}],
  resourceType: 'DiagnosticReport',
  status: 'unknown',
  subject: {display: 'Peralta, Jake', reference: 'Patient/1316020'},
  text: {
    div:
        '<div><p><b>Diagnostic Report</b></p><p><b>Document Type</b>: RADRPT</p>' +
        '<p><b>Document Title</b>: XR Wrist Complete Left</p><p><b>Status</b>: Unknown</p>' +
        '<p><b>Verifying Provider</b>: Interfaced-Unknown</p><p><b>Ordering Provider</b>: ' +
        '<ul><li>Song, River</li></ul></p></div>',
    status: 'additional'
  }
};

describe('DiagnosticReport', () => {
  it('should get category from radiology json', () => {
    const dr = new DiagnosticReport(SAMPLE_RADIOLOGY, REQUEST_ID);
    expect(dr.category).toBe(DiagnosticServiceSectionCodes.RadiologyReport);
  });

  it('should get code from radiology json', () => {
    const dr = new DiagnosticReport(SAMPLE_RADIOLOGY, REQUEST_ID);
    expect(dr.code).toEqual(DiagnosticReportCode.fromCodeString('RADRPT'));
  });

  it('should get correct presentedForm from radiology json', () => {
    const contentType = ['text/html', 'application/pdf'];
    const dr = new DiagnosticReport(SAMPLE_RADIOLOGY, REQUEST_ID);
    // There should be two presentedForms: text/html and application/pdf
    for (const presented of dr.presentedForm) {
      expect(contentType).toContain(presented.contentType);
      expect(presented.url).toBeDefined();
    }
  });

  it('should get correct text from radiology json', () => {
    const dr = new DiagnosticReport(SAMPLE_RADIOLOGY, REQUEST_ID);
    const annotatedDr = new AnnotatedDiagnosticReport(dr);
    expect(annotatedDr.text.status).toEqual('additional');
    expect(annotatedDr.text.div)
        .toEqual(
            '<div><p><b>Diagnostic Report</b></p><p><b>Document Type</b>: RADRPT</p>' +
            '<p><b>Document Title</b>: XR Wrist Complete Left</p><p><b>Status</b>: Unknown</p>' +
            '<p><b>Verifying Provider</b>: Interfaced-Unknown</p><p><b>Ordering Provider</b>: ' +
            '<ul><li>Song, River</li></ul></p></div>');
  });

  it('should get effectiveDate from radiology json', () => {
    const dr = new DiagnosticReport(SAMPLE_RADIOLOGY, REQUEST_ID);
    expect(dr.timestamp).toEqual(DateTime.fromISO('2019-02-11T20:03:09.000Z'));
  });
});
