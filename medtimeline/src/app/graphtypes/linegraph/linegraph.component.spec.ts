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

import {Observation} from '../../fhir-data-classes/observation';
import {ObservationSet} from '../../fhir-data-classes/observation-set';
import {LineGraphData} from '../../graphdatatypes/linegraphdata';
import {makeSampleObservationJson, StubFhirService} from '../../test_utils';
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
        .configureTestingModule(
            {declarations: [LineGraphComponent], imports: [ChartsModule]})
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
});
