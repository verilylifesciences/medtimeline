// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {DateTime, Interval} from 'luxon';
import {labResult} from 'src/app/clinicalconcepts/display-grouping';
import {LOINCCode, LOINCCodeGroup} from 'src/app/clinicalconcepts/loinc-code';
import {AnnotatedObservation} from 'src/app/fhir-data-classes/annotated-observation';

import {Observation} from '../../fhir-data-classes/observation';
import {ObservationSet} from '../../fhir-data-classes/observation-set';
import {LineGraphData} from '../../graphdatatypes/linegraphdata';
import {makeSampleObservationJson, StubFhirService} from '../../test_utils';
import {DateTimeXAxis} from '../graph/datetimexaxis';
import {ChartType} from '../graph/graph.component';

import {LineGraphComponent} from './linegraph.component';

// TODO(b/117234137): Protractor tests for line graph display
describe('LineGraphComponent', () => {
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
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LineGraphComponent);
    component = fixture.componentInstance;
    component.xAxis = new DateTimeXAxis(testDateRange);
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
    expect(component.chartConfiguration['data']['xs']['Hemoglobin'])
        .toEqual('x_Hemoglobin');
    expect(component.chartConfiguration['data']['columns'][0].map(
               x => x.toString()))
        .toEqual([
          'x_Hemoglobin', DateTime.utc(1995, 7, 21).toISO(),
          DateTime.utc(1995, 7, 22).toISO()
        ]);
    expect(component.chartConfiguration['data']['columns'][1]).toEqual([
      'Hemoglobin', 15, 20
    ]);
  });

  it('region not plotted for normal values when there is more than one series',
     () => {
       fixture.detectChanges();
       component.generateChart();
       expect(component.chartConfiguration['regions']).toBeUndefined();
     });

  it('should calculate y-axis tick values correctly', () => {
    fixture.detectChanges();
    component.generateChart();
    expect(component.chartConfiguration.axis.y.tick.values.length).toEqual(5);
    expect(component.chartConfiguration.axis.y.tick.values.toString())
        .toEqual('10,12.5,15,17.5,20');
  });

  it('region plotted for normal values when there is only one series', () => {
    fixture.detectChanges();
    component.data = LineGraphData.fromObservationSetList(
        'testgraph', new Array(obsSet), loincCodeGroup,
        TestBed.get(DomSanitizer), []);
    component.generateChart();
    expect(component.chartConfiguration['regions'].length).toEqual(1);
    expect(component.chartConfiguration['regions'][0]['axis']).toEqual('y');
    expect(component.chartConfiguration['regions'][0]['start']).toEqual(10);
    expect(component.chartConfiguration['regions'][0]['end']).toEqual(20);
  });
});
