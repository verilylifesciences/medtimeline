// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Disable this check because it's for IE 11 compatibility and we're not worried
// about that in our testing code.
/* tslint:disable:object-literal-shorthand*/

import {async, TestBed} from '@angular/core/testing';
import {DateTime, Interval} from 'luxon';

import {RxNormCode} from '../clinicalconcepts/rx-norm';
import {AnnotatedObservation} from '../fhir-data-classes/annotated-observation';
import {AnnotatedAdministration, MedicationAdministrationSet} from '../fhir-data-classes/medication-administration';
import {AnnotatedDiagnosticReport} from '../fhir-data-classes/annotated-diagnostic-report';
import {MedicationOrderSet} from '../fhir-data-classes/medication-order';

import {Observation} from './../fhir-data-classes/observation';
import {ObservationSet} from './../fhir-data-classes/observation-set';
import {FhirService} from './../fhir.service';
// tslint:disable-next-line:max-line-length
import {makeMicrobioReports, makeEncounter, makeMedicationAdministration, makeMedicationOrder, makeSampleObservation, makeDiagnosticReports} from './../test_utils';
import {makeSampleDiscreteObservation, makeDiagnosticReportWithoutTextField} from './../test_utils';
import {LabeledSeries} from './labeled-series';

describe('LabeledSeries', () => {
  const firstAdministration = DateTime.fromISO('2018-09-12T11:00:00.000Z');
  const lastAdministration = DateTime.fromISO('2018-09-14T11:00:00.000Z');
  const medicationAdministrations = [
    makeMedicationAdministration(firstAdministration.toISO(), 525),
    makeMedicationAdministration(lastAdministration.toISO(), 750)
  ];
  const beginningOfEncounter = DateTime.utc(2018, 9, 10);
  const endOfEncounter = DateTime.utc(2018, 9, 15);
  const encounter = makeEncounter(beginningOfEncounter, endOfEncounter);
  const fhirServiceStub: any = {
    getMedicationAdministrationsWithOrder(id: string, code: RxNormCode) {
      return Promise.resolve(medicationAdministrations);
    }
  };

  beforeEach(async(() => {
    TestBed
        .configureTestingModule(
            {providers: [{provide: FhirService, useValue: fhirServiceStub}]})
        .compileComponents();
  }));

  const dateRange = Interval.fromDateTimes(
      DateTime.fromISO('2018-09-11T00:00:00.00'),
      DateTime.fromISO('2018-09-18T00:00:00.00'));

  const order = makeMedicationOrder();

  it('fromObservationSet should pass through coordinates', () => {
    const obsSet = new ObservationSet([
      new AnnotatedObservation(
          makeSampleObservation(1, DateTime.utc(1988, 3, 23))),
      new AnnotatedObservation(
          makeSampleObservation(10, DateTime.utc(1988, 3, 24))),
      new AnnotatedObservation(
          makeSampleObservation(100, DateTime.utc(1988, 3, 25)))
    ]);
    const lblSeries = LabeledSeries.fromObservationSet(obsSet, []);
    expect(lblSeries.coordinates).toEqual([
      [DateTime.utc(1988, 3, 23), 1], [DateTime.utc(1988, 3, 24), 10],
      [DateTime.utc(1988, 3, 25), 100]
    ]);
  });

  it('fromObservationSet should mark abnormal coordinates', () => {
    const obsSet = new ObservationSet([
      new AnnotatedObservation(
          makeSampleObservation(1, DateTime.utc(1988, 3, 23), undefined, 'A')),
      new AnnotatedObservation(
          makeSampleObservation(10, DateTime.utc(1988, 3, 24))),
      // This one is out of range.
      new AnnotatedObservation(
          makeSampleObservation(100, DateTime.utc(1988, 3, 25)))
    ]);
    const lblSeries = LabeledSeries.fromObservationSet(obsSet, []);
    expect(Array.from(lblSeries.abnormalCoordinates)).toEqual([
      DateTime.utc(1988, 3, 23).toISO(), DateTime.utc(1988, 3, 25).toISO()
    ]);
  });

  it('fromObservationSet should calculate display range ' +
         ' to include all points even if they are outside the normal range',
     () => {
       const obsSet = new ObservationSet([
         new AnnotatedObservation(
             makeSampleObservation(1, DateTime.utc(1988, 3, 23), [1, 90])),
         new AnnotatedObservation(
             makeSampleObservation(10, DateTime.utc(1988, 3, 24), [1, 90])),
         new AnnotatedObservation(
             makeSampleObservation(100, DateTime.utc(1988, 3, 25), [1, 90]))
       ]);

       const lblSeries = LabeledSeries.fromObservationSet(obsSet, []);
       expect(lblSeries.yDisplayBounds).toEqual([1, 100]);
     });

  it('fromObservationSet should add encounter endpoints to series', () => {
    const obsSet = new ObservationSet([
      new AnnotatedObservation(
          makeSampleObservation(1, DateTime.utc(2018, 9, 11))),
      new AnnotatedObservation(
          makeSampleObservation(10, DateTime.utc(2018, 9, 12))),
      new AnnotatedObservation(
          makeSampleObservation(100, DateTime.utc(2018, 9, 14)))
    ]);
    const lblSeries = LabeledSeries.fromObservationSet(obsSet, [encounter]);
    expect(lblSeries.coordinates).toEqual([
      [beginningOfEncounter.toUTC(), null], [DateTime.utc(2018, 9, 11), 1],
      [DateTime.utc(2018, 9, 12), 10], [DateTime.utc(2018, 9, 14), 100],
      [endOfEncounter.toUTC(), null]
    ]);
  });

  it('fromObservationSet should not add encounter endpoints without data',
     () => {
       const obsSet = new ObservationSet([]);
       const lblSeries = LabeledSeries.fromObservationSet(obsSet, [encounter]);
       expect(lblSeries.coordinates).toEqual([]);
     });

  it('fromObservationSetsDiscrete should calculate one series ' +
         ' with all points at the same y-Value',
     () => {
       const obsSet = new ObservationSet([
         new AnnotatedObservation(makeSampleDiscreteObservation(
             'yellow', DateTime.utc(1988, 3, 23))),
         new AnnotatedObservation(
             makeSampleDiscreteObservation('red', DateTime.utc(1988, 3, 24))),
         new AnnotatedObservation(
             makeSampleDiscreteObservation('blue', DateTime.utc(1988, 3, 25)))
       ]);

       const lblSeries =
           LabeledSeries.fromObservationSetsDiscrete([obsSet], 10, 'label', []);
       expect(lblSeries.coordinates).toEqual([
         [DateTime.utc(1988, 3, 23), 10], [DateTime.utc(1988, 3, 24), 10],
         [DateTime.utc(1988, 3, 25), 10]
       ]);
     });

  it('fromObservationSetDiscrete should mark qualitative abnormal coordinates',
     () => {
       const obsSet = new ObservationSet([
         new AnnotatedObservation(makeSampleDiscreteObservation(
             'yellow', DateTime.utc(1988, 3, 23))),
         new AnnotatedObservation(
             makeSampleDiscreteObservation('red', DateTime.utc(1988, 3, 24))),
         new AnnotatedObservation(makeSampleDiscreteObservation(
             'blue', DateTime.utc(1988, 3, 25), 'A'))
       ]);

       const lblSeries =
           LabeledSeries.fromObservationSetsDiscrete([obsSet], 10, 'label', []);
       expect(Array.from(lblSeries.abnormalCoordinates)).toEqual([
         DateTime.utc(1988, 3, 25).toISO()
       ]);
     });

  it('fromObservationSetDiscrete should mark quantitative abnormal coordinates ' +
         ' when they are out of the numerical range',
     () => {
       const quant =
           makeSampleObservation(1, DateTime.utc(1988, 3, 24), [-1000, -999]);

       const obsSet = new ObservationSet([
         new AnnotatedObservation(
             makeSampleObservation(1, DateTime.utc(1988, 3, 22), [0, 2])),
         new AnnotatedObservation(quant),
       ]);

       const lblSeries =
           LabeledSeries.fromObservationSetsDiscrete([obsSet], 10, 'label', []);
       expect(Array.from(lblSeries.abnormalCoordinates)).toEqual([
         DateTime.utc(1988, 3, 24).toISO()
       ]);
     });

  it('fromObservationSetDiscrete should mark qualitative abnormal coordinates ' +
         ' with non-standard valueset coding',
     () => {
       const requestId = '1234';
       const obsSet = new ObservationSet([
         new AnnotatedObservation(new Observation(
             {
               code: {
                 coding: [{system: 'http://loinc.org', code: '4090-7'}],
                 text: 'Vanc pk'
               },
               effectiveDateTime: '2019-02-14T00:00:00.000Z',
               interpretation: {text: 'ABN'},
               resourceType: 'Observation',
               status: 'final',
               valueCodeableConcept: {text: 'Trace graded/hpf'}
             },
             requestId)),
         new AnnotatedObservation(makeSampleDiscreteObservation(
             'red', DateTime.utc(1988, 3, 24), 'N', requestId)),
       ]);

       const lblSeries =
           LabeledSeries.fromObservationSetsDiscrete([obsSet], 10, 'label', []);
       expect(Array.from(lblSeries.abnormalCoordinates)).toEqual([
         DateTime.utc(2019, 2, 14).toISO()
       ]);
     });

  it('fromObservationSetDiscrete should mark quantitative abnormal coordinates ' +
         ' when they are marked abnormal of the numerical range',
     () => {
       const quant = makeSampleObservation(
           1, DateTime.utc(1988, 3, 24), [-1000, 999], 'A');

       const obsSet = new ObservationSet([
         new AnnotatedObservation(
             makeSampleObservation(1, DateTime.utc(1988, 3, 22), [0, 2])),
         new AnnotatedObservation(quant)
       ]);

       const lblSeries =
           LabeledSeries.fromObservationSetsDiscrete([obsSet], 10, 'label', []);
       expect(Array.from(lblSeries.abnormalCoordinates)).toEqual([
         DateTime.utc(1988, 3, 24).toISO()
       ]);
     });

  it('fromObservationSetDiscrete should add encounter endpoints to series',
     () => {
       const obsSet = new ObservationSet([
         new AnnotatedObservation(makeSampleDiscreteObservation(
             'yellow', DateTime.utc(2018, 9, 11))),
         new AnnotatedObservation(
             makeSampleDiscreteObservation('red', DateTime.utc(2018, 9, 12))),
         new AnnotatedObservation(
             makeSampleDiscreteObservation('blue', DateTime.utc(2018, 9, 14)))
       ]);

       const lblSeries = LabeledSeries.fromObservationSetsDiscrete(
           [obsSet], 10, 'label', [encounter]);

       expect(lblSeries.coordinates).toEqual([
         [encounter.period.start.toUTC(), null],
         [DateTime.utc(2018, 9, 11), 10], [DateTime.utc(2018, 9, 12), 10],
         [DateTime.utc(2018, 9, 14), 10], [encounter.period.end.toUTC(), null]
       ]);
     });

  it('fromObservationSetDiscrete should not add encounter endpoints without data',
     () => {
       const obsSet = new ObservationSet([]);

       const lblSeries = LabeledSeries.fromObservationSetsDiscrete(
           [obsSet], 10, 'label', [encounter]);
       expect(lblSeries.coordinates).toEqual([]);
     });

  it('fromMedicationOrder should pass through coordinates', (done: DoneFn) => {
    Promise.resolve(order.setMedicationAdministrations(fhirServiceStub))
        .then(result => {
          const lblSeries = LabeledSeries.fromMedicationOrder(
              order, dateRange, 'categorical');
          expect(lblSeries[0].coordinates).toEqual([
            [firstAdministration.toUTC(), 'categorical'],
            [lastAdministration.toUTC(), 'categorical']
          ]);
        });
    done();
  });

  it('fromMedicationOrder should correctly make a series for endpoints',
     (done: DoneFn) => {
       Promise.resolve(order.setMedicationAdministrations(fhirServiceStub))
           .then(result => {
             const lblSeries = LabeledSeries.fromMedicationOrder(
                 order, dateRange, 'categorical');
             const endpoints = lblSeries[1];
             expect(endpoints.coordinates).toEqual([
               [firstAdministration.toUTC(), 'categorical'],
               [lastAdministration.toUTC(), 'categorical']
             ]);
           });
       done();
     });

  it('fromMedicationOrder should use dosage y value when ' +
         'fixed y value not provided',
     (done: DoneFn) => {
       Promise.resolve(order.setMedicationAdministrations(fhirServiceStub))
           .then(result => {
             const lblSeries =
                 LabeledSeries.fromMedicationOrder(order, dateRange);
             expect(lblSeries[0].coordinates).toEqual([
               [firstAdministration.toUTC(), 525],
               [lastAdministration.toUTC(), 750]
             ]);
           });
       done();
     });

  it('fromMedicationOrderSet should combine orders to one series', () => {
    const order1 = makeMedicationOrder();
    const order2 = makeMedicationOrder();

    const medAdmin1 =
        makeMedicationAdministration(DateTime.utc(1965, 3, 22).toString(), 92);
    const medAdmin2 =
        makeMedicationAdministration(DateTime.utc(1965, 3, 23).toString(), 19);

    const medAdmin1Order2 =
        makeMedicationAdministration(DateTime.utc(1965, 3, 25).toString(), 23);
    const medAdmin2Order2 =
        makeMedicationAdministration(DateTime.utc(1965, 3, 26).toString(), 17);

    // Set administrations manually to avoid FHIR call.
    order1.administrationsForOrder = new MedicationAdministrationSet(
        [medAdmin1, medAdmin2].map(x => new AnnotatedAdministration(x, 0, 0)));
    order1.firstAdministration = medAdmin1;
    order1.lastAdmininistration = medAdmin2;

    order2.administrationsForOrder =
        new MedicationAdministrationSet([medAdmin1Order2, medAdmin2Order2].map(
            // annotations not important for this test
            x => new AnnotatedAdministration(x, 0, 0)));
    order2.firstAdministration = medAdmin1Order2;
    order2.lastAdmininistration = medAdmin2Order2;

    const medOrderSet = new MedicationOrderSet([order1, order2]);

    const lg = LabeledSeries.fromMedicationOrderSet(
        medOrderSet,
        Interval.fromDateTimes(
            DateTime.utc(1965, 3, 22), DateTime.utc(1965, 3, 26)),
        []);

    expect(lg.label).toEqual(medOrderSet.label);
    expect(lg.unit).toEqual(medOrderSet.unit);
    expect(lg.yDisplayBounds).toEqual([
      medOrderSet.minDose, medOrderSet.maxDose
    ]);
    expect(lg.coordinates).toEqual([
      [DateTime.utc(1965, 3, 22), 92], [DateTime.utc(1965, 3, 23), 19],
      [DateTime.utc(1965, 3, 25), 23], [DateTime.utc(1965, 3, 26), 17]
    ]);
  });

  it('fromMedicationOrderSet should add encounter endpoints to series', () => {
    const order1 = makeMedicationOrder();
    const order2 = makeMedicationOrder();

    const medAdmin1 =
        makeMedicationAdministration(DateTime.utc(2018, 9, 11).toString(), 92);
    const medAdmin2 =
        makeMedicationAdministration(DateTime.utc(2018, 9, 12).toString(), 19);

    const medAdmin1Order2 =
        makeMedicationAdministration(DateTime.utc(2018, 9, 13).toString(), 29);
    const medAdmin2Order2 =
        makeMedicationAdministration(DateTime.utc(2018, 9, 14).toString(), 17);

    // Set administrations manually to avoid FHIR call.
    order1.administrationsForOrder = new MedicationAdministrationSet(
        [medAdmin1, medAdmin2].map(x => new AnnotatedAdministration(x, 0, 0)));
    order1.firstAdministration = medAdmin1;
    order1.lastAdmininistration = medAdmin2;

    order2.administrationsForOrder =
        new MedicationAdministrationSet([medAdmin1Order2, medAdmin2Order2].map(
            // annotations not important for this test
            x => new AnnotatedAdministration(x, 0, 0)));
    order2.firstAdministration = medAdmin1Order2;
    order2.lastAdmininistration = medAdmin2Order2;

    const medOrderSet = new MedicationOrderSet([order1, order2]);

    const lg = LabeledSeries.fromMedicationOrderSet(
        medOrderSet, dateRange, [encounter]);

    expect(lg.coordinates).toEqual([
      [beginningOfEncounter, null], [DateTime.utc(2018, 9, 11), 92],
      [DateTime.utc(2018, 9, 12), 19], [DateTime.utc(2018, 9, 13), 29],
      [DateTime.utc(2018, 9, 14), 17], [endOfEncounter, null]
    ]);
  });

  it('fromMedicationOrderSet should not add encounter endpoints without data',
     () => {
       const lblSeries = LabeledSeries.fromMedicationOrderSet(
           new MedicationOrderSet([]), dateRange, [encounter]);
       expect(lblSeries.coordinates).toEqual([]);
     });

  it('fromMicrobioReport should make a series for' +
         'each interpretation in the report.',
     () => {
       const microbioReport = makeMicrobioReports()[0];
       const yAxisMap = new Map<number, string>();
       yAxisMap.set(10, 'Salmonella and Shigella Culture');
       yAxisMap.set(20, 'Ova and Parasite Exam');
       const series = LabeledSeries.fromMicrobioReport(
        microbioReport, DateTime.utc());
       expect(series.length).toEqual(2);
       expect(series[0].label).toEqual('id-NEGORFLORA-Final');
       expect(series[1].label).toEqual('id-CHECKRESULT-Final');
     });

  it('fromMicrobioReport should make a series for ' +
         'corrected statuses in the report',
     () => {
       const microbioReport = makeMicrobioReports()[2];
       const series = LabeledSeries.fromMicrobioReport(
        microbioReport, DateTime.utc());
       expect(series.length).toEqual(2);
       expect(series[0].label).toEqual('id3-NEGORFLORA-Corrected');
       expect(series[1].label).toEqual('id3-CHECKRESULT-Corrected');
     });

  it ('fromDiagnosticReport should make correct labeled series',
      () => {
        const diagnosticReport = makeDiagnosticReports()[0];
        const annotatedReport = new AnnotatedDiagnosticReport(diagnosticReport);
        const series = LabeledSeries.fromDiagnosticReport(annotatedReport,
          DateTime.utc());
        expect(series.length).toEqual(1);
        expect(series[0].label).toEqual('1-RAD');
      });

  it ('fromDiagnosticReport should make correct seriesLabel even if ' +
        'annotatedReport.text does not exist', () => {
        const diagnosticReport = makeDiagnosticReportWithoutTextField();
        const annotatedReport = new AnnotatedDiagnosticReport(diagnosticReport);
        const series = LabeledSeries.fromDiagnosticReport(annotatedReport,
          DateTime.utc());
        expect(series.length).toEqual(1);
        expect(series[0].label).toEqual('2-RAD');
      });

  it('fromDiagnosticReports should correctly calculate ' +
      'time and position for each Diagnostic Report Observation even if ' +
      'annotatedReport.text (Narrative) does not exist',
      () => {
        const diagnosticReport = makeDiagnosticReportWithoutTextField();
        const annotatedReport = new AnnotatedDiagnosticReport(diagnosticReport);
        const series = LabeledSeries.fromDiagnosticReport(annotatedReport,
          DateTime.utc());
        expect(series[0].coordinates[0]).toEqual([
          DateTime.fromISO('2019-02-12T22:31:02.000Z'), 'RAD']);
      });
});
/* tslint:enable:object-literal-shorthand*/
