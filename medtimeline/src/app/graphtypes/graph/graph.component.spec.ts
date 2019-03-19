// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {DateTime, Interval} from 'luxon';
import {DisplayConfiguration, GraphData} from 'src/app/graphdatatypes/graphdata';
import {LabeledSeries} from 'src/app/graphdatatypes/labeled-series';

import {DateTimeXAxis} from './datetimexaxis';
import {GraphComponent} from './graph.component';

class StubGraphComponent extends GraphComponent<any> {
  constructor() {
    super(TestBed.get(DomSanitizer));
    this.data = new GraphData([], new Map());
    this.data.c3DisplayConfiguration = new DisplayConfiguration(
        [
          [
            'x_Vanc Pk', DateTime.utc(1995, 7, 21).toISO(),
            DateTime.utc(1995, 7, 22).toISO()
          ],
          ['Vanc Pk', 15, 20]
        ],
        {'Vanc Pk': 'x_Vanc Pk'}, new Map());
  }
  generateChart() {
    return this.generateBasicChart();
  }
  adjustYAxisConfig() {}
  adjustDataDependent() {}
}

describe('GraphComponent', () => {
  let component: GraphComponent<any>;

  const dateRange = Interval.fromDateTimes(
      DateTime.utc(1995, 7, 21), DateTime.utc(1995, 7, 22));

  beforeEach(async(() => {
    TestBed.configureTestingModule({}).compileComponents();
  }));

  beforeEach(() => {
    component = new StubGraphComponent();
    component.xAxis = new DateTimeXAxis(dateRange);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('graph x and y values are correctly passed through', () => {
    component.yAxisConfig = {};
    component.generateBasicChart();

    expect(component.chartConfiguration['data']['xs']['Vanc Pk'])
        .toEqual('x_Vanc Pk');

    expect(component.chartConfiguration['data']['columns'][0].map(
               x => x.toString()))
        .toEqual([
          'x_Vanc Pk', DateTime.utc(1995, 7, 21).toISO(),
          DateTime.utc(1995, 7, 22).toISO()
        ]);
    expect(component.chartConfiguration['data']['columns'][1]).toEqual([
      'Vanc Pk', 15, 20
    ]);
  });

  it('y axis bounds passed in okay', () => {
    component.yAxisConfig = {
      min: 12,
      max: 81,
      padding: {top: 20, bottom: 20},
      tick: {
        count: 5,
        format: d => {
          return (d).toLocaleString(
              'en-us', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        }
      }
    };
    component.generateBasicChart();

    expect(component.chartConfiguration['axis']['y'])
        .toEqual(component.yAxisConfig);
  });

  it('regions displayed on y-axis', () => {
    component.yAxisConfig = {};
    component.generateBasicChart();

    component.chartConfiguration =
        component.addYRegionOnChart(component.chartConfiguration, [11, 101]);

    expect(component.chartConfiguration['regions'].length).toEqual(1);
    expect(component.chartConfiguration['regions'][0]['axis']).toEqual('y');
    expect(component.chartConfiguration['regions'][0]['start']).toEqual(11);
    expect(component.chartConfiguration['regions'][0]['end']).toEqual(101);
  });

  it('should add point to data set if data is empty', () => {
    component.xAxis = new DateTimeXAxis(Interval.fromDateTimes(
        DateTime.local(1995, 7, 21, 12), DateTime.local(1995, 7, 24, 0)));
    const data = new GraphData([], new Map());
    const millis = -8640000000000000;
    expect(data.c3DisplayConfiguration.allColumns[0][1].toMillis())
        .toEqual(millis);
    expect(data.c3DisplayConfiguration.allColumns[1][1]).toEqual(0);
  });


  it('should check if there are points in the data range', () => {
    component.xAxis = new DateTimeXAxis(Interval.fromDateTimes(
        DateTime.local(1995, 7, 21, 12), DateTime.local(1995, 7, 24, 0)));
    const series =
        LabeledSeries.fromInitialPoint(DateTime.local(1995, 7, 23, 12), 0);
    expect(StubGraphComponent.dataPointsInRange(
               [series], component.xAxis.dateRange))
        .toBeTruthy();
    const series2 =
        LabeledSeries.fromInitialPoint(DateTime.local(2018, 7, 24, 12), 0);
    expect(StubGraphComponent.dataPointsInRange(
               [series2], component.xAxis.dateRange))
        .toBeFalsy();
    expect(StubGraphComponent.dataPointsInRange(
               [series, series2], component.xAxis.dateRange))
        .toBeTruthy();
  });
});
