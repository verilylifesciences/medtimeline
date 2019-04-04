// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, forwardRef} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import * as Color from 'color';
import {DateTime} from 'luxon';
import {MicrobioGraphData} from 'src/app/graphdatatypes/microbiographdata';

import {StepGraphData} from '../../graphdatatypes/stepgraphdata';
import {GraphComponent} from '../graph/graph.component';
import {RenderedChart} from '../graph/renderedchart';

@Component({
  selector: 'app-stepgraph',
  templateUrl: '../graph/graph.component.html',
  styleUrls: ['../graph.css'],
  providers: [
    {provide: GraphComponent, useExisting: forwardRef(() => StepGraphComponent)}
  ]
})
export class StepGraphComponent extends
    GraphComponent<StepGraphData|MicrobioGraphData> {
  types: {[key: string]: string} = {};
  constructor(readonly sanitizer: DomSanitizer) {
    super(sanitizer, (axis, id) => new RenderedChart(axis, id));
  }

  /**
   * @override
   */
  generateChart() {
    this.generateBasicChart();
    this.adjustDataDependent();
  }

  /**
   * Adjusts the y-axis configuration for the chart.
   */
  prepareForChartConfiguration() {
    for (const endpointSeries of this.data.endpointSeries) {
      const endpointSeriesId = endpointSeries.label;
      this.data.c3DisplayConfiguration.allColumns.push(
          new Array<string|DateTime>('x_' + endpointSeriesId)
              .concat(endpointSeries.xValues));
      this.data.c3DisplayConfiguration.allColumns.push(
          new Array<string|number>(endpointSeriesId)
              .concat(endpointSeries.yValues));
      this.data.c3DisplayConfiguration.columnMap[endpointSeriesId] =
          'x_' + endpointSeriesId;
      this.types[endpointSeriesId] = 'scatter';
      this.colorsMap[endpointSeriesId] = Color.rgb(0, 0, 0);
    }

    this.yAxisConfig.tick = {
      // We add padding to our y-axis tick labels so that all y-axes of the
      // charts rendered on the page can be aligned.
      // We use an empty string placeholder for each label, so that the axis
      // does not get shifted over.
      format: d => {
        return this.data.yAxisMap.get(d);
      },
      values: Array.from(this.data.yAxisMap.keys()),
    };
  }

  adjustDataDependent() {
    // Check if there are any data points in the time range.
    this.dataPointsInDateRange =
        this.data.dataPointsInRange(this.xAxis.dateRange);
    if (this.dataPointsInDateRange) {
      this.chartConfiguration.grid.y = {show: true};
    }
  }
}
