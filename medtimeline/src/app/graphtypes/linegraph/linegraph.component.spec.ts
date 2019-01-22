// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {DateTime, Interval} from 'luxon';

import {Observation} from '../../fhir-data-classes/observation';
import {ObservationSet} from '../../fhir-data-classes/observation-set';
import {LineGraphData} from '../../graphdatatypes/linegraphdata';
import {makeSampleObservationJson} from '../../test_utils';

import {LineGraphComponent} from './linegraph.component';

// TODO(b/117234137): Protractor tests for line graph display
describe('LineGraphComponent', () => {
  let component: LineGraphComponent;
  let fixture: ComponentFixture<LineGraphComponent>;
  const obsSet = new ObservationSet([
    new Observation(makeSampleObservationJson(15, DateTime.utc(1995, 7, 21))),
    new Observation(makeSampleObservationJson(20, DateTime.utc(1995, 7, 22)))
  ]);

  const testDateRange = Interval.fromDateTimes(
      DateTime.utc(1995, 7, 21), DateTime.utc(1995, 7, 22));

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
    component.dateRange = testDateRange;
    component.data = LineGraphData.fromObservationSetList(
        'label', new Array(obsSet, obsSet));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('graph x and y values are correctly passed through', () => {
    fixture.detectChanges();
    const generatedChart = component.generateChart();
    expect(generatedChart['data']['xs']['Vanc Pk']).toEqual('x_Vanc Pk');
    expect(generatedChart['data']['columns'][0].map(x => x.toString()))
        .toEqual([
          'x_Vanc Pk', DateTime.utc(1995, 7, 21).toISO(),
          DateTime.utc(1995, 7, 22).toISO()
        ]);
    expect(generatedChart['data']['columns'][1]).toEqual(['Vanc Pk', 15, 20]);
  });

  it('region not plotted for normal values when there is more than one series',
     () => {
       fixture.detectChanges();
       const generatedChart = component.generateChart();
       expect(generatedChart['regions']).toBeUndefined();
     });

  it('should calculate y-axis tick values correctly', () => {
    fixture.detectChanges();
    const generatedChart = component.generateChart();
    expect(generatedChart.axis.y.tick.values.length).toEqual(5);
    expect(generatedChart.axis.y.tick.values.toString())
        .toEqual('10,12.5,15,17.5,20');
  });

  it('region plotted for normal values when there is only one series', () => {
    fixture.detectChanges();
    component.data =
        LineGraphData.fromObservationSetList('testgraph', new Array(obsSet));
    const generatedChart = component.generateChart();
    expect(generatedChart['regions'].length).toEqual(1);
    expect(generatedChart['regions'][0]['axis']).toEqual('y');
    expect(generatedChart['regions'][0]['start']).toEqual(10);
    expect(generatedChart['regions'][0]['end']).toEqual(20);
  });
});
