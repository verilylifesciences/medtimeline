// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, TestBed} from '@angular/core/testing';
import {DateTime, Interval} from 'luxon';
import {DisplayConfiguration, GraphData} from 'src/app/graphdatatypes/graphdata';
import {LabeledSeries} from 'src/app/graphdatatypes/labeled-series';

import {GraphComponent} from './graph.component';

class StubGraphComponent extends GraphComponent<any> {
  constructor() {
    super();
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
    component.dateRange = dateRange;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('graph x and y values are correctly passed through', () => {
    const generatedChart = component.generateBasicChart();

    expect(generatedChart['data']['xs']['Vanc Pk']).toEqual('x_Vanc Pk');

    expect(generatedChart['data']['columns'][0].map(x => x.toString()))
        .toEqual([
          'x_Vanc Pk', DateTime.utc(1995, 7, 21).toISO(),
          DateTime.utc(1995, 7, 22).toISO()
        ]);
    expect(generatedChart['data']['columns'][1]).toEqual(['Vanc Pk', 15, 20]);
  });

  it('y axis bounds passed in okay', () => {
    const yConfig: c3.YAxisConfiguration = {
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
    const generatedChart = component.generateBasicChart(yConfig);

    expect(generatedChart['axis']['y']).toEqual(yConfig);
  });

  it('regions displayed on y-axis', () => {
    let generatedChart = component.generateBasicChart();

    generatedChart = component.addYRegionOnChart(generatedChart, [11, 101]);

    expect(generatedChart['regions'].length).toEqual(1);
    expect(generatedChart['regions'][0]['axis']).toEqual('y');
    expect(generatedChart['regions'][0]['start']).toEqual(11);
    expect(generatedChart['regions'][0]['end']).toEqual(101);
  });

  it('x ticks should enclose both ends of the data range', () => {
    const testComponent = new StubGraphComponent();
    component.dateRange = Interval.fromDateTimes(
        DateTime.utc(1990, 7, 13, 12), DateTime.utc(1990, 7, 15, 12));

    const generatedChart = component.generateBasicChart({});

    expect(generatedChart.axis.x.tick.values).toEqual([
      DateTime.local(1990, 7, 13), DateTime.local(1990, 7, 14),
      DateTime.local(1990, 7, 15), DateTime.local(1990, 7, 16)
    ].map(x => Number(x)));
  });


  it('x ticks should work for very small ranges', () => {
    const testComponent = new StubGraphComponent();
    component.dateRange = Interval.fromDateTimes(
        DateTime.local(1964, 3, 22, 12), DateTime.local(1964, 3, 22, 20));

    const generatedChart = component.generateBasicChart({});

    expect(generatedChart.axis.x.tick.values).toEqual([
      DateTime.local(1964, 3, 22), DateTime.local(1964, 3, 23)
    ].map(x => Number(x)));
  });

  it('x ticks should not go an extra day past the end of the data range' +
         ' if the endpoint is at a date boundary',
     () => {
       const testComponent = new StubGraphComponent();
       component.dateRange = Interval.fromDateTimes(
           DateTime.local(1995, 7, 21, 12), DateTime.local(1995, 7, 24, 0));

       const generatedChart = component.generateBasicChart();

       expect(generatedChart.axis.x.tick.values).toEqual([
         DateTime.local(1995, 7, 21), DateTime.local(1995, 7, 22),
         DateTime.local(1995, 7, 23), DateTime.local(1995, 7, 24)
       ].map(x => Number(x)));
     });

  it('should add point to data set if data is empty', () => {
    const testComponent = new StubGraphComponent();
    component.dateRange = Interval.fromDateTimes(
        DateTime.local(1995, 7, 21, 12), DateTime.local(1995, 7, 24, 0));
    const data = new GraphData([], new Map());
    const millis = -8640000000000000;
    expect(data.c3DisplayConfiguration.allColumns[0][1].toMillis())
        .toEqual(millis);
    expect(data.c3DisplayConfiguration.allColumns[1][1]).toEqual(0);
  });


  it('should check if there are points in the data range', () => {
    const testComponent = new StubGraphComponent();
    component.dateRange = Interval.fromDateTimes(
        DateTime.local(1995, 7, 21, 12), DateTime.local(1995, 7, 24, 0));
    const series =
        LabeledSeries.fromInitialPoint(DateTime.local(1995, 7, 23, 12), 0);
    expect(StubGraphComponent.dataPointsInRange([series], component.dateRange))
        .toBeTruthy();
    const series2 =
        LabeledSeries.fromInitialPoint(DateTime.local(2018, 7, 24, 12), 0);
    expect(StubGraphComponent.dataPointsInRange([series2], component.dateRange))
        .toBeFalsy();
    expect(StubGraphComponent.dataPointsInRange(
               [series, series2], component.dateRange))
        .toBeTruthy();
  });
});
