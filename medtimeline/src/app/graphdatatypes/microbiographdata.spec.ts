// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {DateTime} from 'luxon';

import {FhirService} from '../fhir.service';
import {makeDiagnosticReports} from '../test_utils';

import {MicrobioGraphData} from './microbiographdata';

describe('MicrobioGraphData', () => {
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
       const stepgraphdata = MicrobioGraphData.fromDiagnosticReports(
           diagnosticReports, 'Stool', TestBed.get(DomSanitizer));
       expect(stepgraphdata.dataSeries.length).toEqual(3);
       // All the endpoint series are also in the master series list.
       expect(stepgraphdata.series.length).toEqual(3);
     });

  it('fromDiagnosticReports should correctly calculate ' +
         'time and position for each Diagnostic Report Observation',
     () => {
       const diagnosticReports = makeDiagnosticReports();
       const stepgraphdata = MicrobioGraphData.fromDiagnosticReports(
           diagnosticReports, 'Stool', TestBed.get(DomSanitizer));
       const series1 = stepgraphdata.dataSeries[0];
       expect(series1.coordinates[0]).toEqual([
         DateTime.fromISO('2018-08-31T13:48:00.000-04:00'),
         'Ova and Parasite Exam'
       ]);
       const series2 = stepgraphdata.dataSeries[1];
       expect(series2.coordinates[0]).toEqual([
         DateTime.fromISO('2018-08-31T13:48:00.000-04:00'),
         'Salmonella and Shigella Culture'
       ]);
     });
});
