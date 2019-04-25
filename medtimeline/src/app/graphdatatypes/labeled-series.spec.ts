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
import {MedicationOrderSet} from '../fhir-data-classes/medication-order';

import {Observation} from './../fhir-data-classes/observation';
import {ObservationSet} from './../fhir-data-classes/observation-set';
import {FhirService} from './../fhir.service';
// tslint:disable-next-line:max-line-length
import {makeDiagnosticReports, makeEncounter, makeMedicationAdministration, makeMedicationOrder, makeSampleObservationJson} from './../test_utils';
import {makeSampleDiscreteObservationJson} from './../test_utils';
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
      new AnnotatedObservation(new Observation(
          makeSampleObservationJson(1, DateTime.utc(1988, 3, 23)))),
      new AnnotatedObservation(new Observation(
          makeSampleObservationJson(10, DateTime.utc(1988, 3, 24)))),
      new AnnotatedObservation(new Observation(
          makeSampleObservationJson(100, DateTime.utc(1988, 3, 25))))
    ]);
    const lblSeries = LabeledSeries.fromObservationSet(obsSet, []);
    expect(lblSeries.coordinates).toEqual([
      [DateTime.utc(1988, 3, 23), 1], [DateTime.utc(1988, 3, 24), 10],
      [DateTime.utc(1988, 3, 25), 100]
    ]);
  });

  it('fromObservationSet should mark abnormal coordinates', () => {
    const obsSet = new ObservationSet([
      new AnnotatedObservation(new Observation(makeSampleObservationJson(
          1, DateTime.utc(1988, 3, 23), undefined, 'A'))),
      new AnnotatedObservation(new Observation(
          makeSampleObservationJson(10, DateTime.utc(1988, 3, 24)))),
      new AnnotatedObservation(new Observation(
          makeSampleObservationJson(100, DateTime.utc(1988, 3, 25))))
    ]);
    const lblSeries = LabeledSeries.fromObservationSet(obsSet, []);
    expect(Array.from(lblSeries.abnormalCoordinates)).toEqual([
      [DateTime.utc(1988, 3, 23), 1]
    ]);
  });

  it('fromObservationSet should calculate display range ' +
         ' to include all points even if they are outside the normal range',
     () => {
       const obsSet = new ObservationSet([
         new AnnotatedObservation(new Observation(
             makeSampleObservationJson(1, DateTime.utc(1988, 3, 23), [1, 90]))),
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             10, DateTime.utc(1988, 3, 24), [1, 90]))),
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             100, DateTime.utc(1988, 3, 25), [1, 90])))
       ]);

       const lblSeries = LabeledSeries.fromObservationSet(obsSet, []);
       expect(lblSeries.yDisplayBounds).toEqual([1, 100]);
     });

  it('fromObservationSet should add encounter endpoints to series', () => {
    const obsSet = new ObservationSet([
      new AnnotatedObservation(new Observation(
          makeSampleObservationJson(1, DateTime.utc(2018, 9, 11)))),
      new AnnotatedObservation(new Observation(
          makeSampleObservationJson(10, DateTime.utc(2018, 9, 12)))),
      new AnnotatedObservation(new Observation(
          makeSampleObservationJson(100, DateTime.utc(2018, 9, 14))))
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
         new AnnotatedObservation(
             new Observation(makeSampleDiscreteObservationJson(
                 'yellow', DateTime.utc(1988, 3, 23)))),
         new AnnotatedObservation(
             new Observation(makeSampleDiscreteObservationJson(
                 'red', DateTime.utc(1988, 3, 24)))),
         new AnnotatedObservation(
             new Observation(makeSampleDiscreteObservationJson(
                 'blue', DateTime.utc(1988, 3, 25))))
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
         new AnnotatedObservation(
             new Observation(makeSampleDiscreteObservationJson(
                 'yellow', DateTime.utc(1988, 3, 23)))),
         new AnnotatedObservation(
             new Observation(makeSampleDiscreteObservationJson(
                 'red', DateTime.utc(1988, 3, 24)))),
         new AnnotatedObservation(
             new Observation(makeSampleDiscreteObservationJson(
                 'blue', DateTime.utc(1988, 3, 25), 'A')))
       ]);

       const lblSeries =
           LabeledSeries.fromObservationSetsDiscrete([obsSet], 10, 'label', []);
       expect(Array.from(lblSeries.abnormalCoordinates)).toEqual([
         [DateTime.utc(1988, 3, 25), 10]
       ]);
     });

  it('fromObservationSetDiscrete should mark quantitative abnormal coordinates ' +
         ' when they are out of the numerical range',
     () => {
       const quantJson = makeSampleObservationJson(
           1, DateTime.utc(1988, 3, 24), [-1000, -999]);

       const quant = new Observation(quantJson);
       const obsSet = new ObservationSet([
         new AnnotatedObservation(new Observation(
             makeSampleObservationJson(1, DateTime.utc(1988, 3, 22), [0, 2]))),
         new AnnotatedObservation(quant),
       ]);

       const lblSeries =
           LabeledSeries.fromObservationSetsDiscrete([obsSet], 10, 'label', []);
       expect(Array.from(lblSeries.abnormalCoordinates)).toEqual([
         [DateTime.utc(1988, 3, 24), 10]
       ]);
     });

  it('fromObservationSetDiscrete should mark quantitative abnormal coordinates ' +
         ' when they are marked abnormal of the numerical range',
     () => {
       const quantJson = makeSampleObservationJson(
           1, DateTime.utc(1988, 3, 24), [-1000, 999], 'A');

       const quant = new Observation(quantJson);
       const obsSet = new ObservationSet([
         new AnnotatedObservation(new Observation(
             makeSampleObservationJson(1, DateTime.utc(1988, 3, 22), [0, 2]))),
         new AnnotatedObservation(quant)
       ]);

       const lblSeries =
           LabeledSeries.fromObservationSetsDiscrete([obsSet], 10, 'label', []);
       expect(Array.from(lblSeries.abnormalCoordinates)).toEqual([
         [DateTime.utc(1988, 3, 24), 10]
       ]);
     });

  it('fromObservationSetDiscrete should add encounter endpoints to series',
     () => {
       const obsSet = new ObservationSet([
         new AnnotatedObservation(
             new Observation(makeSampleDiscreteObservationJson(
                 'yellow', DateTime.utc(2018, 9, 11)))),
         new AnnotatedObservation(
             new Observation(makeSampleDiscreteObservationJson(
                 'red', DateTime.utc(2018, 9, 12)))),
         new AnnotatedObservation(
             new Observation(makeSampleDiscreteObservationJson(
                 'blue', DateTime.utc(2018, 9, 14))))
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

  it('fromDiagnosticReport should make a series for' +
         'each interpretation in the report.',
     () => {
       const diagnosticReport = makeDiagnosticReports()[0];
       const yAxisMap = new Map<number, string>();
       yAxisMap.set(10, 'Salmonella and Shigella Culture');
       yAxisMap.set(20, 'Ova and Parasite Exam');
       const series = LabeledSeries.fromDiagnosticReport(
           diagnosticReport, DateTime.fromJSDate(new Date()));
       expect(series.length).toEqual(2);
       expect(series[0].label).toEqual('id-NEGORFLORA-Final');
       expect(series[1].label).toEqual('id-CHECKRESULT-Final');
     });

  it('fromDiagnosticReport should make a series for ' +
         'corrected statuses in the report',
     () => {
       const diagnosticReport = makeDiagnosticReports()[2];
       const series = LabeledSeries.fromDiagnosticReport(
           diagnosticReport, DateTime.fromJSDate(new Date()));
       expect(series.length).toEqual(2);
       expect(series[0].label).toEqual('id3-NEGORFLORA-Corrected');
       expect(series[1].label).toEqual('id3-CHECKRESULT-Corrected');
     });
});
/* tslint:enable:object-literal-shorthand*/
