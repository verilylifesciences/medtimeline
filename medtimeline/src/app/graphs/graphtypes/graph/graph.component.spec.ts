// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Inject} from '@angular/core';
import {async, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {DateTime, Interval} from 'luxon';
import {GraphData} from 'src/app/graphs/graphdatatypes/graphdata';
import {LabeledSeries} from 'src/app/graphs/graphdatatypes/labeled-series';
import {UI_CONSTANTS_TOKEN} from 'src/constants';

import {GraphComponent} from './graph.component';

class StubGraphComponent extends GraphComponent<any> {
  constructor(@Inject(UI_CONSTANTS_TOKEN) readonly uiConstants: any) {
    super(TestBed.get(DomSanitizer), uiConstants);
    this.data = new GraphData(
        [new LabeledSeries(
            'Vanc Pk',
            [
              [DateTime.utc(1995, 7, 21), 15], [DateTime.utc(1995, 7, 22), 20]
            ])],
        new Map());
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
    component = new StubGraphComponent(UI_CONSTANTS_TOKEN);
    component.dateRange = dateRange;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('graph x and y values are correctly passed through', () => {
    component.generateChart();
    expect(component.chartData.length).toEqual(1);
    expect(component.chartData[0].data).toEqual([
      {x: DateTime.utc(1995, 7, 21).toISO(), y: 15},
      {x: DateTime.utc(1995, 7, 22).toISO(), y: 20}
    ]);
  });
});
