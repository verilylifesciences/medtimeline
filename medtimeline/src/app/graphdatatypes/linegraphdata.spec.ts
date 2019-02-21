// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import * as d3 from 'd3';
import {DateTime, Interval} from 'luxon';

import {labResult} from '../clinicalconcepts/display-grouping';
import {LOINCCode, LOINCCodeGroup} from '../clinicalconcepts/loinc-code';
import {AnnotatedObservation} from '../fhir-data-classes/annotated-observation';
import {AnnotatedAdministration, MedicationAdministrationSet} from '../fhir-data-classes/medication-administration';
import {MedicationOrderSet} from '../fhir-data-classes/medication-order';
import {Observation} from '../fhir-data-classes/observation';
import {ObservationSet} from '../fhir-data-classes/observation-set';
import {ChartType} from '../graphtypes/graph/graph.component';
import {MedicationAdministrationTooltip} from '../graphtypes/tooltips/medication-tooltips';
import {GenericAnnotatedObservationTooltip} from '../graphtypes/tooltips/observation-tooltips';
import {makeMedicationAdministration, makeMedicationOrder, StubFhirService} from '../test_utils';
import {makeSampleDiscreteObservationJson, makeSampleObservationJson} from '../test_utils';

import {LineGraphData} from './linegraphdata';

describe('LineGraphData', () => {
  const normalRange: [number, number] = [1, 30];
  const loincCodeGroup = new LOINCCodeGroup(
      new StubFhirService(), 'lbl',
      [new LOINCCode('4090-7', labResult, 'Vanc Pk', true)], labResult,
      ChartType.LINE, [0, 50], false);

  it('fromObservationSetList should have one LabeledSeries for' +
         'each ObservationSet passed in',
     () => {
       const obsSet = new ObservationSet([
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             10, DateTime.utc(1988, 3, 23), [1, 90]))),
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             10, DateTime.utc(1988, 3, 24), [1, 90]))),
         new AnnotatedObservation(new Observation(
             makeSampleObservationJson(10, DateTime.utc(1988, 3, 25), [1, 90])))
       ]);
       const obsSetList = new Array(obsSet, obsSet, obsSet);

       const lgData = LineGraphData.fromObservationSetList(
           'lbl', obsSetList, loincCodeGroup, TestBed.get(DomSanitizer));

       expect(lgData.series.length).toBe(3);
     });

  it('fromObservationSetList should pass in the tooltips correctly', () => {
    const obs1 = new AnnotatedObservation(
        new Observation(
            makeSampleObservationJson(10, DateTime.utc(1988, 3, 23), [1, 90])),
        [['labelA', 'valueA']]);
    const obs2 = new AnnotatedObservation(
        new Observation(
            makeSampleObservationJson(10, DateTime.utc(1988, 3, 24), [1, 90])),
        [['labelB', 'valueB']]);
    const obsSet = new ObservationSet([
      obs1, obs2,
      new AnnotatedObservation(new Observation(
          makeSampleObservationJson(10, DateTime.utc(1988, 3, 25), [1, 90])))
    ]);

    const lgData = LineGraphData.fromObservationSetList(
        'lbl', new Array(obsSet), loincCodeGroup, TestBed.get(DomSanitizer));

    expect(lgData.tooltipMap.size).toBe(2);
    expect(lgData.tooltipMap.get('575078400000'))
        .toEqual(
            new GenericAnnotatedObservationTooltip(true, d3.rgb(0, 48, 135))
                .getTooltip(obs1, TestBed.get(DomSanitizer)));

    expect(lgData.tooltipMap.get('575164800000'))
        .toEqual(
            new GenericAnnotatedObservationTooltip(true, d3.rgb(0, 48, 135))
                .getTooltip(obs2, TestBed.get(DomSanitizer)));
  });

  it('fromObservationSetList should handle two tooltips for same timestamp',
     () => {
       const obs1 = new AnnotatedObservation(
           new Observation(makeSampleObservationJson(
               10, DateTime.utc(1988, 3, 23), [1, 90])),
           [['labelA', 'valueA']]);
       const obs2 = new AnnotatedObservation(
           new Observation(makeSampleObservationJson(
               10, DateTime.utc(1988, 3, 23), [1, 90])),
           [['labelB', 'valueB']]);
       const obsSet = new ObservationSet([
         obs1, obs2,
         new AnnotatedObservation(new Observation(
             makeSampleObservationJson(10, DateTime.utc(1988, 3, 25), [1, 90])))
       ]);

       const lgData = LineGraphData.fromObservationSetList(
           'lbl', new Array(obsSet), loincCodeGroup, TestBed.get(DomSanitizer));

       expect(lgData.tooltipMap.size).toBe(1);
       expect(lgData.tooltipMap.get('575078400000'))
           .toEqual(
               new GenericAnnotatedObservationTooltip(true, d3.rgb(0, 48, 135))
                   .getTooltip(obs1, TestBed.get(DomSanitizer)) +
               new GenericAnnotatedObservationTooltip(false, d3.rgb(0, 48, 135))
                   .getTooltip(obs2, TestBed.get(DomSanitizer)));
     });

  it('fromObservationSetList should set y axis display so that' +
         ' all the points are visible as long as within display bounds',
     () => {
       const obsSet1 = new ObservationSet([
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             10, DateTime.utc(1988, 3, 23), normalRange))),
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             1, DateTime.utc(1988, 3, 24), normalRange))),
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             10, DateTime.utc(1988, 3, 25), normalRange)))
       ]);

       const obsSet2 = new ObservationSet([
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             40, DateTime.utc(1988, 3, 23), normalRange))),
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             10, DateTime.utc(1988, 3, 24), normalRange))),
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             1, DateTime.utc(1988, 3, 25), normalRange)))
       ]);
       const obsSetList = new Array(obsSet1, obsSet2);

       const lgData = LineGraphData.fromObservationSetList(
           'lbl', obsSetList, loincCodeGroup, TestBed.get(DomSanitizer));

       expect(lgData.yAxisDisplayBounds).toEqual([1, 40]);
     });


  it('fromObservationSetList should throw error if there are multiple units',
     () => {
       const obsSet1 =
           new ObservationSet([new AnnotatedObservation(new Observation({
             code: {
               coding: [{system: 'http://loinc.org', code: '4090-7'}],
               text: 'Vanc Pk'
             },
             effectiveDateTime: DateTime.utc(1957, 1, 14).toISO(),
             valueQuantity: {value: '50', unit: 'unitA'},
           }))]);

       const obsSet2 =
           new ObservationSet([new AnnotatedObservation(new Observation({
             code: {
               coding: [{system: 'http://loinc.org', code: '4090-7'}],
               text: 'Vanc Pk'
             },
             effectiveDateTime: DateTime.utc(1957, 1, 14).toISO(),
             valueQuantity: {value: '50', unit: 'unitB'},
           }))]);

       expect(() => {
         const obsSetList = new Array(obsSet1, obsSet2);

         const lgData = LineGraphData.fromObservationSetList(
             'lbl', obsSetList, loincCodeGroup, TestBed.get(DomSanitizer));
       }).toThrowError();
     });


  it('fromObservationSetList should set y axis display as display' +
         ' bounds if min/max of data fall outside of this range',
     () => {
       const obsSet1 = new ObservationSet([
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             100, DateTime.utc(1988, 3, 23), normalRange))),
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             -10, DateTime.utc(1988, 3, 24), normalRange))),
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             10, DateTime.utc(1988, 3, 25), normalRange)))
       ]);

       const obsSet2 = new ObservationSet([
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             -40, DateTime.utc(1988, 3, 23), normalRange))),
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             10, DateTime.utc(1988, 3, 24), normalRange))),
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             1, DateTime.utc(1988, 3, 25), normalRange)))
       ]);
       const obsSetList = new Array(obsSet1, obsSet2);

       const lgData = LineGraphData.fromObservationSetList(
           'lbl', obsSetList, loincCodeGroup, TestBed.get(DomSanitizer));

       expect(lgData.yAxisDisplayBounds).toEqual([0, 50]);
     });

  it('fromObservationSetList should set y axis display correctly' +
         ' if points fall outside display bound range in only one direction',
     () => {
       const obsSet1 = new ObservationSet([
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             100, DateTime.utc(1988, 3, 23), normalRange))),
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             1, DateTime.utc(1988, 3, 24), normalRange))),
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             10, DateTime.utc(1988, 3, 25), normalRange)))
       ]);

       const obsSet2 = new ObservationSet([
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             5, DateTime.utc(1988, 3, 23), normalRange))),
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             10, DateTime.utc(1988, 3, 24), normalRange))),
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             6, DateTime.utc(1988, 3, 25), normalRange)))
       ]);
       const obsSetList = new Array(obsSet1, obsSet2);

       const lgData = LineGraphData.fromObservationSetList(
           'lbl', obsSetList, loincCodeGroup, TestBed.get(DomSanitizer));

       expect(lgData.yAxisDisplayBounds).toEqual([1, 50]);
     });

  it('fromObservationSetList should set y axis display as bounds ' +
         ' passed in if forceDisplayBounds is true',
     () => {
       const obsSet1 = new ObservationSet([
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             40, DateTime.utc(1988, 3, 23), normalRange))),
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             1, DateTime.utc(1988, 3, 24), normalRange))),
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             10, DateTime.utc(1988, 3, 25), normalRange)))
       ]);

       const obsSet2 = new ObservationSet([
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             5, DateTime.utc(1988, 3, 23), normalRange))),
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             10, DateTime.utc(1988, 3, 24), normalRange))),
         new AnnotatedObservation(new Observation(makeSampleObservationJson(
             6, DateTime.utc(1988, 3, 25), normalRange)))
       ]);
       const obsSetList = new Array(obsSet1, obsSet2);


       const loincCodeGroup2 = new LOINCCodeGroup(
           new StubFhirService(), 'lbl',
           [new LOINCCode('4090-7', labResult, 'Vanc Pk', true)], labResult,
           ChartType.LINE, [0, 50], true);
       const lgData = LineGraphData.fromObservationSetList(
           'lbl', obsSetList, loincCodeGroup2, TestBed.get(DomSanitizer));

       expect(lgData.yAxisDisplayBounds).toEqual([0, 50]);
     });

  it('fromMedicationOrderSet should have one data series' +
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
               DateTime.utc(1988, 3, 22), DateTime.utc(1988, 3, 28)),
           TestBed.get(DomSanitizer));

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


  it('fromMedicationOrderSet should handle tooltips', () => {
    const order1 = makeMedicationOrder();

    const medAdmin1 =
        makeMedicationAdministration(DateTime.utc(1988, 3, 23).toString(), 95);
    const medAdmin2 =
        makeMedicationAdministration(DateTime.utc(1988, 3, 23).toString(), 100);

    // Set administrations manually to avoid FHIR call.
    order1.administrationsForOrder =
        new MedicationAdministrationSet([medAdmin1, medAdmin2].map(
            // annotations not important for this test
            x => new AnnotatedAdministration(x, 1, 1)));
    order1.firstAdministration = medAdmin1;
    order1.lastAdmininistration = medAdmin2;

    const medOrderSet = new MedicationOrderSet([order1]);

    const lgData = LineGraphData.fromMedicationOrderSet(
        medOrderSet,
        Interval.fromDateTimes(
            DateTime.utc(1988, 3, 22), DateTime.utc(1988, 3, 28)),
        TestBed.get(DomSanitizer));

    expect(lgData.tooltipMap.size).toBe(1);
    expect(lgData.tooltipMap.get('575078400000'))
        .toBe(
            new MedicationAdministrationTooltip().getTooltip(
                [new AnnotatedAdministration(medAdmin1, 1, 1)],
                TestBed.get(DomSanitizer)) +
            new MedicationAdministrationTooltip().getTooltip(
                [new AnnotatedAdministration(medAdmin2, 1, 1)],
                TestBed.get(DomSanitizer)));
  });

  it('fromObservationSetListDiscrete should calculate one' +
         'LabeledSeries for all ObservationSets.',
     () => {
       const obsSet1 = new ObservationSet([new AnnotatedObservation(
           new Observation(makeSampleDiscreteObservationJson(
               'yellow', DateTime.utc(1988, 3, 23))))]);

       const obsSet2 = new ObservationSet([new AnnotatedObservation(
           new Observation(makeSampleDiscreteObservationJson(
               'blue', DateTime.utc(1988, 3, 23))))]);
       const obsSetList = new Array(obsSet1, obsSet2);

       const lgData = LineGraphData.fromObservationSetListDiscrete(
           'lbl', obsSetList, TestBed.get(DomSanitizer));

       expect(lgData.series.length).toEqual(1);
     });
});
