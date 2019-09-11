// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {DateTime, Interval} from 'luxon';
import * as Colors from 'src/app/theme/verily_colors';

import {labResult} from '../clinicalconcepts/display-grouping';
import {LOINCCode, LOINCCodeGroup} from '../clinicalconcepts/loinc-code';
import {AnnotatedObservation} from '../fhir-data-classes/annotated-observation';
import {AnnotatedAdministration, MedicationAdministrationSet} from '../fhir-data-classes/medication-administration';
import {AnnotatedMedicationOrder, MedicationOrderSet} from '../fhir-data-classes/medication-order';
import {Observation} from '../fhir-data-classes/observation';
import {ObservationSet} from '../fhir-data-classes/observation-set';
import {ChartType} from '../graphtypes/graph/graph.component';
import {AnnotatedTooltip} from '../graphtypes/tooltips/annotated-tooltip';
import {MedicationAdministrationTooltip} from '../graphtypes/tooltips/medication-tooltips';
import {GenericAbnormalTooltip, GenericAnnotatedObservationTooltip} from '../graphtypes/tooltips/observation-tooltips';
import {Tooltip} from '../graphtypes/tooltips/tooltip';
import {makeMedicationAdministration, makeMedicationOrder, StubFhirService} from '../test_utils';
import {makeSampleDiscreteObservation, makeSampleObservation} from '../test_utils';

import {LineGraphData} from './linegraphdata';

const MARCH_23_DATETIME = DateTime.utc(1988, 3, 23);
const MARCH_24_DATETIME = DateTime.utc(1988, 3, 24);
const MARCH_25_DATETIME = DateTime.utc(1988, 3, 25);

describe('LineGraphData', () => {
  const normalRange: [number, number] = [1, 30];
  const loincCodeGroup = new LOINCCodeGroup(
      new StubFhirService(), 'lbl',
      [new LOINCCode('4090-7', labResult, 'Vanc Pk', true)], labResult,
      ChartType.LINE);

  it('fromObservationSetList should have one LabeledSeries for' +
         'each ObservationSet passed in',
     () => {
       const obsSet = new ObservationSet([
         new AnnotatedObservation(
             makeSampleObservation(10, MARCH_23_DATETIME, [1, 90])),
         new AnnotatedObservation(
             makeSampleObservation(10, MARCH_24_DATETIME, [1, 90])),
         new AnnotatedObservation(
             makeSampleObservation(10, MARCH_25_DATETIME, [1, 90]))
       ]);
       const obsSetList = new Array(obsSet, obsSet, obsSet);

       const lgData = LineGraphData.fromObservationSetList(
           'lbl', obsSetList, loincCodeGroup, TestBed.get(DomSanitizer), []);

       expect(lgData.series.length).toBe(3);
     });

  it('fromObservationSetList should pass in the tooltips correctly', () => {
    const obs1 = new AnnotatedObservation(
        makeSampleObservation(10, MARCH_23_DATETIME, [1, 90]),
        [['labelA', 'valueA']]);
    const obs2 = new AnnotatedObservation(
        makeSampleObservation(10, MARCH_24_DATETIME, [1, 90]),
        [['labelB', 'valueB']]);

    const lgData = LineGraphData.fromObservationSetList(
        'lbl', new Array(new ObservationSet([obs1, obs2])), loincCodeGroup,
        TestBed.get(DomSanitizer), []);

    expect(lgData.tooltipMap.size).toBe(2);

    const seriesColor = lgData.series[0].legendInfo.fill;
    expect(lgData.tooltipMap.get(MARCH_23_DATETIME.toMillis().toString()))
        .toEqual([new GenericAnnotatedObservationTooltip(true, seriesColor)
                      .getTooltip(obs1, TestBed.get(DomSanitizer))]);

    expect(lgData.tooltipMap.get(MARCH_24_DATETIME.toMillis().toString()))
        .toEqual([new GenericAnnotatedObservationTooltip(true, seriesColor)
                      .getTooltip(obs2, TestBed.get(DomSanitizer))]);
  });

  it('fromObservationSetList should handle two tooltips for same timestamp',
     () => {
       const obs1 = new AnnotatedObservation(
           makeSampleObservation(10, MARCH_23_DATETIME, [1, 90]),
           [['labelA', 'valueA']]);
       const obs2 = new AnnotatedObservation(
           makeSampleObservation(10, MARCH_23_DATETIME, [1, 90]),
           [['labelB', 'valueB']]);

       const lgData = LineGraphData.fromObservationSetList(
           'lbl', new Array(new ObservationSet([obs1, obs2])), loincCodeGroup,
           TestBed.get(DomSanitizer), []);

       const seriesColor = lgData.series[0].legendInfo.fill;
       expect(lgData.tooltipMap.size).toBe(1);
       expect(lgData.tooltipMap.get(MARCH_23_DATETIME.toMillis().toString()))
           .toEqual([
             new GenericAnnotatedObservationTooltip(true, seriesColor)
                 .getTooltip(obs1, TestBed.get(DomSanitizer)),
             new GenericAnnotatedObservationTooltip(false, seriesColor)
                 .getTooltip(obs2, TestBed.get(DomSanitizer))
           ]);
     });

  it('BP tooltip should not display blood pressure twice', () => {
    const BP_json1 = {
      code: {
        coding: [{system: 'http://loinc.org', code: '55284-4'}],
        text: 'Blood pressure'
      },
      effectiveDateTime: DateTime.utc(1988, 3, 23).toISO(),
      valueQuantity: {value: 80, unit: 'mmHg'},
      interpretation: {
        coding: [{
          code: 'L',
          system: 'http://hl7.org/fhir/ValueSet/observation-interpretation'
        }]
      },
      referenceRange:
          [{low: {value: 90, unit: 'g/dL'}, high: {value: 100, unit: 'g/dL'}}]
    };
    const BP_json2 = {
      code: {
        coding: [{system: 'http://loinc.org', code: '55284-4'}],
        text: 'Blood pressure'
      },
      effectiveDateTime: MARCH_23_DATETIME.toISO(),
      valueQuantity: {value: 90, unit: 'mmHg'},
      interpretation: {
        coding: [{
          code: 'L',
          system: 'http://hl7.org/fhir/ValueSet/observation-interpretation'
        }]
      },
      referenceRange:
          [{low: {value: 90, unit: 'g/dL'}, high: {value: 100, unit: 'g/dL'}}]
    };
    const REQUEST_ID = '1234';
    const obs1 =
        new AnnotatedObservation(new Observation(BP_json1, REQUEST_ID));
    const obs2 =
        new AnnotatedObservation(new Observation(BP_json2, REQUEST_ID));

    const lgData = LineGraphData.fromObservationSetList(
        'lbl', new Array(new ObservationSet([obs1, obs2])), loincCodeGroup,
        TestBed.get(DomSanitizer), []);

    const seriesColor = lgData.series[0].legendInfo.fill;
    expect(lgData.tooltipMap.size).toBe(1);
    // Expect the tooltip to only have one instance of Blood Pressure despite
    // passing in two observations occuring at the same time point. The blood
    // pressure tooltip has different styling than the
    // GenericAnnotatedObservationToolTip
    const annotatedTT = AnnotatedTooltip.combineAnnotatedTooltipArr(
        lgData.tooltipMap.get(MARCH_23_DATETIME.toMillis().toString()));
    expect(annotatedTT.tooltipChart)
        .toEqual(
            '<table class="c3-tooltip"><tbody><tr><th colspan="2">' +
            Tooltip.formatTimestamp(MARCH_23_DATETIME) +
            '</th></tr><tr><td class="name" style="color: ' + Colors.ABNORMAL +
            '"><span style="' + Tooltip.TOOLTIP_ABNORMAL_CSS +
            seriesColor.toString() + '"></span>' +
            '<div style="display: inline-block;">Blood pressure</div></td><td class="value" ' +
            'style="color: ' + Colors.ABNORMAL +
            '">80 mmHg (Low)</td></tr></tbody></table>' +
            '<table class="c3-tooltip"><tbody><tr><th colspan="2">Caution: abnormal value</th></tr>' +
            '</tbody></table>');
  });

  it('fromObservationSetList should set y axis display so that all data included',
     () => {
       const obsSet1 = new ObservationSet([
         new AnnotatedObservation(
             makeSampleObservation(10, MARCH_23_DATETIME, normalRange)),
         new AnnotatedObservation(
             makeSampleObservation(1, MARCH_24_DATETIME, normalRange)),
         new AnnotatedObservation(
             makeSampleObservation(10, MARCH_25_DATETIME, normalRange))
       ]);

       const obsSet2 = new ObservationSet([
         new AnnotatedObservation(
             makeSampleObservation(40, MARCH_23_DATETIME, normalRange)),
         new AnnotatedObservation(
             makeSampleObservation(10, MARCH_24_DATETIME, normalRange)),
         new AnnotatedObservation(
             makeSampleObservation(1, MARCH_25_DATETIME, normalRange))
       ]);
       const obsSetList = new Array(obsSet1, obsSet2);

       const lgData = LineGraphData.fromObservationSetList(
           'lbl', obsSetList, loincCodeGroup, TestBed.get(DomSanitizer), []);

       expect(lgData.yAxisDataBounds).toEqual([1, 40]);
     });

  it('fromObservationSetList should set abnormal value tooltip correctly.',
     () => {
       const obsSet1 = new ObservationSet([
         new AnnotatedObservation(
             makeSampleObservation(100, MARCH_23_DATETIME, normalRange)),
       ]);
       const obsSetList = new Array(obsSet1);

       const lgData = LineGraphData.fromObservationSetList(
           'lbl', obsSetList, loincCodeGroup, TestBed.get(DomSanitizer), []);
       const seriesColor = lgData.series[0].legendInfo.fill;
       const params = {};
       params['label'] = 'Hemoglobin';
       params['value'] = 100;
       params['timestamp'] = MARCH_23_DATETIME.toMillis();
       expect(lgData.tooltipMap.size).toBe(1);
       const annotatedTT = AnnotatedTooltip.combineAnnotatedTooltipArr(
           lgData.tooltipMap.get(MARCH_23_DATETIME.toMillis().toString()));
       expect(annotatedTT.tooltipChart)
           .toContain(new GenericAbnormalTooltip(false, seriesColor)
                          .getTooltip(params, TestBed.get(DomSanitizer))
                          .tooltipChart);
     });

  it('fromMedicationOrderSet should have one data series' +
         ' for all the orders',
     () => {
       const order1 = makeMedicationOrder();
       const order2 = makeMedicationOrder();
       const medAdmin1 =
           makeMedicationAdministration(MARCH_23_DATETIME.toString(), 95);
       const medAdmin2 =
           makeMedicationAdministration(MARCH_24_DATETIME.toString(), 100);

       const medAdmin1Order2 = makeMedicationAdministration(
           DateTime.utc(1988, 3, 26).toString(), 105);
       const medAdmin2Order2 = makeMedicationAdministration(
           DateTime.utc(1988, 3, 27).toString(), 110);

       const annotatedOrder1 = new AnnotatedMedicationOrder(
           makeMedicationOrder(), [medAdmin1, medAdmin2]);
       const annotatedOrder2 = new AnnotatedMedicationOrder(
           makeMedicationOrder(), [medAdmin1Order2, medAdmin2Order2]);
       const medOrderSet =
           new MedicationOrderSet([annotatedOrder1, annotatedOrder2]);


       const lgData = LineGraphData.fromMedicationOrderSet(
           medOrderSet,
           Interval.fromDateTimes(
               DateTime.utc(1988, 3, 22), DateTime.utc(1988, 3, 28)),
           TestBed.get(DomSanitizer), []);

       expect(lgData.series.length).toBe(1);

       const series = lgData.series[0];
       expect(series.coordinates.length).toBe(4);

       expect(series.coordinates).toEqual([
         [medAdmin1.timestamp, 95], [medAdmin2.timestamp, 100],
         [medAdmin1Order2.timestamp, 105], [medAdmin2Order2.timestamp, 110]
       ]);
     });

  it('fromMedicationOrderSet should handle tooltips', () => {
    const medAdmin1 =
        makeMedicationAdministration(MARCH_23_DATETIME.toString(), 95);
    const medAdmin2 =
        makeMedicationAdministration(MARCH_23_DATETIME.toString(), 100);
    const annotatedOrder1 =
        new AnnotatedMedicationOrder(makeMedicationOrder(), [medAdmin1]);
    const annotatedOrder2 =
        new AnnotatedMedicationOrder(makeMedicationOrder(), [medAdmin2]);
    const medOrderSet =
        new MedicationOrderSet([annotatedOrder1, annotatedOrder2]);

    const lgData = LineGraphData.fromMedicationOrderSet(
        medOrderSet,
        Interval.fromDateTimes(
            DateTime.utc(1988, 3, 22), DateTime.utc(1988, 3, 28)),
        TestBed.get(DomSanitizer), []);

    expect(lgData.tooltipMap.size).toBe(1);
    expect(lgData.tooltipMap.get(MARCH_23_DATETIME.toMillis().toString()))
        .toEqual([
          new MedicationAdministrationTooltip().getTooltip(
              [new AnnotatedAdministration(medAdmin1)],
              TestBed.get(DomSanitizer)),
          new MedicationAdministrationTooltip().getTooltip(
              [new AnnotatedAdministration(medAdmin2)],
              TestBed.get(DomSanitizer))
        ]);
  });

  it('fromMedicationOrderSet should always have precision to be 0', () => {
    const medAdmin1 =
        makeMedicationAdministration(MARCH_23_DATETIME.toString(), 95);
    const medAdmin2 =
        makeMedicationAdministration(MARCH_23_DATETIME.toString(), 100);
    const annotatedOrder1 = new AnnotatedMedicationOrder(
        makeMedicationOrder(), [medAdmin1, medAdmin2]);
    const medOrderSet = new MedicationOrderSet([annotatedOrder1]);

    const lgData = LineGraphData.fromMedicationOrderSet(
        medOrderSet,
        Interval.fromDateTimes(
            DateTime.utc(1988, 3, 22), DateTime.utc(1988, 3, 28)),
        TestBed.get(DomSanitizer), []);

    expect(lgData.precision).toBe(0);
  });

  it('fromObservationSetListDiscrete should calculate one' +
         'LabeledSeries for all ObservationSets.',
     () => {
       const obsSet1 = new ObservationSet([new AnnotatedObservation(
           makeSampleDiscreteObservation('yellow', MARCH_23_DATETIME))]);

       const obsSet2 = new ObservationSet([new AnnotatedObservation(
           makeSampleDiscreteObservation('blue', MARCH_23_DATETIME))]);
       const obsSetList = new Array(obsSet1, obsSet2);

       const lgData = LineGraphData.fromObservationSetListDiscrete(
           'lbl', obsSetList, TestBed.get(DomSanitizer), []);

       expect(lgData.series.length).toEqual(1);
     });


  it('fromObservationSetListDiscrete should calculate one' +
         'LabeledSeries for all ObservationSets.',
     () => {
       const obsSet1 = new ObservationSet([new AnnotatedObservation(
           makeSampleDiscreteObservation('yellow', MARCH_23_DATETIME))]);

       const obsSet2 = new ObservationSet([new AnnotatedObservation(
           makeSampleDiscreteObservation('blue', MARCH_23_DATETIME))]);
       const obsSetList = new Array(obsSet1, obsSet2);

       const lgData = LineGraphData.fromObservationSetListDiscrete(
           'lbl', obsSetList, TestBed.get(DomSanitizer), []);

       expect(lgData.series.length).toEqual(1);
     });
});
