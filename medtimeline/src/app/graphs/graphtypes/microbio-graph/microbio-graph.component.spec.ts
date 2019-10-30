// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Inject} from '@angular/core';
import {async, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {DateTime, Interval} from 'luxon';
import {MicrobioReport} from 'src/app/fhir-resources/microbio-report';
import {MicrobioGraphData} from 'src/app/graphs/graphdatatypes/microbiographdata';
import {WHITE} from 'src/app/theme/verily_colors';
import {UI_CONSTANTS_TOKEN} from 'src/constants';

import {makeMicrobioReports, makePartialMicrobioReports} from '../../../utils/test_utils';

import {MicrobioGraphComponent} from './microbio-graph.component';

class StubMicrobioComponent extends MicrobioGraphComponent {
  microbioReport: MicrobioReport[];

  constructor(
      @Inject(UI_CONSTANTS_TOKEN) readonly uiConstants: any,
      isPartial?: boolean) {
    super(TestBed.get(DomSanitizer), uiConstants);
    if (isPartial) {
      this.microbioReport = makePartialMicrobioReports();
    } else {
      this.microbioReport = makeMicrobioReports();
    }
    this.data = MicrobioGraphData.fromMicrobioReports(
        this.microbioReport, this.sanitizer);
  }
}

describe('MicrobioGraphComponent', () => {
  let component: MicrobioGraphComponent;

  const dateRange = Interval.fromDateTimes(
      DateTime.utc(2018, 8, 30), DateTime.utc(2018, 9, 22));

  beforeEach(async(() => {
    TestBed.configureTestingModule({}).compileComponents();
  }));

  it('should create', () => {
    component = new StubMicrobioComponent(UI_CONSTANTS_TOKEN);
    component.dateRange = dateRange;
    expect(component).toBeTruthy();
  });

  it('should display open points on graph if partial status', () => {
    component = new StubMicrobioComponent(UI_CONSTANTS_TOKEN, true);
    component.dateRange = dateRange;
    component.generateChart();

    component.adjustGeneratedChartConfiguration();
    for (let i = 0; i < component.chartData.length; i++) {
      const chartjsSeries = component.chartData[i];
      expect(chartjsSeries.pointBackgroundColor).toEqual([
        WHITE.rgb().string()
      ]);
    }
  });

  it('should display closed points on graph if final status', () => {
    component = new StubMicrobioComponent(UI_CONSTANTS_TOKEN);
    component.dateRange = dateRange;
    component.generateChart();

    component.adjustGeneratedChartConfiguration();
    for (let i = 0; i < component.chartData.length; i++) {
      const chartjsSeries = component.chartData[i];
      // The pointBackgroundColor should not be white if the
      // points are depicted as closed
      expect(chartjsSeries.pointBackgroundColor).not.toEqual([
        WHITE.rgb().string()
      ]);
    }
  });

  it('should display triangles on graph if interpretation is positive' +
         ' and circles if it is normal',
     () => {
       component = new StubMicrobioComponent(UI_CONSTANTS_TOKEN, true);
       component.dateRange = dateRange;
       component.generateChart();

       component.adjustGeneratedChartConfiguration();
       // The second report is positive. The first one is normal
       expect(component.chartData[0].pointStyle).toEqual(['circle']);
       expect(component.chartData[1].pointStyle).toEqual(['triangle']);
     });
});
