// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, TestBed} from '@angular/core/testing';
import {DateTime, Interval} from 'luxon';
import {of} from 'rxjs';

import {MedicationOrderSet} from '../fhir-data-classes/medication-order';
import {FhirService} from '../fhir.service';
import {makeDiagnosticReports, makeMedicationAdministration, makeMedicationOrder} from '../test_utils';

import {StepGraphData} from './stepgraphdata';

describe('StepGraphData', () => {
  let fhirServiceStub: any;
  const dateRangeStart = '2018-09-09T00:00:00.00';
  const dateRangeEnd = '2018-09-18T00:00:00.00';
  const dateRange = Interval.fromDateTimes(
      DateTime.fromISO(dateRangeStart), DateTime.fromISO(dateRangeEnd));
  const admin1Time = '2018-09-10T11:00:00.000Z';
  const admin2Time = '2018-09-12T11:00:00.000Z';
  const medicationAdministrations = [
    makeMedicationAdministration(admin1Time),
    makeMedicationAdministration(admin2Time)
  ];

  beforeEach(async(() => {
    TestBed.configureTestingModule(
        {providers: [{provide: FhirService, useValue: fhirServiceStub}]});
    fhirServiceStub = {
      getMedicationAdministrationsWithOrder(id: string) {
        return of(medicationAdministrations).toPromise();
      }
    };
  }));

  it('StepGraphData.fromMedicationOrderSetList should correctly calculate' +
         ' the two series for a MedicationOrderSet',
     (done: DoneFn) => {
       const earliestMedicationOrder = makeMedicationOrder();
       earliestMedicationOrder.setMedicationAdministrations(fhirServiceStub);
       Promise
           .resolve(earliestMedicationOrder.setMedicationAdministrations(
               fhirServiceStub))
           .then(result => {
             const medOrderSet =
                 new MedicationOrderSet([earliestMedicationOrder]);

             const data = StepGraphData.fromMedicationOrderSetList(
                 [medOrderSet], dateRange);
             const allSeries = data.series;
             const endpointSeries = data.endpointSeries;
             // The adminSeries holds both the adminSeries and the
             // endpointSeries; it's redundantly stored due to the constraints
             // of inheritance from graphData and all the stuff that's needed
             // to make things like custom legends work.
             expect(allSeries.length).toEqual(2);
             // for the administration series
             expect(allSeries[0].xValues[0].toString()).toEqual(admin1Time);
             expect(allSeries[0].xValues[1].toString()).toEqual(admin2Time);
             // for the end point series
             expect(allSeries[1].xValues[0].toString()).toEqual(admin1Time);
             expect(allSeries[1].xValues[1].toString()).toEqual(admin2Time);

             expect(endpointSeries.length).toEqual(1);
             expect(endpointSeries[0].xValues[0].toString())
                 .toEqual(admin1Time);
             expect(endpointSeries[0].xValues[1].toString())
                 .toEqual(admin2Time);
             done();
           });
     });

  it('StepGraphData.fromMedicationOrderSetList should correctly calculate' +
         'y axis numerical to discrete map',
     () => {
       const earliestMedicationOrder = makeMedicationOrder();
       earliestMedicationOrder.setMedicationAdministrations(fhirServiceStub);
       Promise
           .resolve(earliestMedicationOrder.setMedicationAdministrations(
               fhirServiceStub))
           .then(result => {
             const medOrderSet =
                 new MedicationOrderSet([earliestMedicationOrder]);

             const data = StepGraphData.fromMedicationOrderSetList(
                 [medOrderSet], dateRange);

             expect(data.yAxisMap.get(10)).toEqual('vancomycin');
           });
     });

  it('StepGraphData.fromDiagnosticReports should correctly calculate a' +
         ' LabeledSeries for each DiagnosticReport.',
     () => {
       const diagnosticReports = makeDiagnosticReports();
       const stepgraphdata =
           StepGraphData.fromDiagnosticReports(diagnosticReports, 'Stool');
       // One series per diagnostic report status/result combination.
       expect(stepgraphdata.series.length).toEqual(3);
       // All of them are endpoint series.
       expect(stepgraphdata.endpointSeries.length).toEqual(3);
     });

  it('StepGraphData.fromDiagnosticReports should correctly calculate y axis map',
     () => {
       const diagnosticReports = makeDiagnosticReports();
       const stepgraphdata =
           StepGraphData.fromDiagnosticReports(diagnosticReports, 'Stool');
       expect(stepgraphdata.yAxisMap.get(10)).toEqual('Ova and Parasite Exam');
       expect(stepgraphdata.yAxisMap.get(20))
           .toEqual('Salmonella and Shigella Culture');
     });

  it('StepGraphData.fromDiagnosticReports should correctly calculate ' +
         'time and position for each Diagnostic Report Observation',
     () => {
       const diagnosticReports = makeDiagnosticReports();
       const stepgraphdata =
           StepGraphData.fromDiagnosticReports(diagnosticReports, 'Stool');
       const series1 = stepgraphdata.endpointSeries[0];
       expect(series1.xValues[0].toString())
           .toEqual('2018-08-31T13:48:00.000-04:00');
       expect(series1.yValues[0]).toEqual(10);
       const series2 = stepgraphdata.endpointSeries[1];
       expect(series2.xValues[0].toString())
           .toEqual('2018-08-31T13:48:00.000-04:00');
       expect(series2.yValues[0]).toEqual(20);
     });

  it('StepGraphData.fromDiagnosticReports should correctly calculate idMap',
     () => {
       const diagnosticReports = makeDiagnosticReports();
       const stepgraphdata =
           StepGraphData.fromDiagnosticReports(diagnosticReports, 'Stool');
       const idMap = stepgraphdata.idMap;
       const firstReport: any = idMap.get('id');
       const secondReport: any = idMap.get('id2');
       expect(firstReport.id).toEqual('id');
       expect(secondReport.id).toEqual('id2');
     });
});
