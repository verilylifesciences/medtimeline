// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {DateTime, Interval} from 'luxon';
import {ChartsModule} from 'ng2-charts';
import {labResult} from 'src/app/clinicalconcepts/display-grouping';
import {LOINCCode, LOINCCodeGroup} from 'src/app/clinicalconcepts/loinc-code';
import {AnnotatedObservation} from 'src/app/fhir-data-classes/annotated-observation';
import {UI_CONSTANTS, UI_CONSTANTS_TOKEN} from 'src/constants';

import {Observation} from '../../fhir-data-classes/observation';
import {ObservationSet} from '../../fhir-data-classes/observation-set';
import {LineGraphData} from '../../graphdatatypes/linegraphdata';
import {makeSampleObservationJson, StubFhirService} from '../../test_utils';
import {ChartType} from '../graph/graph.component';

import {LineGraphComponent} from './linegraph.component';

describe('LineGraphComponent', () => {
  const normalRange: [number, number] = [1, 30];
  let component: LineGraphComponent;
  let fixture: ComponentFixture<LineGraphComponent>;
  const obsSet = new ObservationSet([
    new AnnotatedObservation(new Observation(
        makeSampleObservationJson(15, DateTime.utc(1995, 7, 21)))),
    new AnnotatedObservation(new Observation(
        makeSampleObservationJson(20, DateTime.utc(1995, 7, 22))))
  ]);

  const testDateRange = Interval.fromDateTimes(
      DateTime.utc(1995, 7, 21), DateTime.utc(1995, 7, 22));
  const loincCodeGroup = new LOINCCodeGroup(
      new StubFhirService(), 'lbl',
      [new LOINCCode('718-7', labResult, 'Hemoglobin', true)], labResult,
      ChartType.LINE, [0, 50], false);
  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          declarations: [LineGraphComponent],
          imports: [ChartsModule],
          providers: [{provide: UI_CONSTANTS_TOKEN, useValue: UI_CONSTANTS}]
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LineGraphComponent);
    component = fixture.componentInstance;
    component.dateRange = testDateRange;
    component.data = LineGraphData.fromObservationSetList(
        'label', new Array(obsSet, obsSet), loincCodeGroup,
        TestBed.get(DomSanitizer), []);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('graph x and y values are correctly passed through', () => {
    fixture.detectChanges();
    component.generateChart();
    expect(component.chartData[0].data).toEqual([
      {x: DateTime.utc(1995, 7, 21).toISO(), y: 15},
      {x: DateTime.utc(1995, 7, 22).toISO(), y: 20}
    ]);
  });

  it('LinegraphComponent should set y axis display as display' +
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

       component.data = LineGraphData.fromObservationSetList(
           'lbl', obsSetList, loincCodeGroup, TestBed.get(DomSanitizer), []);
       component.generateChart();
       const expectedMin = 0;
       const expectedMax = 50;
       const padding = (expectedMax - expectedMin) * .25;
       expect(component.chartOptions.scales.yAxes[0].ticks.min)
           .toEqual(expectedMin - padding);
       expect(component.chartOptions.scales.yAxes[0].ticks.max)
           .toEqual(expectedMax + padding);
     });


  it('LinegraphComponent should set y axis display correctly' +
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

       component.data = LineGraphData.fromObservationSetList(
           'lbl', obsSetList, loincCodeGroup, TestBed.get(DomSanitizer), []);

       component.generateChart();
       const expectedMin = 1;
       const expectedMax = 50;
       const padding = (expectedMax - expectedMin) * .25;
       expect(component.chartOptions.scales.yAxes[0].ticks.min)
           .toEqual(expectedMin - padding);
       expect(component.chartOptions.scales.yAxes[0].ticks.max)
           .toEqual(expectedMax + padding);
     });

  it('LinegraphComponent should set y axis display as bounds ' +
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
       component.data = LineGraphData.fromObservationSetList(
           'lbl', obsSetList, loincCodeGroup2, TestBed.get(DomSanitizer), []);

       component.generateChart();
       const expectedMin = 0;
       const expectedMax = 50;
       const padding = (expectedMax - expectedMin) * .25;

       expect(component.chartOptions.scales.yAxes[0].ticks.min)
           .toEqual(expectedMin - padding);
       expect(component.chartOptions.scales.yAxes[0].ticks.max)
           .toEqual(expectedMax + padding);
     });
});
