// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime, Interval} from 'luxon';

import {AnnotatedAdministration, MedicationAdministration, MedicationAdministrationSet} from '../fhir-data-classes/medication-administration';
import {MedicationOrderSet} from '../fhir-data-classes/medication-order';
import {Observation} from '../fhir-data-classes/observation';
import {ObservationSet} from '../fhir-data-classes/observation-set';
import {makeMedicationAdministration, makeMedicationOrder, medicationCodingConcept} from '../test_utils';
import {makeSampleDiscreteObservationJson, makeSampleObservationJson} from '../test_utils';

import {LineGraphData} from './linegraphdata';

describe('LineGraphData', () => {
  it('LinegraphData.fromObservationSetList should have one LabeledSeries for' +
         'each ObservationSet passed in',
     () => {
       const obsSet = new ObservationSet([
         new Observation(
             makeSampleObservationJson(10, DateTime.utc(1988, 3, 23), [1, 90])),
         new Observation(
             makeSampleObservationJson(10, DateTime.utc(1988, 3, 24), [1, 90])),
         new Observation(
             makeSampleObservationJson(10, DateTime.utc(1988, 3, 25), [1, 90]))
       ]);
       const obsSetList = new Array(obsSet, obsSet, obsSet);

       const lgData = LineGraphData.fromObservationSetList('lbl', obsSetList);

       expect(lgData.series.length).toBe(3);
     });

  it('LinegraphData.fromObservationSetList should set y axis display so that' +
         'all the points are visible',
     () => {
       const obsSet1 = new ObservationSet([
         new Observation(makeSampleObservationJson(
             -10, DateTime.utc(1988, 3, 23), [1, 90])),
         new Observation(
             makeSampleObservationJson(1, DateTime.utc(1988, 3, 24), [1, 90])),
         new Observation(
             makeSampleObservationJson(10, DateTime.utc(1988, 3, 25), [1, 90]))
       ]);

       const obsSet2 = new ObservationSet([
         new Observation(makeSampleObservationJson(
             100, DateTime.utc(1988, 3, 23), [1, 90])),
         new Observation(
             makeSampleObservationJson(10, DateTime.utc(1988, 3, 24), [1, 90])),
         new Observation(
             makeSampleObservationJson(1, DateTime.utc(1988, 3, 25), [1, 90]))
       ]);
       const obsSetList = new Array(obsSet1, obsSet2);

       const lgData = LineGraphData.fromObservationSetList('lbl', obsSetList);

       expect(lgData.yAxisDisplayBounds).toEqual([-10, 100]);
     });

  it('LinegraphData.fromMedicationOrderSet should have one data series' +
         ' for all the orders',
     () => {
       const order1 = makeMedicationOrder();
       const order2 = makeMedicationOrder();
       const medAdmin1 = makeMedicationAdministration(
           DateTime.utc(1988, 3, 23).toString(), 95);
       const medAdmin2 = makeMedicationAdministration(
           DateTime.utc(1988, 3, 24).toString(), 100);

       const medAdmin1Order2 = makeMedicationAdministration(
           DateTime.utc(1988, 3, 26).toString(), 105);
       const medAdmin2Order2 = makeMedicationAdministration(
           DateTime.utc(1988, 3, 27).toString(), 110);

       // Set administrations manually to avoid FHIR call.
       order1.administrationsForOrder =
           new MedicationAdministrationSet([medAdmin1, medAdmin2].map(
               // annotations not important for this test
               x => new AnnotatedAdministration(x, 0, 0)));
       order1.firstAdministration = medAdmin1;
       order1.lastAdmininistration = medAdmin2;

       order2.administrationsForOrder = new MedicationAdministrationSet(
           [medAdmin1Order2, medAdmin2Order2].map(
               // annotations not important for this test
               x => new AnnotatedAdministration(x, 0, 0)));
       order2.firstAdministration = medAdmin1Order2;
       order2.lastAdmininistration = medAdmin2Order2;

       const medOrderSet = new MedicationOrderSet([order1, order2]);

       const lgData = LineGraphData.fromMedicationOrderSet(
           medOrderSet,
           Interval.fromDateTimes(
               DateTime.utc(1988, 3, 22), DateTime.utc(1988, 3, 28)));

       expect(lgData.series.length).toBe(1);

       const series = lgData.series[0];
       expect(series.xValues.length).toBe(4);
       expect(series.yValues.length).toBe(4);

       expect(series.xValues).toEqual([
         medAdmin1.timestamp, medAdmin2.timestamp, medAdmin1Order2.timestamp,
         medAdmin2Order2.timestamp
       ]);
       expect(series.yValues).toEqual([95, 100, 105, 110]);
     });

  it('LinegraphData.fromObservationSetListDiscrete should calculate one' +
         'LabeledSeries for all ObservationSets.',
     () => {
       const obsSet1 = new ObservationSet(
           [new Observation(makeSampleDiscreteObservationJson(
               'yellow', DateTime.utc(1988, 3, 23)))]);

       const obsSet2 = new ObservationSet(
           [new Observation(makeSampleDiscreteObservationJson(
               'blue', DateTime.utc(1988, 3, 23)))]);
       const obsSetList = new Array(obsSet1, obsSet2);

       const lgData =
           LineGraphData.fromObservationSetListDiscrete('lbl', obsSetList);

       expect(lgData.series.length).toEqual(1);
     });

  it('LinegraphData.fromObservationSetListDiscrete should calculate tooltip' +
         'categories correctly.',
     () => {
       const obsSet1 = new ObservationSet(
           [new Observation(makeSampleDiscreteObservationJson(
               'yellow', DateTime.utc(1988, 3, 23)))]);

       const obsSet2 = new ObservationSet(
           [new Observation(makeSampleDiscreteObservationJson(
               'blue', DateTime.utc(1988, 3, 23)))]);
       const obsSetList = new Array(obsSet1, obsSet2);

       const lgData =
           LineGraphData.fromObservationSetListDiscrete('lbl', obsSetList);

       expect(lgData.tooltipCategories).toBeDefined();
       // There was one date in the list of ObservationSets, which
       // corresponds to one entry in the tooltip.
       const values = Array.from(lgData.tooltipCategories.values());
       expect(values.length).toEqual(1);
       // The above tooltip entry would have two rows, each corresponding
       // to one Observation.
       expect(values[0].length).toEqual(2);
     });
});
