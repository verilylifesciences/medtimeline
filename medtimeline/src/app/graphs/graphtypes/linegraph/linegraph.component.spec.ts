// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {HttpClientModule} from '@angular/common/http';
import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {DateTime, Interval} from 'luxon';
import {ChartsModule} from 'ng2-charts';
import {ResourceCodeCreator} from 'src/app/conceptmappings/resource-code-creator';
import {labResult} from 'src/app/conceptmappings/resource-codes/display-grouping';
import {LOINCCode, LOINCCodeGroup} from 'src/app/conceptmappings/resource-codes/loinc-code';
import {AnnotatedObservation} from 'src/app/fhir-resources/annotated/annotated-observation';
import {FhirService} from 'src/app/fhir-server/fhir.service';
import {UI_CONSTANTS, UI_CONSTANTS_TOKEN} from 'src/constants';

import {ObservationSet} from '../../../fhir-resources/sets/observation-set';
import {makeSampleObservation, StubFhirService} from '../../../utils/test_utils';
import {LineGraphData} from '../../graphdatatypes/linegraphdata';
import {ChartType} from '../graph/graph.component';
import {AnnotatedTooltip} from '../tooltips/annotated-tooltip';

import {LineGraphComponent} from './linegraph.component';

describe('LineGraphComponent', () => {
  // All the observations in this class will report a normal range of [0, 30].
  const normalRange: [number, number] = [0, 30];

  let component: LineGraphComponent;
  let fixture: ComponentFixture<LineGraphComponent>;

  const testDateRange = Interval.fromDateTimes(
      DateTime.utc(1995, 7, 21), DateTime.utc(1995, 7, 22));

  // Display bounds for this LOINC are set as [0, 40].
  let loincCodeGroup;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          declarations: [LineGraphComponent],
          imports: [ChartsModule, HttpClientModule],
          providers: [
            {provide: UI_CONSTANTS_TOKEN, useValue: UI_CONSTANTS},
            {provide: FhirService, useClass: StubFhirService},
            ResourceCodeCreator,
          ]
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LineGraphComponent);
    component = fixture.componentInstance;
    component.dateRange = testDateRange;
    loincCodeGroup = new LOINCCodeGroup(
        TestBed.get(FhirService), 'lbl', [LOINCCode.fromCodeString('718-7')],
        labResult, ChartType.LINE);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('graph x and y values are correctly passed through', () => {
    const obsSet = new ObservationSet([
      new AnnotatedObservation(
          makeSampleObservation(15, DateTime.utc(1995, 7, 21))),
      new AnnotatedObservation(
          makeSampleObservation(20, DateTime.utc(1995, 7, 22)))
    ]);

    component.data = LineGraphData.fromObservationSetList(
        'label', [obsSet], loincCodeGroup, TestBed.get(DomSanitizer), []);

    component.generateChart();

    expect(component.chartData[0].data).toEqual([
      {x: DateTime.utc(1995, 7, 21).toISO(), y: 15},
      {x: DateTime.utc(1995, 7, 22).toISO(), y: 20}
    ]);
  });

  it('should set display bounds to min/max of data if they are outside of display range',
     () => {
       // Since the data falls outside of [0, 40] (LOINC display bounds) and
       // [0, 30] (normal range), the display bounds should stretch to fit the
       // data.
       const obsSet1 = new ObservationSet([
         new AnnotatedObservation(makeSampleObservation(
             100, DateTime.utc(1988, 3, 23), normalRange)),
         new AnnotatedObservation(makeSampleObservation(
             -10, DateTime.utc(1988, 3, 24), normalRange)),
         new AnnotatedObservation(
             makeSampleObservation(10, DateTime.utc(1988, 3, 25), normalRange)),
         new AnnotatedObservation(
             makeSampleObservation(-40, DateTime.utc(1988, 3, 23), normalRange))
       ]);

       component.data = LineGraphData.fromObservationSetList(
           'lbl', [obsSet1], loincCodeGroup, TestBed.get(DomSanitizer), []);
       component.generateChart();
       const expectedMin = -40;
       const expectedMax = 100;
       const padding = Math.abs(expectedMax - expectedMin) *
           LineGraphComponent.yAxisPaddingFactor;
       expect(component.chartOptions.scales.yAxes[0].ticks.min)
           .toEqual(expectedMin - padding);
       expect(component.chartOptions.scales.yAxes[0].ticks.max)
           .toEqual(expectedMax + padding);
     });

  it('should set display bounds to normal range if data points all fall within',
     () => {
       // Since the data falls inside [0, 30] (normal range)
       // and [0, 40] (LOINC range) the display bounds
       // should be the normal bounds.
       const obsSet1 = new ObservationSet([
         new AnnotatedObservation(
             makeSampleObservation(2, DateTime.utc(1995, 7, 21), normalRange)),
         new AnnotatedObservation(
             makeSampleObservation(3, DateTime.utc(1995, 7, 22), normalRange))
       ]);

       component.data = LineGraphData.fromObservationSetList(
           'lbl', [obsSet1], loincCodeGroup, TestBed.get(DomSanitizer), []);
       component.generateChart();
       const expectedMin = 0;
       const expectedMax = 30;
       const padding = Math.abs(expectedMax - expectedMin) *
           LineGraphComponent.yAxisPaddingFactor;
       expect(component.chartOptions.scales.yAxes[0].ticks.min)
           .toEqual(expectedMin - padding);
       expect(component.chartOptions.scales.yAxes[0].ticks.max)
           .toEqual(expectedMax + padding);
     });


  it('should set y axis display correctly' +
         ' if points fall outside display bound range in only one direction',
     () => {
       // Since the data falls outside of [0, 40] (LOINC display bounds) and
       // [0, 30] (normal range), the display bounds should be [0, 100].
       const obsSet1 = new ObservationSet([
         new AnnotatedObservation(makeSampleObservation(
             100, DateTime.utc(1995, 7, 22), normalRange)),
         new AnnotatedObservation(
             makeSampleObservation(1, DateTime.utc(1995, 7, 21), normalRange)),
       ]);

       component.data = LineGraphData.fromObservationSetList(
           'lbl', [obsSet1], loincCodeGroup, TestBed.get(DomSanitizer), []);

       component.generateChart();
       const expectedMin = 0;
       const expectedMax = 100;
       const padding =
           (expectedMax - expectedMin) * LineGraphComponent.yAxisPaddingFactor;
       expect(component.chartOptions.scales.yAxes[0].ticks.min)
           .toEqual(expectedMin - padding);
       expect(component.chartOptions.scales.yAxes[0].ticks.max)
           .toEqual(expectedMax + padding);
     });

  it('should set y axis display as bounds ' +
         ' passed in if forceDisplayBounds is true',
     () => {
       const obsSet1 = new ObservationSet([
         new AnnotatedObservation(
             makeSampleObservation(40, DateTime.utc(1988, 3, 23), normalRange)),
         new AnnotatedObservation(
             makeSampleObservation(1, DateTime.utc(1988, 3, 24), normalRange)),
         new AnnotatedObservation(
             makeSampleObservation(10, DateTime.utc(1988, 3, 25), normalRange))
       ]);

       const loincCodeGroup2 = new LOINCCodeGroup(
           TestBed.get(FhirService), 'lbl',
           [LOINCCode.fromCodeString('4090-7')], labResult, ChartType.LINE);
       component.data = LineGraphData.fromObservationSetList(
           'lbl', [obsSet1], loincCodeGroup2, TestBed.get(DomSanitizer), []);

       component.generateChart();
       expect(component.chartOptions.scales.yAxes[0].ticks.min).toEqual(0);
       expect(component.chartOptions.scales.yAxes[0].ticks.max).toEqual(50);
     });

  it('should display normal bound tooltip correctly', () => {
    component.dateRange = Interval.fromDateTimes(
        DateTime.utc(1995, 7, 19), DateTime.utc(1995, 7, 22));
    const obsSet = new ObservationSet([
      new AnnotatedObservation(
          makeSampleObservation(100, DateTime.utc(1995, 7, 22), normalRange)),
      new AnnotatedObservation(
          makeSampleObservation(1, DateTime.utc(1995, 7, 21), normalRange)),
    ]);
    component.data = LineGraphData.fromObservationSetList(
        'lbl', [obsSet], loincCodeGroup, TestBed.get(DomSanitizer), []);
    component.generateChart();
    const annotatedTT = AnnotatedTooltip.combineAnnotatedTooltipArr(
        component.data.tooltipMap.get(
            component.dateRange.start.valueOf().toString()));
    expect(annotatedTT.tooltipChart)
        .toEqual(
            '<table class="tooltip"><tbody><tr><th colspan="1">' +
            'Normal Boundary</th></tr>' +
            '<tr><td><div style="white-space:pre-line; text-align:center;">' +
            '<b>Upper: </b>' + normalRange[1] + ' ' + component.data.unit +
            '\n' +
            '<b>Lower: </b>' + normalRange[0] + ' ' + component.data.unit +
            '</div></td></tr></tbody></table>');
  });

  it('should not generate normal bound tooltip when there is no normal range',
     () => {
       component.dateRange = Interval.fromDateTimes(
           DateTime.utc(1995, 7, 19), DateTime.utc(1995, 7, 22));
       const obsSet = new ObservationSet([
         new AnnotatedObservation(makeSampleObservation(
             100, DateTime.utc(1995, 7, 22),
             undefined,  // referenceRange
             undefined,  // interpretation
             false,      // hasInterpretation
             undefined,  // hasValueAndResult
             false       // hasReferenceRange
             )),
         new AnnotatedObservation(makeSampleObservation(
             1, DateTime.utc(1995, 7, 21),
             undefined,  // referenceRange
             undefined,  // interpretation
             false,      // hasInterpretation
             undefined,  // hasValueAndResult
             false       // hasReferenceRange
             )),
       ]);
       component.data = LineGraphData.fromObservationSetList(
           'lbl', [obsSet], loincCodeGroup, TestBed.get(DomSanitizer), []);
       component.generateChart();
       expect(component.data.tooltipMap.get(
                  component.dateRange.start.valueOf().toString()))
           .toEqual(undefined);
     });
});
