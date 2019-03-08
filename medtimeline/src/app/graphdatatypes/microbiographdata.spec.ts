// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';

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
       expect(stepgraphdata.endpointSeries.length).toEqual(3);
       // All the endpoint series are also in the master series list.
       expect(stepgraphdata.series.length).toEqual(3);
     });

  it('fromDiagnosticReports should correctly calculate' +
         ' y axis map',
     () => {
       const diagnosticReports = makeDiagnosticReports();
       const stepgraphdata = MicrobioGraphData.fromDiagnosticReports(
           diagnosticReports, 'Stool', TestBed.get(DomSanitizer));
       expect(stepgraphdata.yAxisMap.get(10)).toEqual('Ova and Parasite Exam');
       expect(stepgraphdata.yAxisMap.get(20))
           .toEqual('Salmonella and Shigella Culture');
     });

  it('fromDiagnosticReports should correctly calculate ' +
         'time and position for each Diagnostic Report Observation',
     () => {
       const diagnosticReports = makeDiagnosticReports();
       const stepgraphdata = MicrobioGraphData.fromDiagnosticReports(
           diagnosticReports, 'Stool', TestBed.get(DomSanitizer));
       const series1 = stepgraphdata.endpointSeries[0];
       expect(series1.xValues[0].toString())
           .toEqual('2018-08-31T13:48:00.000-04:00');
       expect(series1.yValues[0]).toEqual(10);
       const series2 = stepgraphdata.endpointSeries[1];
       expect(series2.xValues[0].toString())
           .toEqual('2018-08-31T13:48:00.000-04:00');
       expect(series2.yValues[0]).toEqual(20);
     });
});
