// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, forwardRef} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import * as Color from 'color';
import {DateTime} from 'luxon';
import {MicrobioGraphData} from 'src/app/graphdatatypes/microbiographdata';
import {getDataColors} from 'src/app/theme/bch_colors';

import {StepGraphData} from '../../graphdatatypes/stepgraphdata';
import {GraphComponent} from '../graph/graph.component';

@Component({
  selector: 'app-stepgraph',
  templateUrl: '../graph/graph.component.html',
  // TODO(b/117575935): These styles need to be extracted and generalized
  styleUrls: ['../graph.css'],
  providers: [
    {provide: GraphComponent, useExisting: forwardRef(() => StepGraphComponent)}
  ]
})

export class StepGraphComponent extends
    GraphComponent<StepGraphData|MicrobioGraphData> {
  types: {[key: string]: string} = {};
  constructor(readonly sanitizer: DomSanitizer) {
    super(sanitizer);
  }

  /**
   * @override
   */
  generateChart() {
    this.adjustYAxisConfig();
    this.generateBasicChart();
    this.adjustDataDependent();

    if (!this.noDataPointsInDateRange) {
      this.chartConfiguration.grid.y = {show: true};
    }
  }

  /**
   * Adjusts the y-axis configuration for the chart.
   */
  adjustYAxisConfig() {
    // Give labels to each series and make a map of
    // x-values to y-values.
    // Populate the stepgraphcard with data according to c3 format.
    for (const series of this.data.series) {
      const label = series.label;
      if (series.concept) {
        this.colorsMap[label] = series.concept.fill;
      } else {
        this.colorsMap[label] = getDataColors()[0];
      }
    }
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

    // The y-axis configuration for this chart maps each tick on the y-axis,
    // initially numbers, to discrete labels representing each Medication's
    // label, and sets the tick values to be those labels.
    const yValues = Array.from(this.data.yAxisMap.keys());
    // We need a slightly larger padding for step charts to be aligned with all
    // other charts.
    const stepGraphYAxisTickMax = 15;
    this.yAxisTickDisplayValues =
        yValues.map(value => this.data.yAxisMap.get(value));
    if (this.data.yAxisMap.size === 0) {
      this.data.yAxisMap.set(10, '');
    }

    this.yAxisConfig = {
      // We add the min and max so that when series are hidden by being clicked
      // on, the y axis does not change and the hidden medications' tick marks
      // still appear
      min: 10,
      max: yValues.sort()[yValues.length - 1],
      padding: {top: 20, bottom: 20},
      tick: {
        // We add padding to our y-axis tick labels so that all y-axes of the
        // charts rendered on the page can be aligned.
        // We use an empty string placeholder for each label, so that the axis
        // does not get shifted over.
        format: d => {
          return ''.trim().padStart(stepGraphYAxisTickMax, '\xa0');
        },
        values: Array.from(this.data.yAxisMap.keys()),
      },
    };
  }

  /**
   * Adjusts the data-dependent fields of the chart's configuration.
   */
  adjustDataDependent() {
    // Check if there are any data points in the time range.
    this.noDataPointsInDateRange =
        !GraphComponent.dataPointsInRange(
            this.data.series, this.xAxis.dateRange) &&
        !GraphComponent.dataPointsInRange(
            this.data.endpointSeries, this.xAxis.dateRange);

    // Don't draw lines between endpoints.
    this.chartConfiguration.data.types = this.types;
  }
}
