// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {DateTime} from 'luxon';

import {FhirService} from '../fhir.service';
import {makeDiagnosticReports} from '../test_utils';

import {DiagnosticGraphData} from './diagnosticgraphdata';
import {AnnotatedDiagnosticReport} from '../fhir-data-classes/annotated-diagnostic-report';

describe('DiagnosticGraphData', () => {
  let fhirServiceStub: any;

  beforeEach(async(() => {
    TestBed.configureTestingModule(
        {providers: [{provide: FhirService, useValue: fhirServiceStub}]});
    fhirServiceStub = {};
  }));

  it('fromDiagnosticReports should correctly calculate a ' +
         'LabeledSeries for each DiagnosticReport.',
    () => {
      const diagnosticReports = makeDiagnosticReports();
      const annotatedDiagnosticReports = diagnosticReports
                    .map(report => new AnnotatedDiagnosticReport(report));
      const diagnosticgraphdata = DiagnosticGraphData.fromDiagnosticReports(
        annotatedDiagnosticReports, TestBed.get(DomSanitizer));
      expect(diagnosticgraphdata.series.length).toEqual(2);
    });

  it('fromDiagnosticReports should correctly calculate ' +
         'time and position for each Diagnostic Report Observation',
    () => {
      const diagnosticReports = makeDiagnosticReports();
      const annotatedDiagnosticReports = diagnosticReports
                    .map(report => new AnnotatedDiagnosticReport(report));
      const diagnosticgraphdata = DiagnosticGraphData.fromDiagnosticReports(
        annotatedDiagnosticReports, TestBed.get(DomSanitizer));

      const series1 = diagnosticgraphdata.series[0];
      expect(series1.coordinates[0]).toEqual([
        DateTime.fromISO('2019-02-11T20:03:09.000Z'), 'XR']);

      const series2 = diagnosticgraphdata.series[1];
      expect(series2.coordinates[0]).toEqual([
        DateTime.fromISO('2019-02-12T22:31:02.000Z'), 'CT']);
    });
});
